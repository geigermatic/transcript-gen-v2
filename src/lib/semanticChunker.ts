/**
 * Semantic-aware text chunking for improved document processing
 * Implements intelligent chunking strategies that preserve semantic boundaries
 */

import type { TextChunk } from './textSplitter';

export interface SemanticChunkingOptions {
  strategy: 'semantic' | 'fixed' | 'adaptive';
  maxChunkSize: number;
  minChunkSize?: number;
  overlap?: number;
  preserveStructure?: boolean;
  contentType?: 'text' | 'markdown' | 'pdf' | 'code';
}

export interface ChunkQualityScore {
  coherence: number;      // 0-1: How semantically coherent the chunk is
  completeness: number;   // 0-1: How complete the ideas in the chunk are
  boundary: number;       // 0-1: How well the chunk respects semantic boundaries
  overall: number;        // 0-1: Overall quality score
}

export interface SemanticChunk extends TextChunk {
  qualityScore: ChunkQualityScore;
  semanticType: 'paragraph' | 'section' | 'list' | 'heading' | 'mixed';
  keywords: string[];
}

export class SemanticChunker {

  /**
   * Chunk text using semantic-aware strategies
   */
  static async chunkText(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {

    switch (options.strategy) {
      case 'semantic':
        return this.semanticChunking(text, documentId, options);
      case 'adaptive':
        return this.adaptiveChunking(text, documentId, options);
      case 'fixed':
      default:
        return this.fixedChunking(text, documentId, options);
    }
  }

  /**
   * Semantic-aware chunking that preserves meaning boundaries
   */
  private static async semanticChunking(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {

    // Step 1: Identify structural elements
    const sections = this.identifyStructuralElements(text, options);

    // Step 2: Group related sections if preserveStructure is true
    const groupedSections = options.preserveStructure
      ? this.groupRelatedSections(sections, options)
      : sections;

    // Step 3: Create chunks respecting semantic boundaries
    const chunks: SemanticChunk[] = [];
    let chunkIndex = 0;

    for (const section of groupedSections) {
      if (section.text.length <= options.maxChunkSize) {
        // Section fits in one chunk
        chunks.push(this.createSemanticChunk(
          section.text,
          documentId,
          chunkIndex++,
          section.startIndex,
          section.endIndex,
          section.type,
          options
        ));
      } else {
        // Section needs to be split further
        const subChunks = this.splitLargeSection(section, documentId, chunkIndex, options);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
      }
    }

    return chunks;
  }

  /**
   * Group related sections (e.g., heading + following paragraphs)
   */
  private static groupRelatedSections(
    sections: Array<{
      text: string;
      startIndex: number;
      endIndex: number;
      type: 'paragraph' | 'section' | 'list' | 'heading';
    }>,
    options: SemanticChunkingOptions
  ): Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    type: 'paragraph' | 'section' | 'list' | 'heading';
  }> {

    const grouped: Array<{
      text: string;
      startIndex: number;
      endIndex: number;
      type: 'paragraph' | 'section' | 'list' | 'heading';
    }> = [];

    let i = 0;
    while (i < sections.length) {
      const current = sections[i];

      if (current.type === 'heading') {
        // Group heading with following content
        let combinedText = current.text;
        let endIndex = current.endIndex;
        let groupType: 'paragraph' | 'section' | 'list' | 'heading' = 'section';

        // Look ahead for related content
        let j = i + 1;
        while (j < sections.length && sections[j].type !== 'heading') {
          const next = sections[j];
          const potentialLength = combinedText.length + next.text.length + 2; // +2 for spacing

          // Be more generous with grouping when preserving structure
          const maxGroupSize = options.maxChunkSize * 1.5; // Allow 50% larger groups

          if (potentialLength <= maxGroupSize) {
            combinedText += '\n\n' + next.text;
            endIndex = next.endIndex;
            j++;
          } else {
            break;
          }
        }

        grouped.push({
          text: combinedText,
          startIndex: current.startIndex,
          endIndex,
          type: groupType
        });

        i = j; // Skip the sections we've grouped
      } else {
        // Non-heading section, add as-is
        grouped.push(current);
        i++;
      }
    }

    return grouped;
  }

  /**
   * Identify structural elements in text (headings, paragraphs, lists)
   */
  private static identifyStructuralElements(
    text: string,
    options: SemanticChunkingOptions
  ): Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    type: 'paragraph' | 'section' | 'list' | 'heading';
  }> {

    const elements: Array<{
      text: string;
      startIndex: number;
      endIndex: number;
      type: 'paragraph' | 'section' | 'list' | 'heading';
    }> = [];

    // Split by double newlines (paragraph boundaries)
    const paragraphs = text.split(/\n\s*\n/);
    let currentIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed.length === 0) {
        currentIndex += paragraph.length + 2; // +2 for the double newline
        continue;
      }

      const startIndex = text.indexOf(trimmed, currentIndex);
      const endIndex = startIndex + trimmed.length;

      // Determine element type
      let type: 'paragraph' | 'section' | 'list' | 'heading' = 'paragraph';

      if (this.isHeading(trimmed)) {
        type = 'heading';
      } else if (this.isList(trimmed)) {
        type = 'list';
      } else if (trimmed.length > 500) {
        type = 'section';
      }

      elements.push({
        text: trimmed,
        startIndex,
        endIndex,
        type
      });

      currentIndex = endIndex + 2;
    }

    return elements;
  }

  /**
   * Check if text is a heading
   */
  private static isHeading(text: string): boolean {
    // Check for markdown-style headings
    if (/^#{1,6}\s/.test(text)) return true;

    // Check for underlined headings (markdown style)
    const lines = text.split('\n');
    if (lines.length >= 2) {
      const secondLine = lines[1];
      if (/^[=\-]+$/.test(secondLine)) return true;
    }

    // Check for title-case short lines
    if (text.length < 100 && /^[A-Z][a-zA-Z\s]+$/.test(text)) return true;

    return false;
  }

  /**
   * Check if text is a list
   */
  private static isList(text: string): boolean {
    // Check for bullet points or numbered lists
    return /^[\s]*[-*•]\s/.test(text) || /^[\s]*\d+\.\s/.test(text);
  }

  /**
   * Split large sections while preserving semantic boundaries
   */
  private static splitLargeSection(
    section: { text: string; startIndex: number; endIndex: number; type: string },
    documentId: string,
    startChunkIndex: number,
    options: SemanticChunkingOptions
  ): SemanticChunk[] {

    const chunks: SemanticChunk[] = [];
    const sentences = this.splitIntoSentences(section.text);

    let currentChunk = '';
    let currentStartIndex = section.startIndex;
    let chunkIndex = startChunkIndex;
    let previousChunkEnd = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= options.maxChunkSize) {
        currentChunk += sentence;
      } else {
        // Create chunk from current content
        if (currentChunk.trim().length > 0) {
          // Add overlap from previous chunk if specified
          let finalChunkText = currentChunk.trim();
          if (options.overlap && options.overlap > 0 && previousChunkEnd) {
            const overlapText = previousChunkEnd.slice(-options.overlap);
            if (overlapText && !finalChunkText.startsWith(overlapText)) {
              finalChunkText = overlapText + ' ' + finalChunkText;
            }
          }

          chunks.push(this.createSemanticChunk(
            finalChunkText,
            documentId,
            chunkIndex++,
            currentStartIndex,
            currentStartIndex + currentChunk.length,
            section.type as any,
            options
          ));

          // Store end of current chunk for next overlap
          previousChunkEnd = currentChunk.trim();
        }

        // Start new chunk with overlap consideration
        currentChunk = sentence;
        currentStartIndex = section.startIndex + section.text.indexOf(sentence);
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      let finalChunkText = currentChunk.trim();
      if (options.overlap && options.overlap > 0 && previousChunkEnd) {
        const overlapText = previousChunkEnd.slice(-options.overlap);
        if (overlapText && !finalChunkText.startsWith(overlapText)) {
          finalChunkText = overlapText + ' ' + finalChunkText;
        }
      }

      chunks.push(this.createSemanticChunk(
        finalChunkText,
        documentId,
        chunkIndex,
        currentStartIndex,
        currentStartIndex + currentChunk.length,
        section.type as any,
        options
      ));
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private static splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with NLP libraries
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  /**
   * Create a semantic chunk with quality scoring
   */
  private static createSemanticChunk(
    text: string,
    documentId: string,
    chunkIndex: number,
    startIndex: number,
    endIndex: number,
    semanticType: 'paragraph' | 'section' | 'list' | 'heading',
    options: SemanticChunkingOptions
  ): SemanticChunk {

    const qualityScore = this.calculateQualityScore(text, semanticType);
    const keywords = this.extractKeywords(text);

    return {
      id: `${documentId}-chunk-${chunkIndex}`,
      documentId,
      text,
      startIndex,
      endIndex,
      chunkIndex,
      qualityScore,
      semanticType,
      keywords
    };
  }

  /**
   * Calculate quality score for a chunk
   */
  private static calculateQualityScore(
    text: string,
    semanticType: 'paragraph' | 'section' | 'list' | 'heading'
  ): ChunkQualityScore {

    // Analyze text characteristics
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const hasCompleteThoughts = sentences.length > 0 && text.trim().match(/[.!?]$/);
    const hasStructure = text.includes('\n') || text.includes('#') || text.includes('-');

    // Calculate coherence based on text structure and completeness
    let coherence = 0.5; // Base coherence

    // Boost coherence for well-structured text
    if (hasStructure) coherence += 0.2;
    if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 20) coherence += 0.2; // Good sentence length
    if (words.length >= 10) coherence += 0.1; // Sufficient content

    // Penalize fragmented text
    if (avgWordsPerSentence < 3) coherence -= 0.3;
    if (text.includes('...') || text.match(/\b\w{1,2}\b.*\b\w{1,2}\b/)) coherence -= 0.2; // Fragmented

    // Calculate completeness
    let completeness = 0.5; // Base completeness

    if (hasCompleteThoughts) completeness += 0.3;
    if (sentences.length >= 2) completeness += 0.2; // Multiple complete thoughts
    if (words.length >= 15) completeness += 0.1; // Substantial content

    // Penalize incomplete thoughts
    if (!hasCompleteThoughts) completeness -= 0.4;
    if (text.trim().length < 20) completeness -= 0.3; // Too short
    if (text.includes('incomplete') || text.includes('fragment')) completeness -= 0.2;

    // Calculate boundary score based on semantic type and structure
    let boundary = 0.7; // Base boundary score

    // Adjust based on semantic type
    switch (semanticType) {
      case 'heading':
        boundary = 1.0;
        // Headings are naturally good boundaries but may be incomplete thoughts
        if (!hasCompleteThoughts) completeness = 0.6; // Headings don't need complete sentences
        break;
      case 'paragraph':
        boundary = 0.9;
        break;
      case 'list':
        boundary = 0.8;
        break;
      case 'section':
        boundary = 0.8;
        if (hasStructure) boundary += 0.1;
        break;
    }

    // Ensure scores are within bounds
    coherence = Math.max(0, Math.min(1, coherence));
    completeness = Math.max(0, Math.min(1, completeness));
    boundary = Math.max(0, Math.min(1, boundary));

    const overall = (coherence + completeness + boundary) / 3;

    return {
      coherence,
      completeness,
      boundary,
      overall
    };
  }

  /**
   * Extract keywords from text
   */
  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction (can be enhanced with NLP)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Remove common stop words
    const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other']);

    const keywords = words.filter(word => !stopWords.has(word));

    // Return top 5 most frequent keywords
    const frequency: Record<string, number> = {};
    keywords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Adaptive chunking that adjusts strategy based on content type
   */
  private static async adaptiveChunking(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {

    // Adapt chunking strategy based on content type
    switch (options.contentType) {
      case 'markdown':
        return this.markdownAwareChunking(text, documentId, options);
      case 'code':
        return this.codeAwareChunking(text, documentId, options);
      case 'pdf':
        return this.pdfAwareChunking(text, documentId, options);
      case 'text':
      default:
        return this.semanticChunking(text, documentId, options);
    }
  }

  /**
   * Markdown-aware chunking that preserves markdown structure
   */
  private static async markdownAwareChunking(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {

    const sections = this.identifyMarkdownElements(text, options);
    const chunks: SemanticChunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      if (section.text.length <= options.maxChunkSize) {
        chunks.push(this.createSemanticChunk(
          section.text,
          documentId,
          chunkIndex++,
          section.startIndex,
          section.endIndex,
          section.type,
          options
        ));
      } else {
        const subChunks = this.splitLargeSection(section, documentId, chunkIndex, options);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
      }
    }

    return chunks;
  }

  /**
   * Identify markdown-specific elements
   */
  private static identifyMarkdownElements(
    text: string,
    options: SemanticChunkingOptions
  ): Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    type: 'paragraph' | 'section' | 'list' | 'heading';
  }> {

    const elements: Array<{
      text: string;
      startIndex: number;
      endIndex: number;
      type: 'paragraph' | 'section' | 'list' | 'heading';
    }> = [];

    // Handle code blocks first (they should be preserved as single units)
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks: Array<{ start: number; end: number; text: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }

    // Split text while preserving code blocks
    let currentIndex = 0;
    const textParts: string[] = [];

    for (const codeBlock of codeBlocks) {
      // Add text before code block
      if (currentIndex < codeBlock.start) {
        textParts.push(text.substring(currentIndex, codeBlock.start));
      }
      // Add code block as separate part
      textParts.push(codeBlock.text);
      currentIndex = codeBlock.end;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      textParts.push(text.substring(currentIndex));
    }

    // Process each part
    let globalIndex = 0;
    for (const part of textParts) {
      if (part.startsWith('```')) {
        // This is a code block
        elements.push({
          text: part,
          startIndex: globalIndex,
          endIndex: globalIndex + part.length,
          type: 'section' // Code blocks are treated as sections
        });
      } else {
        // Regular text - process for markdown structure
        const partElements = this.identifyStructuralElements(part, options);
        for (const element of partElements) {
          elements.push({
            ...element,
            startIndex: element.startIndex + globalIndex,
            endIndex: element.endIndex + globalIndex
          });
        }
      }
      globalIndex += part.length;
    }

    return elements;
  }

  /**
   * Code-aware chunking (placeholder)
   */
  private static async codeAwareChunking(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {
    // For now, fall back to semantic chunking
    return this.semanticChunking(text, documentId, options);
  }

  /**
   * PDF-aware chunking (placeholder)
   */
  private static async pdfAwareChunking(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {
    // For now, fall back to semantic chunking
    return this.semanticChunking(text, documentId, options);
  }

  /**
   * Fixed chunking (fallback)
   */
  private static async fixedChunking(
    text: string,
    documentId: string,
    options: SemanticChunkingOptions
  ): Promise<SemanticChunk[]> {
    // Simple fixed-size chunking
    const chunks: SemanticChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + options.maxChunkSize, text.length);
      const chunkText = text.substring(startIndex, endIndex);

      chunks.push(this.createSemanticChunk(
        chunkText,
        documentId,
        chunkIndex++,
        startIndex,
        endIndex,
        'paragraph',
        options
      ));

      startIndex = endIndex;
    }

    return chunks;
  }
}
