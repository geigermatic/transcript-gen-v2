/**
 * Summarization engine for extracting facts and generating summaries
 */

import { ollama } from './ollama';
import { TextSplitter } from './textSplitter';
import { ChunkingConfigManager } from './chunkingConfig';
import { useAppStore } from '../store';
import { addLog } from './logger';
import type { Document, ExtractedFacts, StyleGuide } from '../types';

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
  processingStats: {
    totalChunks: number;
    successfulChunks: number;
    failedChunks: number;
    processingTime: number;
  };
}

export class SummarizationEngine {
  private static readonly MAX_RETRIES = 2;

  /**
   * Extract facts from a document and generate a summary
   */
  static async summarizeDocument(
    document: Document,
    styleGuide: StyleGuide,
    onProgress?: (current: number, total: number) => void
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    
    addLog({
      level: 'info',
      category: 'summarization',
      message: `Starting summarization for document: ${document.title}`,
      details: { documentId: document.id, textLength: document.text.length }
    });

    try {
      // Split document into chunks for processing
      const chunks = TextSplitter.splitText(document.text, document.id);
      
      addLog({
        level: 'info',
        category: 'summarization',
        message: `Document split into ${chunks.length} chunks for fact extraction`,
        details: { documentId: document.id, chunkCount: chunks.length }
      });

      // Extract facts from each chunk (with configurable parallel processing)
      const config = ChunkingConfigManager.getCurrentConfig();
      const chunkFacts: ChunkFacts[] = await this.processChunks(
        chunks, 
        styleGuide, 
        document.id, 
        config,
        onProgress
      );

      // Merge facts from all chunks
      const mergedFacts = this.mergeFacts(chunkFacts);
      
      // Generate final markdown summary
      const markdownSummary = await this.generateMarkdownSummary(
        document, 
        mergedFacts, 
        styleGuide
      );

      const processingTime = Date.now() - startTime;
      const successfulChunks = chunkFacts.filter(cf => cf.parseSuccess).length;
      
      const result: SummarizationResult = {
        document,
        chunkFacts,
        mergedFacts,
        markdownSummary,
        processingStats: {
          totalChunks: chunks.length,
          successfulChunks,
          failedChunks: chunks.length - successfulChunks,
          processingTime,
        }
      };

      addLog({
        level: 'info',
        category: 'summarization',
        message: `Summarization completed for document: ${document.title}`,
        details: { 
          documentId: document.id,
          ...result.processingStats,
          summaryLength: markdownSummary.length,
          mergedFactKeys: Object.keys(mergedFacts)
        }
      });

      return result;

    } catch (error) {
      addLog({
        level: 'error',
        category: 'summarization',
        message: `Summarization failed for document: ${document.title}`,
        details: { documentId: document.id, error: error instanceof Error ? error.message : error }
      });
      throw error;
    }
  }

  /**
   * Extract facts from a single chunk using LLM
   */
  private static async extractFactsFromChunk(
    chunkText: string,
    styleGuide: StyleGuide,
    chunkIndex: number
  ): Promise<{ facts: Partial<ExtractedFacts>; parseSuccess: boolean; rawResponse: string; error?: string }> {
    const prompt = this.buildFactExtractionPrompt(chunkText, styleGuide, chunkIndex);
    
    let lastError: string = '';
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await ollama.chat([{
          role: 'user',
          content: prompt
        }]);
        
        // Try to parse the JSON response
        const cleanedResponse = this.cleanJsonResponse(response);
        const facts = JSON.parse(cleanedResponse);
        
        return {
          facts,
          parseSuccess: true,
          rawResponse: response,
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown parsing error';
        
        if (attempt < this.MAX_RETRIES - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return {
      facts: {},
      parseSuccess: false,
      rawResponse: '',
      error: lastError,
    };
  }

  /**
   * Build example phrases section for prompts
   */
  private static buildExamplePhrasesSection(styleGuide: StyleGuide): string {
    const phrases = styleGuide.example_phrases;
    if (!phrases) return '';
    
    let section = '';
    
    if (phrases.preferred_openings?.length > 0) {
      section += `Preferred Opening Phrases:\n- ${phrases.preferred_openings.join('\n- ')}\n\n`;
    }
    
    if (phrases.preferred_transitions?.length > 0) {
      section += `Preferred Transition Phrases:\n- ${phrases.preferred_transitions.join('\n- ')}\n\n`;
    }
    
    if (phrases.preferred_conclusions?.length > 0) {
      section += `Preferred Conclusion Phrases:\n- ${phrases.preferred_conclusions.join('\n- ')}\n\n`;
    }
    
    if (phrases.avoid_phrases?.length > 0) {
      section += `Phrases to Avoid:\n- ${phrases.avoid_phrases.join('\n- ')}\n\n`;
    }
    
    return section.trim() ? `EXAMPLE PHRASES:\n${section}` : '';
  }

  /**
   * Build the fact extraction prompt
   */
  private static buildFactExtractionPrompt(
    chunkText: string,
    styleGuide: StyleGuide,
    chunkIndex: number
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a professional, clear tone.';
    
    // Build example phrases section
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    return `You are extracting structured facts from a teaching transcript chunk. Extract information according to this JSON schema and style guide.

STYLE GUIDE:
${styleInstructions}

Tone Settings:
- Formality: ${styleGuide.tone_settings.formality}/100 (0=casual, 100=formal)
- Enthusiasm: ${styleGuide.tone_settings.enthusiasm}/100 (0=calm, 100=energetic) 
- Technical Level: ${styleGuide.tone_settings.technicality}/100 (0=simple, 100=technical)

Keywords to emphasize: ${styleGuide.keywords.join(', ') || 'None specified'}

${examplePhrasesSection}

JSON SCHEMA:
{
  "class_title": "string (optional)",
  "date_or_series": "string (optional)", 
  "audience": "string (optional)",
  "learning_objectives": ["string array"],
  "key_takeaways": ["string array - REQUIRED"],
  "topics": ["string array - REQUIRED"], 
  "techniques": ["string array - REQUIRED"],
  "action_items": ["string array"],
  "notable_quotes": ["string array"],
  "open_questions": ["string array"],
  "timestamp_refs": ["string array"]
}

INSTRUCTIONS:
1. Extract facts ONLY from this chunk (chunk ${chunkIndex + 1})
2. Return ONLY valid JSON - no explanations or markdown
3. Include key_takeaways, topics, and techniques (required fields)
4. Use empty arrays for fields with no relevant content
5. Apply the style guide to your extracted content
6. NEVER include individual names - use generic terms like "the instructor", "the teacher", "the speaker", "a student", "a participant"

CHUNK TEXT:
${chunkText}

JSON RESPONSE:`;
  }

  /**
   * Process chunks with configurable parallel processing
   */
  private static async processChunks(
    chunks: any[], 
    styleGuide: StyleGuide, 
    documentId: string, 
    config: any,
    onProgress?: (current: number, total: number) => void
  ): Promise<ChunkFacts[]> {
    const chunkFacts: ChunkFacts[] = [];
    
    if (config.enableParallelFactExtraction && config.chunking.parallelProcessing) {
      // Parallel processing in batches
      const batchSize = config.chunking.batchSize;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (chunk) => {
          try {
            const facts = await this.extractFactsFromChunk(chunk.text, styleGuide, chunk.chunkIndex);
            return {
              chunkId: chunk.id,
              chunkIndex: chunk.chunkIndex,
              facts: facts.facts,
              parseSuccess: facts.parseSuccess,
              rawResponse: facts.rawResponse,
              error: facts.error,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
              chunkId: chunk.id,
              chunkIndex: chunk.chunkIndex,
              facts: {},
              parseSuccess: false,
              rawResponse: '',
              error: errorMessage,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        chunkFacts.push(...batchResults);
        
        // Update progress
        onProgress?.(Math.min(i + batchSize, chunks.length), chunks.length);
        
        // Log batch completion
        addLog({
          level: 'info',
          category: 'summarization',
          message: `Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batchResults.length} chunks)`,
          details: { 
            documentId,
            batchSize: batchResults.length,
            successful: batchResults.filter(r => r.parseSuccess).length
          }
        });
        
        // Small delay between batches to avoid overwhelming Ollama
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      // Sequential processing (original behavior)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        onProgress?.(i + 1, chunks.length);
        
        try {
          const facts = await this.extractFactsFromChunk(chunk.text, styleGuide, chunk.chunkIndex);
          chunkFacts.push({
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            facts: facts.facts,
            parseSuccess: facts.parseSuccess,
            rawResponse: facts.rawResponse,
            error: facts.error,
          });
          
          addLog({
            level: 'info',
            category: 'summarization',
            message: `Extracted facts from chunk ${i + 1}/${chunks.length}`,
            details: { 
              documentId, 
              chunkId: chunk.id, 
              parseSuccess: facts.parseSuccess,
              factKeys: Object.keys(facts.facts)
            }
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          chunkFacts.push({
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            facts: {},
            parseSuccess: false,
            rawResponse: '',
            error: errorMessage,
          });
          
          addLog({
            level: 'error',
            category: 'summarization',
            message: `Failed to extract facts from chunk ${i + 1}/${chunks.length}`,
            details: { documentId, chunkId: chunk.id, error: errorMessage }
          });
        }
        
        // Small delay to avoid overwhelming Ollama
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return chunkFacts;
  }

  /**
   * Clean JSON response from LLM
   */
  private static cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*$/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Find the first { and last } to extract just the JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned;
  }

  /**
   * Merge facts from multiple chunks
   */
  private static mergeFacts(chunkFacts: ChunkFacts[]): ExtractedFacts {
    const merged: ExtractedFacts = {
      learning_objectives: [],
      key_takeaways: [],
      topics: [],
      techniques: [],
      action_items: [],
      notable_quotes: [],
      open_questions: [],
      timestamp_refs: [],
    };

    const successfulChunks = chunkFacts.filter(cf => cf.parseSuccess);
    
    // Take the first non-empty values for singular fields
    for (const chunkFact of successfulChunks) {
      const facts = chunkFact.facts;
      
      if (!merged.class_title && facts.class_title) {
        merged.class_title = facts.class_title;
      }
      if (!merged.date_or_series && facts.date_or_series) {
        merged.date_or_series = facts.date_or_series;
      }
      if (!merged.audience && facts.audience) {
        merged.audience = facts.audience;
      }
    }

    // Merge arrays and deduplicate
    const arrayFields: (keyof ExtractedFacts)[] = [
      'learning_objectives', 'key_takeaways', 'topics', 'techniques',
      'action_items', 'notable_quotes', 'open_questions', 'timestamp_refs'
    ];

    arrayFields.forEach(field => {
      const allValues = successfulChunks
        .flatMap(cf => cf.facts[field] || [])
        .filter(value => value && value.trim().length > 0);
      
      // Deduplicate while preserving order
      const unique = Array.from(new Set(allValues.map(v => v.toLowerCase())))
        .map(lowercased => allValues.find(v => v.toLowerCase() === lowercased)!);
      
      (merged[field] as string[]) = unique;
    });

    return merged;
  }

  /**
   * Generate final markdown summary
   */
  private static async generateMarkdownSummary(
    document: Document,
    mergedFacts: ExtractedFacts,
    styleGuide: StyleGuide
  ): Promise<string> {
    const prompt = this.buildSummaryPrompt(document, mergedFacts, styleGuide);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      return response.trim();
      
    } catch (error) {
      // Fallback: generate summary from facts
      return this.generateFallbackSummary(document, mergedFacts);
    }
  }

  /**
   * Build summary generation prompt
   */
  private static buildSummaryPrompt(
    document: Document,
    mergedFacts: ExtractedFacts,
    styleGuide: StyleGuide
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a professional, clear tone.';
    
    // Build example phrases section
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    return `Generate a comprehensive markdown summary from the extracted facts below. Follow the style guide precisely.

STYLE GUIDE:
${styleInstructions}

Tone Settings:
- Formality: ${styleGuide.tone_settings.formality}/100 (0=casual, 100=formal)
- Enthusiasm: ${styleGuide.tone_settings.enthusiasm}/100 (0=calm, 100=energetic)
- Technical Level: ${styleGuide.tone_settings.technicality}/100 (0=simple, 100=technical)

Keywords to emphasize: ${styleGuide.keywords.join(', ') || 'None specified'}

${examplePhrasesSection}

DOCUMENT: ${document.title}
EXTRACTED FACTS:
${JSON.stringify(mergedFacts, null, 2)}

INSTRUCTIONS:
1. Create a well-structured markdown summary
2. Use the extracted facts as your foundation
3. Apply the style guide consistently
4. Include relevant headings and formatting
5. Emphasize techniques and key takeaways
6. Make it engaging and useful for the target audience
7. NEVER include individual names - use generic terms like "the instructor", "the teacher", "the speaker", "a student", "a participant"
8. START with a "## Synopsis" section containing 4-6 sentences that provide a concise overview of the key content and outcomes

MARKDOWN SUMMARY:`;
  }

  /**
   * Generate fallback summary when LLM fails
   */
  private static generateFallbackSummary(
    document: Document,
    mergedFacts: ExtractedFacts
  ): string {
    let summary = `# ${mergedFacts.class_title || document.title}\n\n`;
    
    if (mergedFacts.date_or_series) {
      summary += `**Date/Series:** ${mergedFacts.date_or_series}\n\n`;
    }
    
    if (mergedFacts.audience) {
      summary += `**Audience:** ${mergedFacts.audience}\n\n`;
    }

    // Add synopsis section
    summary += `## Synopsis\n\n`;
    if (mergedFacts.key_takeaways.length > 0) {
      const firstFewTakeaways = mergedFacts.key_takeaways.slice(0, 3);
      summary += `This session covers ${firstFewTakeaways.join(', ')}. `;
    }
    if (mergedFacts.techniques.length > 0) {
      summary += `Key techniques discussed include ${mergedFacts.techniques.slice(0, 2).join(' and ')}. `;
    }
    if (mergedFacts.topics.length > 0) {
      summary += `The main topics explored are ${mergedFacts.topics.slice(0, 2).join(' and ')}. `;
    }
    summary += `This content is designed for ${mergedFacts.audience || 'learners'} seeking to understand these concepts.\n\n`;

    if (mergedFacts.key_takeaways.length > 0) {
      summary += `## Key Takeaways\n\n`;
      mergedFacts.key_takeaways.forEach(takeaway => {
        summary += `- ${takeaway}\n`;
      });
      summary += '\n';
    }

    if (mergedFacts.techniques.length > 0) {
      summary += `## Techniques Covered\n\n`;
      mergedFacts.techniques.forEach(technique => {
        summary += `- ${technique}\n`;
      });
      summary += '\n';
    }

    if (mergedFacts.topics.length > 0) {
      summary += `## Topics Discussed\n\n`;
      mergedFacts.topics.forEach(topic => {
        summary += `- ${topic}\n`;
      });
      summary += '\n';
    }

    if (mergedFacts.learning_objectives.length > 0) {
      summary += `## Learning Objectives\n\n`;
      mergedFacts.learning_objectives.forEach(objective => {
        summary += `- ${objective}\n`;
      });
      summary += '\n';
    }

    if (mergedFacts.action_items && mergedFacts.action_items.length > 0) {
      summary += `## Action Items\n\n`;
      mergedFacts.action_items.forEach(item => {
        summary += `- ${item}\n`;
      });
      summary += '\n';
    }

    if (mergedFacts.notable_quotes && mergedFacts.notable_quotes.length > 0) {
      summary += `## Notable Quotes\n\n`;
      mergedFacts.notable_quotes.forEach(quote => {
        summary += `> ${quote}\n\n`;
      });
    }

    return summary;
  }
}
