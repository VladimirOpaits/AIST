import { Document, QueryResponse } from '@/types/rag';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ragApi = {
  // Upload PDF document
  uploadPdf: async (file: File, onProgress?: (progress: number) => void): Promise<{ doc_id: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('POST', `${API_BASE_URL}/upload-pdf`);
      xhr.send(formData);
    });
  },

  // Get document by ID
  getDocument: async (docId: string): Promise<Document> => {
    const response = await fetch(`${API_BASE_URL}/get-document?doc_id=${docId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    return response.json();
  },

  // Get all documents
  getAllDocuments: async (): Promise<Document[]> => {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    return response.json();
  },

  // Query using vector search
  query: async (query: string): Promise<QueryResponse> => {
    const response = await fetch(`${API_BASE_URL}/query?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }
    return response.json();
  },

  // Query using LLM
  queryLlm: async (query: string): Promise<QueryResponse> => {
    const response = await fetch(`${API_BASE_URL}/query-llm?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`LLM Query failed: ${response.statusText}`);
    }
    return response.json();
  },

  // Delete document
  deleteDocument: async (docId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/delete-document?doc_id=${docId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  },
};
