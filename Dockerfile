FROM python:3.12-slim

WORKDIR /app

RUN rm -rf dist build .next || true

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY config.py .
COPY services/ ./services/

COPY frontend/ ./frontend/

COPY yolov8s-doclaynet.pt ./yolov8s-doclaynet.pt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
