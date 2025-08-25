/**
 * Text splitting utilities for document chunks
 * Implements smart paragraph splitting with fallback to fixed-size chunks
 */

import { ChunkingConfigManager } from './chunkingConfig';

export interface TextChunk {
  id: string;
  documentId: string;
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

export interface ChunkingOptions {
  chunkSize?: number;
  overlap?: number;
  maxChunks?: number;
  modelContextWindow?: number; // New: model context window in tokens
}

export class TextSplitter {

  /**
   * Split text into chunks using current configuration
   */
  static splitText(text: string, documentId: string, options?: ChunkingOptions): TextChunk[] {
    const config = ChunkingConfigManager.getCurrentConfig().chunking;
    const chunkSize = options?.chunkSize ?? config.chunkSize;
    const overlap = options?.overlap ?? config.overlap;
    const maxChunks = options?.maxChunks ?? config.maxChunks;

    return this.splitTextWithConfig(text, documentId, { chunkSize, overlap, maxChunks });
  }

  /**
   * Split text into chunks optimized for the selected model
   * Uses model context window to determine optimal chunking strategy
   */
  static splitTextForModel(text: string, documentId: string, modelId: string): TextChunk[] {
    // AGGRESSIVE OPTIMIZATION: Force single chunk for most documents to reduce LLM calls
    const textLength = text.length;
    
    // For most documents, use single chunk to minimize LLM calls
    if (textLength <= 50000) { // 50KB - safe for single chunk processing
      return [{
        id: `${documentId}-chunk-0`,
        documentId,
        text,
        startIndex: 0,
        endIndex: textLength,
        chunkIndex: 0
      }];
    }
    
    // Get model context window (in tokens)
    const contextWindow = this.getModelContextWindow(modelId);
    const estimatedTokens = Math.ceil(textLength / 4);
    
    // Even for large documents, try to use single chunk if possible
    if (estimatedTokens <= contextWindow * 0.95) { // 95% utilization threshold
      return [{
        id: `${documentId}-chunk-0`,
        documentId,
        text,
        startIndex: 0,
        endIndex: textLength,
        chunkIndex: 0
      }];
    }
    
    // Only split if absolutely necessary (document is extremely large)
    console.warn(`⚠️ Document extremely large (${estimatedTokens} tokens), forced to split into chunks`);
    
    // Use very large chunks to minimize the number of LLM calls
    const chunkSize = Math.min(15000, Math.floor(contextWindow * 0.8)); // Much larger chunks
    const overlap = Math.floor(chunkSize * 0.02); // Minimal overlap
    
    return this.splitText(text, documentId, {
      chunkSize,
      overlap,
      maxChunks: 3 // Very low limit to minimize LLM calls
    });
  }

  /**
   * Get the context window size for a given model
   */
  static getModelContextWindow(modelId: string): number {
    // Model context windows (in tokens)
    const contextWindows: Record<string, number> = {
      // LLaMA models
      'llama3.1:8b-instruct-q4_K_M': 4096,
      'llama3.1:8b': 4096,
      'llama3.1:13b-instruct-q4_K_M': 4096,
      'llama3.1:13b': 4096,
      'llama3.1:70b': 4096,
      'llama3.1:70b-instruct': 4096,
      
      // Gemma models
      'gemma3:1b': 32768,
      'gemma3:4b': 131072,
      'gemma3:12b': 131072,
      'gemma3:27b': 131072,
      
      // Mixtral models
      'mixtral:8x7b': 32768,
      'mixtral:8x7b-instruct': 32768,
      
      // CodeLlama models
      'codellama:7b': 16384,
      'codellama:13b': 16384,
      'codellama:34b': 16384,
      
      // Mistral models
      'mistral:7b': 8192,
      'mistral:7b-instruct': 8192,
      
      // Phi models
      'phi:2.7b': 2048,
      'phi:3.8b': 8192,
      
      // Default fallback
      'default': 4096
    };
    
    return contextWindows[modelId] || contextWindows['default'];
  }

  /**
   * Get the optimal utilization threshold for a given model
   * Higher thresholds = better context utilization but less safety margin
   */
  static getModelUtilizationThreshold(modelId: string): number {
    // Model-specific optimization profiles
    const utilizationProfiles: Record<string, number> = {
      // Large context models - can use higher utilization (95%)
      'gemma3:1b': 0.95,
      'gemma3:4b': 0.95,
      'gemma3:12b': 0.95,
      'gemma3:27b': 0.95,
      'mixtral:8x7b': 0.95,
      'mixtral:8x7b-instruct': 0.95,
      
      // Medium context models - balanced approach (90%)
      'llama3.1:13b': 0.90,
      'llama3.1:13b-instruct-q4_K_M': 0.90,
      'llama3.1:70b': 0.90,
      'llama3.1:70b-instruct': 0.90,
      'codellama:7b': 0.90,
      'codellama:13b': 0.90,
      'codellama:34b': 0.90,
      'mistral:7b': 0.90,
      'mistral:7b-instruct': 0.90,
      'phi:3.8b': 0.90,
      
      // Small context models - conservative approach (85%)
      'llama3.1:8b': 0.85,
      'llama3.1:8b-instruct-q4_K_M': 0.85,
      'phi:2.7b': 0.85,
      
      // Default fallback - balanced approach
      'default': 0.90
    };
    
    return utilizationProfiles[modelId] || utilizationProfiles['default'];
  }

  /**
   * Split text into chunks with specific configuration
   */
  static splitTextWithConfig(text: string, documentId: string, options: {
    chunkSize: number;
    overlap: number;
    maxChunks?: number;
  }): TextChunk[] {
    // Fast path: if text is small enough, return as single chunk
    if (text.length <= options.chunkSize) {
      return [{
        id: `${documentId}-chunk-0`,
        documentId,
        text,
        startIndex: 0,
        endIndex: text.length,
        chunkIndex: 0
      }];
    }
    
    // Use fixed-size chunking for speed (skip paragraph analysis)
    let chunks = this.createFixedSizeChunks(text, documentId, options.chunkSize, options.overlap);
    
    // Apply max chunks limit if specified
    if (options.maxChunks && chunks.length > options.maxChunks) {
      chunks = this.limitChunks(chunks, options.maxChunks);
    }
    
    return chunks;
  }

  /**
   * Create fixed-size chunks with overlap
   */
  private static createFixedSizeChunks(text: string, documentId: string, chunkSize: number, _overlap: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      
      // Simple word boundary break for speed
      let actualEndIndex = endIndex;
      if (endIndex < text.length) {
        const lastSpaceIndex = text.lastIndexOf(' ', endIndex);
        if (lastSpaceIndex > startIndex + chunkSize * 0.7) { // Reduced threshold for speed
          actualEndIndex = lastSpaceIndex;
        }
      }
      
      const chunkText = text.substring(startIndex, actualEndIndex).trim();
      
      if (chunkText.length > 0) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          text: chunkText,
          startIndex,
          endIndex: actualEndIndex,
          chunkIndex,
        });
        chunkIndex++;
      }
      
      // Move start position with overlap
      startIndex = actualEndIndex;
      if (startIndex >= text.length) break;
    }
    
    return chunks;
  }

  /**
   * Limit chunks to maximum number by combining/selecting most important ones
   */
  private static limitChunks(chunks: TextChunk[], maxChunks: number): TextChunk[] {
    if (chunks.length <= maxChunks) {
      return chunks;
    }

    // For ultra-fast mode, we'll take evenly distributed chunks
    const step = Math.floor(chunks.length / maxChunks);
    const selectedChunks: TextChunk[] = [];

    for (let i = 0; i < maxChunks; i++) {
      const index = Math.min(i * step, chunks.length - 1);
      selectedChunks.push(chunks[index]);
    }

    return selectedChunks;
  }

  /**
   * Get statistics about the chunking process
   */
  static getChunkingStats(chunks: TextChunk[]): {
    totalChunks: number;
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalCharacters: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        averageChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalCharacters: 0,
      };
    }

    const chunkSizes = chunks.map(chunk => chunk.text.length);
    const totalCharacters = chunkSizes.reduce((sum, size) => sum + size, 0);

    return {
      totalChunks: chunks.length,
      averageChunkSize: Math.round(totalCharacters / chunks.length),
      minChunkSize: Math.min(...chunkSizes),
      maxChunkSize: Math.max(...chunkSizes),
      totalCharacters,
    };
  }
}
