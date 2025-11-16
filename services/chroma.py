from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import TextNode

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

import chromadb
from typing import List, Optional, Dict, Callable
import asyncio
from config import OPENAI_API_KEY


class ChromaDBClient:
    def __init__(
        self,
        path: str = "./chromadb_data",
        collection_name: str = "default",
        openai_model: str = "text-embedding-3-small",
        chunk_size: int = 150,
        max_context_tokens: int = 1000,
    ):
        self.chroma_client = chromadb.PersistentClient(path=path)
        self.collection_name = collection_name
        
        self.chroma_collection = self.chroma_client.get_or_create_collection(
            name=collection_name
        )
        
        Settings.embed_model = OpenAIEmbedding(
            model=openai_model,
            api_key=OPENAI_API_KEY
        )
        
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        self.index = VectorStoreIndex.from_vector_store(
            self.vector_store,
            storage_context=self.storage_context
        )
        
        self.text_splitter = SentenceSplitter(
            chunk_size=chunk_size * 5,
            chunk_overlap=20
        )
        
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=60,
            openai_api_key=OPENAI_API_KEY
        )
        
        self.summary_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert at creating concise, informative summaries."),
            ("user", """{context}
Generate a short and informative summary of the following text suitable for metadata. 
The summary should be no more than 20 words and clearly reflect the main content and meaning of the passage.

Text: {text}

Summary:""")
        ])
        
        self.summary_chain = self.summary_prompt | self.llm
        
        self.memory = {
           "context": "",
           "history": []
            }
        
        self.chunk_size = chunk_size
        self.max_context_tokens = max_context_tokens

    def _chunk_text(self, text: str) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), self.chunk_size):
            chunk = " ".join(words[i:i + self.chunk_size])
            chunks.append(chunk)
        return chunks
    
    async def _generate_summary(self, text: str, prev_summaries: List[str] = None) -> str:
        context = ""
        if prev_summaries:
            recent = prev_summaries[-5:] 
            context = "Previous chunk summaries:\n- " + "\n- ".join(recent) + "\n\n"
        
        response = self.summary_chain.invoke({
            "context": context,
            "text": text
        })
        
        return response.content.strip()
    
    async def add_document_chunks(
        self, 
        doc_id_prefix: str, 
        text: str, 
        metadata: Optional[Dict] = None,
        generate_summaries: bool = True
    ):
        chunks = self._chunk_text(text)
        prev_summaries = []
        nodes = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id_prefix}_chunk_{i+1}"
            chunk_metadata = metadata.copy() if metadata else {}
            chunk_metadata["chunk_index"] = i + 1
            chunk_metadata["total_chunks"] = len(chunks)
            chunk_metadata["doc_id_prefix"] = doc_id_prefix
            
            if generate_summaries:
                summary = await self._generate_summary(chunk, prev_summaries)
                chunk_metadata["summary"] = summary
                prev_summaries.append(summary)
            
            node = TextNode(
                text=chunk,
                id_=chunk_id,
                metadata=chunk_metadata
            )
            nodes.append(node)
        
        self.index.insert_nodes(nodes)

    def add_document(self, doc_id: str, text: str, metadata: Optional[Dict] = None):
        node = TextNode(
            text=text,
            id_=doc_id,
            metadata=metadata or {}
        )
        self.index.insert_nodes([node])
    
    def query(self, query_text: str, n_results: int = 3):
        retriever = self.index.as_retriever(similarity_top_k=n_results)
        nodes = retriever.retrieve(query_text)
        
        results = {
            "ids": [[node.node_id for node in nodes]],
            "documents": [[node.text for node in nodes]],
            "metadatas": [[node.metadata for node in nodes]],
            "distances": [[node.score for node in nodes]]
        }
        return results
    
    def query_with_llm(self, query_text: str, n_results: int = 3):
        retriever = self.index.as_retriever(similarity_top_k=n_results)
        nodes = retriever.retrieve(query_text)
        
        context = "\n\n".join([
            f"Document {i+1}:\n{node.text}" 
            for i, node in enumerate(nodes)
        ])
        
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Answer the question based on the provided context."),
            ("user", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:")
        ])
        
        qa_chain = qa_prompt | self.llm
        response = qa_chain.invoke({
            "context": context,
            "question": query_text
        })
        
        return {
            "answer": response.content,
            "source_nodes": nodes,
            "ids": [node.node_id for node in nodes],
            "documents": [node.text for node in nodes]
        }

    def get_all(self):
        return self.chroma_collection.get()

    def delete(self, doc_id: str):
        self.index.delete_ref_doc(doc_id, delete_from_docstore=True)

    def clear(self):
        self.chroma_client.delete_collection(self.collection_name)
        self.chroma_collection = self.chroma_client.get_or_create_collection(
            name=self.collection_name
        )
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        self.index = VectorStoreIndex.from_vector_store(
            self.vector_store,
            storage_context=self.storage_context
        )

    def rewrite_chunk_metadatas(
        self,
        limit: Optional[int] = None,
        start_index: int = 0,
        filter_fn: Optional[Callable[[str, Dict], bool]] = None
    ):
        all_docs = self.chroma_collection.get()
        prev_summaries = []

        docs = list(zip(all_docs["ids"], all_docs["documents"], all_docs["metadatas"]))
        
        if filter_fn:
            docs = [doc for doc in docs if filter_fn(doc[0], doc[2])]

        if limit:
            docs = docs[start_index:start_index + limit]
        else:
            docs = docs[start_index:]

        for doc_id, text, old_metadata in docs:
            summary = self._generate_summary(text, prev_summaries)

            new_metadata = old_metadata.copy() if old_metadata else {}
            new_metadata["summary"] = summary
            
            self.chroma_collection.update(ids=[doc_id], metadatas=[new_metadata])
            prev_summaries.append(summary)
        
        return len(docs)
