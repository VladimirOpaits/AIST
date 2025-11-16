import { Document, QueryResponse, LLMQueryResponse } from '@/types/rag';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ragApi = {
  // Upload PDF document
  uploadPdf: async (file: File, onProgress?: (progress: number) => void): Promise<{ status: string; chunks_added: boolean }> => {
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

  // Get all documents
  getAllDocuments: async (): Promise<Document[]> => {
    const response = await fetch(`${API_BASE_URL}/all-docs`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Convert ChromaDB format to our Document format
    const documents: Document[] = [];
    if (data.ids && data.documents && data.metadatas) {
      for (let i = 0; i < data.ids[0].length; i++) {
        documents.push({
          doc_id: data.ids[0][i],
          text: data.documents[0][i],
          metadata: data.metadatas[0][i] || {}
        });
      }
    }
    return documents;
  },

  // Query using vector search
  query: async (query: string, nResults: number = 3): Promise<QueryResponse> => {
    const response = await fetch(`${API_BASE_URL}/query?q=${encodeURIComponent(query)}&n_results=${nResults}`);
    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }
    return response.json();
  },

  // Query using LLM
  queryLlm: async (query: string, nResults: number = 3): Promise<LLMQueryResponse> => {
    const response = await fetch(`${API_BASE_URL}/query-llm?q=${encodeURIComponent(query)}&n_results=${nResults}`);
    if (!response.ok) {
      throw new Error(`LLM Query failed: ${response.statusText}`);
    }
    return response.json();
  },

  // Delete document
  deleteDocument: async (docId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/delete-doc?doc_id=${docId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  },

  // Clear collection
  clearCollection: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/clear-collection`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Clear collection failed: ${response.statusText}`);
    }
  },
};
