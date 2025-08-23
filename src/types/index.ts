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
  uploadedAt: string; // ISO date string
}

export interface DocumentMetadata {
  filename: string;
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

// Text chunking and embedding types
export interface TextChunk {
  id: string;
  documentId: string;
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

export interface EmbeddedChunk extends TextChunk {
  embedding: number[];
  embeddingTimestamp: string;
}

export interface EmbeddingProgress {
  current: number;
  total: number;
  chunkId: string;
  percentage: number;
}

export interface SearchResult {
  chunk: EmbeddedChunk;
  similarity: number;
  rank: number;
}

// Summarization types
export interface ChunkFacts {
  chunkId: string;
  chunkIndex: number;
  facts: Partial<ExtractedFacts>;
  parseSuccess: boolean;
  rawResponse: string;
  error?: string;
}

export interface SummarizationResult {
  document: Document;
  chunkFacts: ChunkFacts[];
  mergedFacts: ExtractedFacts;
  markdownSummary: string;
  rawSummary?: string; // Summary without style guide applied
  styledSummary?: string; // Summary with style guide applied
  processingStats: {
    totalChunks: number;
    successfulChunks: number;
    failedChunks: number;
    processingTime: number;
  };
}

// Style guide and preferences
export interface StyleGuide {
  instructions_md: string;
  tone_settings: ToneSettings;
  keywords: string[];
  example_phrases: ExamplePhrases;
  source_content?: string[]; // Array of all newsletter/content samples used to build this guide
}

export interface ExamplePhrases {
  preferred_openings: string[];
  preferred_transitions: string[];
  preferred_conclusions: string[];
  avoid_phrases: string[];
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

// A/B Testing types
export interface ABSummaryPair {
  id: string;
  documentId: string;
  documentTitle: string;
  summaryA: SummarizationResult;
  summaryB: SummarizationResult;
  variantDetails: {
    variantA: SummaryVariant;
    variantB: SummaryVariant;
  };
  createdAt: string;
  userFeedback?: UserPreference;
}

export interface SummaryVariant {
  name: string;
  description: string;
  styleModifications: Partial<StyleGuide>;
  promptStrategy: string;
}

// Model options for Ollama
export interface ModelOption {
  id: string;
  name: string;
  description: string;
  size: string;
  expectedSpeed: string;
  ramUsage: string;
  recommended: boolean;
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
  sources?: SearchResult[];
}

export interface ChatContext {
  messages: ChatMessage[];
  documentIds?: string[];
  activeDocument?: Document | null;
  maxContextLength?: number;
  // Summary context for referencing generated summaries
  selectedDocumentSummary?: string;
  availableSummaries?: ABSummaryPair[];
}

export interface ChatResponse {
  message: ChatMessage;
  sources: SearchResult[];
  hasGrounding: boolean;
  responseMetrics: {
    retrievalCount: number;
    topSimilarity: number;
    responseLength: number;
    processingTime: number;
  };
}

// Log types for developer console
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  details?: Record<string, unknown>;
}
