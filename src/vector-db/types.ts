/**
 * Type definitions for Vector Database
 * 
 * These types define the interfaces that our TDD tests expect.
 * They serve as the contract between tests and implementation.
 */

/**
 * Metadata associated with a document chunk embedding
 */
export interface EmbeddingMetadata {
  /** The actual text content of the chunk */
  chunkText: string;

  /** Index of this chunk within the document */
  chunkIndex: number;

  /** Title of the source document */
  documentTitle: string;

  /** File path of the source document */
  documentPath?: string;

  /** Additional metadata fields */
  [key: string]: any;
}

/**
 * A document embedding stored in the vector database
 */
export interface DocumentEmbedding {
  /** Unique identifier for this embedding */
  id: string;

  /** ID of the source document */
  documentId: string;

  /** ID of the specific chunk within the document */
  chunkId: string;

  /** The embedding vector (typically 384 dimensions for sentence-transformers) */
  vector: number[];

  /** Metadata about the chunk and document */
  metadata: EmbeddingMetadata;

  /** Timestamp when the embedding was created */
  createdAt?: Date;

  /** Timestamp when the embedding was last updated */
  updatedAt?: Date;
}

/**
 * Configuration options for the vector database
 */
export interface VectorDatabaseConfig {
  /** Path to the SQLite database file */
  path?: string;

  /** Dimension of the embedding vectors */
  vectorDimension?: number;

  /** HNSW index parameters */
  indexParams?: {
    /** Number of connections for each node (default: 16) */
    M?: number;

    /** Size of the dynamic candidate list (default: 200) */
    efConstruction?: number;

    /** Size of the search candidate list (default: 100) */
    ef?: number;
  };

  /** Database performance settings */
  performance?: {
    /** Busy timeout in milliseconds */
    busyTimeout?: number;

    /** Journal mode (WAL recommended for performance) */
    journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';

    /** Synchronous mode */
    synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';

    /** Cache size in KB */
    cacheSize?: number;
  };
}

/**
 * Search result from vector similarity search
 */
export interface VectorSearchResult {
  /** The embedding that matched */
  embedding: DocumentEmbedding;

  /** Similarity score (0-1, higher is more similar) */
  similarity: number;

  /** Distance score (lower is more similar) */
  distance: number;
}

/**
 * Simplified search result for basic search operations
 */
export interface SearchResult {
  /** ID of the matching embedding */
  id: string;

  /** Similarity score (0-1, higher is more similar) */
  similarity: number;

  /** Distance score (lower is more similar) */
  distance?: number;

  /** Document ID this embedding belongs to */
  documentId?: string;

  /** Metadata about the match */
  metadata?: any;
}

/**
 * Options for vector similarity search
 */
export interface VectorSearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum similarity threshold (0-1) */
  threshold?: number;

  /** Distance metric to use for similarity calculation */
  distanceMetric?: 'cosine' | 'euclidean' | 'dot_product';

  /** Filter by document IDs */
  documentIds?: string[];

  /** Filter by metadata fields */
  metadataFilter?: Record<string, any>;

  /** HNSW search parameters */
  searchParams?: {
    /** Size of the search candidate list */
    ef?: number;
  };
}

/**
 * Statistics about the vector database
 */
export interface VectorDatabaseStats {
  /** Total number of embeddings stored */
  totalEmbeddings: number;

  /** Number of unique documents */
  totalDocuments: number;

  /** Database file size in bytes */
  databaseSize: number;

  /** Index size in bytes */
  indexSize: number;

  /** Average vector dimension */
  vectorDimension: number;

  /** Index build status */
  indexStatus: 'not_built' | 'building' | 'ready' | 'error';

  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /** Number of successful operations */
  successful: number;

  /** Number of failed operations */
  failed: number;

  /** Error details for failed operations */
  errors: Array<{
    index: number;
    error: string;
  }>;

  /** Total time taken in milliseconds */
  duration: number;
}

/**
 * Database migration information
 */
export interface MigrationInfo {
  /** Current database schema version */
  currentVersion: number;

  /** Target schema version */
  targetVersion: number;

  /** Whether migration is needed */
  migrationNeeded: boolean;

  /** List of migrations to apply */
  pendingMigrations: string[];
}

/**
 * Vector database interface
 * This defines the contract that our implementation must fulfill
 */
export interface IVectorDatabase {
  // Lifecycle methods
  initialize(): Promise<void>;
  close(): Promise<void>;
  isInitialized(): boolean;

  // Vector extension support
  hasVectorSupport(): boolean;
  getLoadedExtensions(): Promise<string[]>;
  supportsVectorOperations(): Promise<boolean>;
  supportsHNSWIndex(): Promise<boolean>;

  // Configuration
  getDatabasePath(): string;
  getJournalMode(): Promise<string>;
  getBusyTimeout(): Promise<number>;

  // Embedding operations
  insertEmbedding(embedding: DocumentEmbedding): Promise<void>;
  insertEmbeddings(embeddings: DocumentEmbedding[]): Promise<BatchOperationResult>;
  getEmbeddingById(id: string): Promise<DocumentEmbedding | null>;
  getEmbeddingsByDocumentId(documentId: string): Promise<DocumentEmbedding[]>;
  getAllEmbeddings(): Promise<DocumentEmbedding[]>;
  updateEmbedding(embedding: DocumentEmbedding): Promise<void>;
  deleteEmbedding(id: string): Promise<void>;
  deleteEmbeddingsByDocumentId(documentId: string): Promise<void>;
  clearAllEmbeddings(): Promise<void>;

  // Search operations
  searchSimilar(queryVector: number[], options?: VectorSearchOptions): Promise<SearchResult[]>;

  // Index management
  buildIndex(progressCallback?: (progress: number) => void): Promise<void>;
  rebuildIndex(): Promise<void>;
  getIndexStatus(): Promise<string>;

  // Statistics and maintenance
  getStats(): Promise<VectorDatabaseStats>;
  vacuum(): Promise<void>;
  analyze(): Promise<void>;

  // Advanced operations
  forceClose(): Promise<void>;
  backup(path: string): Promise<void>;
  restore(path: string): Promise<void>;
}
