/**
 * Type definitions for the Transcript Summarizer application
 */

// Document types
export interface Document {
  id: string;
  filename: string;
  title: string;
  tags: string[];
  text: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  dateAdded: string;
  fileSize: number;
  fileType: string;
  wordCount?: number;
}

// Facts schema as defined in PRD
export interface ExtractedFacts {
  class_title?: string;
  date_or_series?: string;
  audience?: string;
  learning_objectives: string[];
  key_takeaways: string[];
  topics: string[];
  techniques: string[];
  action_items?: string[];
  notable_quotes?: string[];
  open_questions?: string[];
  timestamp_refs?: string[];
}

// Agent/Indexing types
export interface IndexedParagraph {
  id: string;
  documentId: string;
  text: string;
  embedding?: number[];
}

export interface RetrievalResult {
  paragraph: IndexedParagraph;
  similarity: number;
}

// Style guide and preferences
export interface StyleGuide {
  instructions_md: string;
  tone_settings: ToneSettings;
  keywords: string[];
}

export interface ToneSettings {
  formality: number; // 0-100
  enthusiasm: number; // 0-100
  technicality: number; // 0-100
}

export interface UserPreference {
  id: string;
  document_id: string;
  candidateA: string;
  candidateB: string;
  winner: 'A' | 'B';
  reason?: string;
  created_at: string;
}

// Application settings
export interface AppSettings {
  default_model: string;
  chat_default: string;
  theme: 'light' | 'dark';
  developer_mode: boolean;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: RetrievalResult[];
}

// Log types for developer console
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  details?: any;
}
