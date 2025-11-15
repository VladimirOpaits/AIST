from services.parser import parse_pdf
from services.chroma import ChromaDBClient
import os
import tempfile

from fastapi import FastAPI, UploadFile, File, Query
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI()
client = ChromaDBClient(path="./data", collection_name="notes")

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
        client.add_document_chunks(doc_id_prefix=file.filename, text=text, metadata=metadata)

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