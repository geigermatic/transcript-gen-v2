/**
 * Summarization engine for extracting facts and generating summaries
 */

import { ollama } from './ollama';
import { TextSplitter } from './textSplitter';
import { useAppStore } from '../store';
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
    const { addLog } = useAppStore.getState();
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

      // Extract facts from each chunk
      const chunkFacts: ChunkFacts[] = [];
      
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
              documentId: document.id, 
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
            details: { documentId: document.id, chunkId: chunk.id, error: errorMessage }
          });
        }
        
        // Small delay to avoid overwhelming Ollama
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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
   * Build the fact extraction prompt
   */
  private static buildFactExtractionPrompt(
    chunkText: string,
    styleGuide: StyleGuide,
    chunkIndex: number
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a professional, clear tone.';
    
    return `You are extracting structured facts from a teaching transcript chunk. Extract information according to this JSON schema and style guide.

STYLE GUIDE:
${styleInstructions}

Tone Settings:
- Formality: ${styleGuide.tone_settings.formality}/100
- Enthusiasm: ${styleGuide.tone_settings.enthusiasm}/100  
- Technical Level: ${styleGuide.tone_settings.technicality}/100

Keywords to emphasize: ${styleGuide.keywords.join(', ') || 'None specified'}

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

CHUNK TEXT:
${chunkText}

JSON RESPONSE:`;
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
    
    return `Generate a comprehensive markdown summary from the extracted facts below. Follow the style guide precisely.

STYLE GUIDE:
${styleInstructions}

Tone Settings:
- Formality: ${styleGuide.tone_settings.formality}/100
- Enthusiasm: ${styleGuide.tone_settings.enthusiasm}/100
- Technical Level: ${styleGuide.tone_settings.technicality}/100

Keywords to emphasize: ${styleGuide.keywords.join(', ') || 'None specified'}

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
