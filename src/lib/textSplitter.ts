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
    // Get model context window (in tokens)
    const contextWindow = this.getModelContextWindow(modelId);
    
    // Estimate text length in tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(text.length / 4);
    
    // If text fits in model context, return as single chunk
    if (estimatedTokens <= contextWindow * 0.8) { // 80% safety margin
      return [{
        id: `${documentId}-chunk-0`,
        documentId,
        text,
        startIndex: 0,
        endIndex: text.length,
        chunkIndex: 0
      }];
    }
    
    // Otherwise, use standard chunking with model-optimized settings
    const optimalChunkSize = Math.min(
      Math.floor(contextWindow * 0.6), // 60% of context window
      4000 // Cap at 4K for safety
    );
    
    return this.splitText(text, documentId, {
      chunkSize: optimalChunkSize,
      overlap: Math.floor(optimalChunkSize * 0.1), // 10% overlap
      maxChunks: 10 // Reasonable limit
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
      
      // Gemma models
      'gemma3:1b': 32768,
      'gemma3:4b': 131072,
      'gemma3:12b': 131072,
      'gemma3:27b': 131072,
      
      // Mixtral
      'mixtral:8x7b': 32768,
      
      // Default fallback
      'default': 4096
    };
    
    return contextWindows[modelId] || contextWindows['default'];
  }

  /**
   * Split text into chunks with specific configuration
   */
  static splitTextWithConfig(text: string, documentId: string, options: {
    chunkSize: number;
    overlap: number;
    maxChunks?: number;
  }): TextChunk[] {
    // First try paragraph splitting on double newlines
    const paragraphs = this.splitByParagraphs(text);
    
    if (paragraphs.length > 1 && this.areGoodParagraphs(paragraphs, options.chunkSize)) {
      let chunks = this.createChunksFromParagraphs(paragraphs, documentId);
      
      // Apply max chunks limit if specified
      if (options.maxChunks && chunks.length > options.maxChunks) {
        chunks = this.limitChunks(chunks, options.maxChunks);
      }
      
      return chunks;
    }
    
    // Fallback to fixed-size chunking
    let chunks = this.createFixedSizeChunks(text, documentId, options.chunkSize, options.overlap);
    
    // Apply max chunks limit if specified
    if (options.maxChunks && chunks.length > options.maxChunks) {
      chunks = this.limitChunks(chunks, options.maxChunks);
    }
    
    return chunks;
  }

  /**
   * Split text by double newlines (paragraph breaks)
   */
  private static splitByParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/) // Split on double newlines with optional whitespace
      .map(para => para.trim())
      .filter(para => para.length > 0);
  }

  /**
   * Check if paragraphs are reasonable sizes (not too short or too long)
   */
  private static areGoodParagraphs(paragraphs: string[], targetChunkSize: number): boolean {
    const minParagraphLength = Math.max(200, targetChunkSize * 0.1);
    const maxParagraphLength = targetChunkSize * 2;
    
    // At least 70% of paragraphs should be within reasonable size range
    const goodParagraphs = paragraphs.filter(para => 
      para.length >= minParagraphLength && para.length <= maxParagraphLength
    );
    
    return goodParagraphs.length / paragraphs.length >= 0.7;
  }

  /**
   * Create chunks from good paragraph splits
   */
  private static createChunksFromParagraphs(paragraphs: string[], documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentPosition = 0;
    
    paragraphs.forEach((paragraph, index) => {
      // Find the actual position in the original text
      const startIndex = currentPosition;
      const endIndex = startIndex + paragraph.length;
      
      chunks.push({
        id: `${documentId}-para-${index}`,
        documentId,
        text: paragraph,
        startIndex,
        endIndex,
        chunkIndex: index,
      });
      
      // Account for the paragraph separator (double newline) in position tracking
      currentPosition = endIndex + 2; // +2 for \n\n
    });
    
    return chunks;
  }

  /**
   * Create fixed-size chunks with overlap
   */
  private static createFixedSizeChunks(text: string, documentId: string, chunkSize: number, overlap: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      
      // Try to break at word boundary if not at end of text
      let actualEndIndex = endIndex;
      if (endIndex < text.length) {
        const lastSpaceIndex = text.lastIndexOf(' ', endIndex);
        if (lastSpaceIndex > startIndex + chunkSize * 0.8) {
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
      startIndex = Math.max(actualEndIndex - overlap, actualEndIndex);
      if (startIndex >= actualEndIndex) {
        startIndex = actualEndIndex;
      }
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
