from services.parser import parse_pdf
from services.chroma import ChromaDBClient
import os
import tempfile

from typing import Optional
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

frontend_dist = Path(__file__).parent / "frontend" / "dist"
app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = ChromaDBClient(path="./data", collection_name="notes")

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "Файл не является PDF"}

    pdf_bytes = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        text = parse_pdf(tmp_path)

        if not text.strip():
            return {"error": "PDF без текста"}

        metadata = {"source": file.filename}
        await client.add_document_chunks(doc_id_prefix=file.filename, text=text, metadata=metadata)

        return {"status": "ok", "chunks_added": True}
    finally:
        os.remove(tmp_path)

@app.get("/query")
async def query_pdf(
    q: str = Query(..., description="Query text"),
    n_results: int = Query(3, description="Number of results")
):
    results = client.query(query_text=q, n_results=n_results)

    response = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        response.append({
            "text": doc,
            "metadata": meta,
            "distance": dist
        })

    return JSONResponse(content={"query": q, "results": response})

@app.get("/all-docs")
async def get_all_docs():
    all_docs = client.get_all()
    return JSONResponse(content=all_docs)

@app.delete("/delete-doc")
async def delete_doc(doc_id: str = Query(..., description="Document ID to delete")):
    client.delete(doc_id)
    return {"status": "ok", "deleted_doc_id": doc_id}

@app.post("/clear-collection")
async def clear_collection():
    client.clear()
    return {"status": "ok", "collection_cleared": client.collection_name}

@app.post("/rewrite-metadatas")
async def rewrite_metadatas(
    limit: Optional[int] = Query(None, description="Limit number of documents to update"),
    start_index: int = Query(0, description="Start index for updating documents")
):
    updated_count = client.rewrite_chunk_metadatas(limit=limit, start_index=start_index)
    return {"status": "ok", "documents_updated": updated_count}

@app.get("/query-llm")
async def query_with_llm(
    q: str = Query(..., description="Query text"),
    n_results: int = Query(3, description="Number of results")
):
    results = client.query_with_llm(query_text=q, n_results=n_results)

    response = {
        "answer": results["answer"],
        "source_nodes": [
            {
                "id": node.node_id,
                "text": node.text,
                "metadata": node.metadata
            }
            for node in results["source_nodes"]
        ],
        "ids": results["ids"],
        "documents": results["documents"]
    }

    return JSONResponse(content=response)
