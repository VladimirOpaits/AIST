import chromadb
from chromadb.utils import embedding_functions
from config import OPENAI_API_KEY
from services.aicomment import AIChat
from typing import List, Optional, Callable, Dict

class ChromaDBClient:
    def __init__(
        self,
        path: str = "./chromadb_data",
        collection_name: str = "default",
        openai_model: str = "text-embedding-3-small",
        chunk_size: int = 150,
        max_context_tokens: int = 1000,
    ):
    
        self.client = chromadb.PersistentClient(path=path)
        self.collection_name = collection_name

        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": "ChromaDB collection with OpenAI embeddings"},
        )

        self.embedder = embedding_functions.OpenAIEmbeddingFunction(
            api_key=OPENAI_API_KEY,
            model_name=openai_model,
        )

        self.chunk_size = chunk_size
        self.llm = AIChat(OPENAI_API_KEY, max_context_tokens=max_context_tokens)

    def _chunk_text(self, text: str) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), self.chunk_size):
            chunk = " ".join(words[i:i + self.chunk_size])
            chunks.append(chunk)
        return chunks
    
    def add_document_chunks(
        self, 
        doc_id_prefix: str, 
        text: str, 
        metadata: Optional[Dict] = None,
        generate_summaries: bool = True
    ):
        
        chunks = self._chunk_text(text)
        prev_summaries = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id_prefix}_chunk_{i+1}"
            chunk_metadata = metadata.copy() if metadata else {}
            chunk_metadata["chunk_index"] = i + 1
            chunk_metadata["total_chunks"] = len(chunks)
            
            if generate_summaries:
                summary = self.llm.chunk_metadata(chunk, prev_summaries)
                chunk_metadata["summary"] = summary
                prev_summaries.append(summary)
            
            self.add_document(doc_id=chunk_id, text=chunk, metadata=chunk_metadata)

    def add_document(self, doc_id: str, text: str, metadata: Optional[Dict] = None):
        self.collection.add(
            ids=[doc_id],
            documents=[text],
            metadatas=[metadata or {}],
        )
        
    def query(self, query_text: str, n_results: int = 3):
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
        )
        return results

    def get_all(self):
        return self.collection.get()

    def delete(self, doc_id: str):
        self.collection.delete(ids=[doc_id])

    def clear(self):
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.get_or_create_collection(self.collection_name)

    def rewrite_chunk_metadatas(
        self,
        limit: Optional[int] = None,
        start_index: int = 0,
        filter_fn: Optional[Callable[[str, Dict], bool]] = None
    ):
        all_docs = self.collection.get()
        prev_summaries = []

        docs = list(zip(all_docs["ids"], all_docs["documents"], all_docs["metadatas"]))
        
        if filter_fn:
            docs = [doc for doc in docs if filter_fn(doc[0], doc[2])]

        if limit:
            docs = docs[start_index:start_index + limit]
        else:
            docs = docs[start_index:]

        for doc_id, text, old_metadata in docs:
            summary = self.llm.chunk_metadata(text, prev_summaries)

            new_metadata = old_metadata.copy() if old_metadata else {}
            new_metadata["summary"] = summary
            self.collection.update(ids=[doc_id], metadatas=[new_metadata])

            prev_summaries.append(summary)
        
        return len(docs)  