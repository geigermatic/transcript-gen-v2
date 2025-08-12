/**
 * Text splitting utilities for document chunks
 * Implements smart paragraph splitting with fallback to fixed-size chunks
 */

export interface TextChunk {
  id: string;
  documentId: string;
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

export class TextSplitter {
  private static readonly DEFAULT_CHUNK_SIZE = 500; // characters
  private static readonly OVERLAP_SIZE = 50; // characters overlap between chunks

  /**
   * Split text into chunks using double newlines first, then fixed-size fallback
   */
  static splitText(text: string, documentId: string): TextChunk[] {
    // First try paragraph splitting on double newlines
    const paragraphs = this.splitByParagraphs(text);
    
    if (paragraphs.length > 1 && this.areGoodParagraphs(paragraphs)) {
      return this.createChunksFromParagraphs(paragraphs, documentId);
    }
    
    // Fallback to fixed-size chunking
    return this.createFixedSizeChunks(text, documentId);
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
  private static areGoodParagraphs(paragraphs: string[]): boolean {
    const minParagraphLength = 50;
    const maxParagraphLength = 2000;
    
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
  private static createFixedSizeChunks(text: string, documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.DEFAULT_CHUNK_SIZE, text.length);
      
      // Try to break at word boundary if not at end of text
      let actualEndIndex = endIndex;
      if (endIndex < text.length) {
        const lastSpaceIndex = text.lastIndexOf(' ', endIndex);
        if (lastSpaceIndex > startIndex + this.DEFAULT_CHUNK_SIZE * 0.8) {
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
      startIndex = Math.max(actualEndIndex - this.OVERLAP_SIZE, actualEndIndex);
      if (startIndex >= actualEndIndex) {
        startIndex = actualEndIndex;
      }
    }
    
    return chunks;
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
