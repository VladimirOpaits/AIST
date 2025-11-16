export interface DocumentMetadata {
  file_name: string;
  file_size?: number;
  upload_date?: string;
  chunk_count?: number;
  processing_status?: 'pending' | 'processing' | 'completed' | 'error';
}

export interface Chunk {
  chunk_id: string;
  text: string;
  summary?: string;
  metadata: {
    page?: number;
    section?: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface Document {
  doc_id: string;
  metadata: DocumentMetadata;
  chunks: Chunk[];
}

export interface SourceNode {
  chunk_id: string;
  text: string;
  summary?: string;
  score: number;
  metadata: {
    page?: number;
    section?: string;
    [key: string]: any;
  };
}

export interface QueryResponse {
  answer: string;
  source_nodes: SourceNode[];
  query: string;
  timestamp?: string;
}

export interface QueryHistory {
  id: string;
  query: string;
  answer: string;
  timestamp: string;
  source_count: number;
}

export interface UploadProgress {
  file_name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}
