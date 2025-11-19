from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import TextNode

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

import chromadb
from typing import List, Optional, Dict, Callable
import re
import logging
import asyncio
from config import OPENAI_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChromaDBClient:
    def __init__(
        self,
        path: str = "./chromadb_data",
        collection_name: str = "default",
        openai_model: str = "text-embedding-3-small",
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        max_tokens: int = 512,
        temperature: float = 0.3,
        max_concurrent_requests: int = 10,  
    ):
        logger.info(f"Initializing ChromaDBClient with collection: {collection_name}")
        
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
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            paragraph_separator="\n\n",
            secondary_chunking_regex="[^,.;。？！]+[,.;。？！]?"
        )
        
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=temperature,
            max_tokens=max_tokens,
            openai_api_key=OPENAI_API_KEY
        )
        
        self.summary_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at creating concise summaries of mathematical and technical content.
Preserve key formulas, theorems, and technical terms in your summaries."""),
            ("user", """{context}

Generate a concise summary (max 30 words) of the following text.
For mathematical content, include key concepts and formulas.

Text: {text}

Summary:""")
        ])
        
        self.summary_chain = self.summary_prompt | self.llm
        
        self.semaphore = asyncio.Semaphore(max_concurrent_requests)
        
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def _is_math_block(self, text: str) -> bool:
        latex_patterns = [r'\$\$.*?\$\$', r'\$.*?\$', r'\\[a-zA-Z]+', r'\\frac', r'\\int', r'\\sum']
        for pattern in latex_patterns:
            if re.search(pattern, text):
                return True
        
        math_chars = ['∑', '∫', '∂', '∇', '√', '≠', '≤', '≥', '∈', '⊂', '∞']
        return any(char in text for char in math_chars)

    def _smart_chunk_text(self, text: str) -> List[str]:
        math_blocks = []
        pattern = r'\$\$[\s\S]*?\$\$|\$[^\$]+?\$'
        
        def replace_math(match):
            idx = len(math_blocks)
            math_blocks.append(match.group(0))
            return f"__MATH_BLOCK_{idx}__"
        
        protected_text = re.sub(pattern, replace_math, text)
        
        chunks = self.text_splitter.split_text(protected_text)
        
        restored_chunks = []
        for chunk in chunks:
            for idx, math_block in enumerate(math_blocks):
                chunk = chunk.replace(f"__MATH_BLOCK_{idx}__", math_block)
            restored_chunks.append(chunk)
        
        return restored_chunks

    async def _generate_summary_async(self, text: str, prev_summaries: List[str] = None) -> str:
        async with self.semaphore: 
            try:
                context = ""
                if prev_summaries:
                    recent = prev_summaries[-3:]
                    context = "Previous sections:\n- " + "\n- ".join(recent) + "\n\n"
                
                response = await self.summary_chain.ainvoke({
                    "context": context,
                    "text": text[:2000]
                })
                
                summary = response.content.strip()
                logger.debug(f"Generated summary: {summary[:50]}...")
                return summary
                
            except Exception as e:
                logger.error(f"Summary generation failed: {e}")
                words = text.split()[:30]
                return " ".join(words) + "..."

    async def add_document_chunks_async(
        self, 
        doc_id_prefix: str, 
        text: str, 
        metadata: Optional[Dict] = None,
        generate_summaries: bool = True
    ) -> int:
        try:
            logger.info(f"Adding document with prefix: {doc_id_prefix}")
            
            chunks = self._smart_chunk_text(text)
            logger.info(f"Split into {len(chunks)} chunks")
            
            nodes = []
            
            if generate_summaries:
                logger.info(f"Generating {len(chunks)} summaries in parallel...")
                
                summary_tasks = []
                prev_summaries = []
                
                for i, chunk in enumerate(chunks):
                    task = self._generate_summary_async(chunk, prev_summaries.copy())
                    summary_tasks.append(task)

                summaries = await asyncio.gather(*summary_tasks)
                logger.info(f"Generated {len(summaries)} summaries")
            else:
                summaries = [None] * len(chunks)
            
            for i, (chunk, summary) in enumerate(zip(chunks, summaries)):
                chunk_id = f"{doc_id_prefix}_chunk_{i+1}"
                
                chunk_metadata = metadata.copy() if metadata else {}
                chunk_metadata.update({
                    "chunk_index": i + 1,
                    "total_chunks": len(chunks),
                    "doc_id_prefix": doc_id_prefix,
                    "has_math": self._is_math_block(chunk),
                    "chunk_length": len(chunk)
                })
                
                if summary:
                    chunk_metadata["summary"] = summary
                
                node = TextNode(
                    text=chunk,
                    id_=chunk_id,
                    metadata=chunk_metadata
                )
                nodes.append(node)
            
            self.index.insert_nodes(nodes)
            logger.info(f"Successfully added {len(nodes)} nodes")
            
            return len(nodes)
            
        except Exception as e:
            logger.error(f"Failed to add document chunks: {e}")
            raise

    async def add_document_chunks_sequential(
        self, 
        doc_id_prefix: str, 
        text: str, 
        metadata: Optional[Dict] = None,
        generate_summaries: bool = True
    ) -> int:
        try:
            logger.info(f"Adding document with prefix: {doc_id_prefix} (sequential)")
            
            chunks = self._smart_chunk_text(text)
            logger.info(f"Split into {len(chunks)} chunks")
            
            prev_summaries = []
            nodes = []
            
            # Последовательная генерация с контекстом
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc_id_prefix}_chunk_{i+1}"
                
                chunk_metadata = metadata.copy() if metadata else {}
                chunk_metadata.update({
                    "chunk_index": i + 1,
                    "total_chunks": len(chunks),
                    "doc_id_prefix": doc_id_prefix,
                    "has_math": self._is_math_block(chunk),
                    "chunk_length": len(chunk)
                })
                
                if generate_summaries:
                    summary = await self._generate_summary_async(chunk, prev_summaries)
                    chunk_metadata["summary"] = summary
                    prev_summaries.append(summary)
                
                node = TextNode(
                    text=chunk,
                    id_=chunk_id,
                    metadata=chunk_metadata
                )
                nodes.append(node)
            
            self.index.insert_nodes(nodes)
            logger.info(f"Successfully added {len(nodes)} nodes")
            
            return len(nodes)
            
        except Exception as e:
            logger.error(f"Failed to add document chunks: {e}")
            raise

    def add_document(self, doc_id: str, text: str, metadata: Optional[Dict] = None) -> None:
        try:
            logger.info(f"Adding single document: {doc_id}")
            
            node_metadata = metadata.copy() if metadata else {}
            node_metadata.update({
                "doc_id": doc_id,
                "has_math": self._is_math_block(text),
                "text_length": len(text)
            })
            
            node = TextNode(
                text=text,
                id_=doc_id,
                metadata=node_metadata
            )
            
            self.index.insert_nodes([node])
            logger.info(f"Successfully added document: {doc_id}")
            
        except Exception as e:
            logger.error(f"Failed to add document: {e}")
            raise

    def query(self, query_text: str, n_results: int = 3, filters: Optional[Dict] = None) -> Dict:
        try:
            logger.info(f"Querying: {query_text[:50]}...")
            
            retriever = self.index.as_retriever(
                similarity_top_k=n_results,
                filters=filters
            )
            nodes = retriever.retrieve(query_text)
            
            results = {
                "ids": [[node.node_id for node in nodes]],
                "documents": [[node.text for node in nodes]],
                "metadatas": [[node.metadata for node in nodes]],
                "distances": [[node.score if node.score else 0.0 for node in nodes]]
            }
            
            logger.info(f"Found {len(nodes)} results")
            return results
            
        except Exception as e:
            logger.error(f"Query failed: {e}")
            raise

    async def query_with_llm_async(
        self, 
        query_text: str, 
        n_results: int = 3,
        system_prompt: Optional[str] = None
    ) -> Dict:
        try:
            logger.info(f"Querying with LLM: {query_text[:50]}...")
            
            retriever = self.index.as_retriever(similarity_top_k=n_results)
            nodes = retriever.retrieve(query_text)
            
            if not nodes:
                logger.warning("No relevant documents found")
                return {
                    "answer": "I couldn't find relevant information to answer your question.",
                    "source_nodes": [],
                    "ids": [],
                    "documents": []
                }
            
            context = "\n\n".join([
                f"Document {i+1} (relevance: {node.score:.3f}):\n{node.text}" 
                for i, node in enumerate(nodes)
            ])
            
            default_system = """You are a helpful mathematical assistant. 
Answer questions based on the provided context.
For mathematical expressions, use LaTeX notation with $ or $$ delimiters.
If the context doesn't contain enough information, say so."""
            
            qa_prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt or default_system),
                ("user", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:")
            ])
            
            qa_chain = qa_prompt | self.llm
            
            async with self.semaphore:
                response = await qa_chain.ainvoke({
                    "context": context,
                    "question": query_text
                })
            
            result = {
                "answer": response.content,
                "source_nodes": nodes,
                "ids": [node.node_id for node in nodes],
                "documents": [node.text for node in nodes],
                "scores": [node.score for node in nodes]
            }
            
            logger.info("Generated answer successfully")
            return result
            
        except Exception as e:
            logger.error(f"Query with LLM failed: {e}")
            raise

    def query_with_llm(
        self, 
        query_text: str, 
        n_results: int = 3,
        system_prompt: Optional[str] = None
    ) -> Dict:
        return asyncio.run(self.query_with_llm_async(query_text, n_results, system_prompt))

    def get_all(self) -> Dict:
        try:
            return self.chroma_collection.get()
        except Exception as e:
            logger.error(f"Failed to get all documents: {e}")
            raise

    def delete(self, doc_id: str) -> None:
        try:
            logger.info(f"Deleting document: {doc_id}")
            self.index.delete_ref_doc(doc_id, delete_from_docstore=True)
            logger.info(f"Successfully deleted: {doc_id}")
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            raise

    def delete_by_prefix(self, prefix: str) -> int:
        try:
            logger.info(f"Deleting documents with prefix: {prefix}")
            all_docs = self.get_all()
            
            deleted_count = 0
            for doc_id in all_docs["ids"]:
                if doc_id.startswith(prefix):
                    self.delete(doc_id)
                    deleted_count += 1
            
            logger.info(f"Deleted {deleted_count} documents")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete by prefix: {e}")
            raise

    def clear(self) -> None:
        try:
            logger.warning(f"Clearing collection: {self.collection_name}")
            
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
            
            logger.info("Collection cleared successfully")
            
        except Exception as e:
            logger.error(f"Failed to clear collection: {e}")
            raise

    async def rewrite_chunk_metadatas_async(
        self,
        limit: Optional[int] = None,
        start_index: int = 0,
        filter_fn: Optional[Callable[[str, Dict], bool]] = None,
        batch_size: int = 20  
    ) -> int:
        
        try:
            logger.info("Starting async metadata rewrite")
            
            all_nodes = list(self.index.docstore.docs.values())
            
            if filter_fn:
                all_nodes = [
                    node for node in all_nodes 
                    if filter_fn(node.node_id, node.metadata)
                ]
            
            if limit:
                selected_nodes = all_nodes[start_index:start_index + limit]
            else:
                selected_nodes = all_nodes[start_index:]
            
            logger.info(f"Processing {len(selected_nodes)} documents in batches of {batch_size}")
            
            updated_count = 0
            
            for batch_start in range(0, len(selected_nodes), batch_size):
                batch = selected_nodes[batch_start:batch_start + batch_size]
                
                tasks = [
                    self._generate_summary_async(node.text, [])
                    for node in batch
                ]
                
                summaries = await asyncio.gather(*tasks, return_exceptions=True)
                
                for node, summary in zip(batch, summaries):
                    try:
                        if isinstance(summary, Exception):
                            logger.error(f"Failed to generate summary for {node.node_id}: {summary}")
                            continue
                        
                        node.metadata["summary"] = summary
                        node.metadata["has_math"] = self._is_math_block(node.text)
                        
                        self.chroma_collection.update(
                            ids=[node.node_id],
                            metadatas=[node.metadata]
                        )
                        
                        updated_count += 1
                        
                    except Exception as e:
                        logger.error(f"Failed to update node {node.node_id}: {e}")
                        continue
                
                logger.info(f"Processed batch: {updated_count}/{len(selected_nodes)} documents updated")
            
            logger.info(f"Successfully updated {updated_count} documents")
            return updated_count
            
        except Exception as e:
            logger.error(f"Metadata rewrite failed: {e}")
            raise

    def rewrite_chunk_metadatas(
        self,
        limit: Optional[int] = None,
        start_index: int = 0,
        filter_fn: Optional[Callable[[str, Dict], bool]] = None
    ) -> int:
        return asyncio.run(
            self.rewrite_chunk_metadatas_async(limit, start_index, filter_fn)
        )

    def get_stats(self) -> Dict:
        try:
            all_docs = self.get_all()
            
            total_docs = len(all_docs["ids"])
            math_docs = sum(
                1 for metadata in all_docs.get("metadatas", [])
                if metadata and metadata.get("has_math", False)
            )
            
            prefixes = {}
            for metadata in all_docs.get("metadatas", []):
                if metadata:
                    prefix = metadata.get("doc_id_prefix", "unknown")
                    prefixes[prefix] = prefixes.get(prefix, 0) + 1
            
            stats = {
                "total_documents": total_docs,
                "documents_with_math": math_docs,
                "documents_by_prefix": prefixes,
                "collection_name": self.collection_name
            }
            
            logger.info(f"Stats: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            raise


