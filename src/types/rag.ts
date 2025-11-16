export interface ChromaDocument {
  id: string;
  text: string;
  metadata: {
    source?: string;
    chunk_index?: number;
    [key: string]: any;
  };
  distance?: number;
}

export interface Document {
  doc_id: string;
  text: string;
  metadata: {
    source?: string;
    chunk_index?: number;
    [key: string]: any;
  };
}

export interface QueryResult {
  text: string;
  metadata: {
    source?: string;
    chunk_index?: number;
    [key: string]: any;
  };
  distance: number;
}

export interface SourceNode {
  id: string;
  text: string;
  metadata: {
    source?: string;
    chunk_index?: number;
    [key: string]: any;
  };
}

export interface QueryResponse {
  query: string;
  results: QueryResult[];
}

export interface LLMQueryResponse {
  query?: string;
  answer: string;
  source_nodes: SourceNode[];
  ids: string[];
  documents: string[];
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
