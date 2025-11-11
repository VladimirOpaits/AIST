from services.parser import parse_pdf
import os

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse

app = FastAPI()

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "Файл не является PDF"}

    pdf_bytes = await file.read()

    with open(f"uploaded_{file.filename}", "wb") as f:
        f.write(pdf_bytes)

    text = parse_pdf(f"uploaded_{file.filename}")

    return {"text": text}