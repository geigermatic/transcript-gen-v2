/**
 * Summarization engine for extracting facts and generating summaries
 */

import { ollama } from './ollama';
import { TextSplitter } from './textSplitter';
import { ChunkingConfigManager, type ProcessingConfig } from './chunkingConfig';
import { PromptService } from './promptService';
import { logInfo, logError } from './logger';
import type { Document, ExtractedFacts, StyleGuide, TextChunk } from '../types';

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
        modelUsed?: string; // Store which model was used
      };
}

export class SummarizationEngine {
  private static readonly MAX_RETRIES = 2;

  /**
   * Regenerate just the stylized summary using existing facts
   */
  static async regenerateStyledSummary(
    document: Document,
    mergedFacts: ExtractedFacts,
    styleGuide: StyleGuide,
    regenerationCount: number = 1
  ): Promise<string> {
    logInfo('SUMMARIZE', `Regenerating stylized summary for: ${document.title || document.filename || 'Unknown Document'}`);
    
    try {
      // Use the special regeneration prompt for variation
      const timestamp = Date.now();
      const regenerationPrompt = PromptService.buildPrompt('summary-regeneration', {
        documentTitle: document.title || document.filename || 'Untitled Document',
        extractedFacts: JSON.stringify(mergedFacts, null, 2),
        styleInstructions: styleGuide.instructions_md,
        formalityLevel: styleGuide.tone_settings.formality.toString(),
        enthusiasmLevel: styleGuide.tone_settings.enthusiasm.toString(),
        technicalityLevel: styleGuide.tone_settings.technicality.toString(),
        keywords: styleGuide.keywords.join(', '),
        examplePhrasesSection: this.buildExamplePhrasesSection(styleGuide),
        timestamp: timestamp.toString(),
        regenerationCount: regenerationCount.toString()
      });

      logInfo('SUMMARIZE', 'About to call Ollama for regeneration', {
        promptLength: regenerationPrompt.length,
        regenerationCount,
        timestamp,
        promptPreview: regenerationPrompt.substring(0, 500) + '...',
        fullPrompt: regenerationPrompt // Log the full prompt for debugging
      });

      console.log('🔄 REGENERATION DEBUG:', {
        regenerationCount,
        timestamp,
        promptLength: regenerationPrompt.length,
        promptStart: regenerationPrompt.substring(0, 200),
        promptEnd: regenerationPrompt.substring(regenerationPrompt.length - 200)
      });

      const response = await ollama.chat([
        {
          role: 'system',
          content: `You are a creative AI assistant that MUST create DRAMATICALLY DIFFERENT content when asked to regenerate. You are currently regenerating summary #${regenerationCount}. You MUST vary your approach significantly and follow ALL variation requirements in the user's prompt. If you create similar content, you will fail this task.`
        },
        {
          role: 'user',
          content: regenerationPrompt
        }
      ]);
      
      console.log('🔄 REGENERATION RESPONSE:', {
        responseLength: response.length,
        responseStart: response.substring(0, 200),
        responseEnd: response.substring(response.length - 200),
        isIdentical: false // We'll check this in the calling code
      });
      
      logInfo('SUMMARIZE', 'Ollama response received', {
        responseLength: response.length,
        responsePreview: response.substring(0, 200) + '...',
        fullResponse: response // Log the full response for debugging
      });
      
      logInfo('SUMMARIZE', `Stylized summary regenerated for: ${document.title || document.filename || 'Unknown Document'}`, {
        summaryLength: response.length
      });
      
      return response;
    } catch (error) {
      logError('SUMMARIZE', `Failed to regenerate stylized summary for: ${document.title || document.filename || 'Unknown Document'}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Extract facts from a document and generate a summary
   */
  static async summarizeDocument(
    document: Document,
    styleGuide: StyleGuide,
    onProgress?: (current: number, total: number, status?: string) => void,
    modelId?: string
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    
    // Update the Ollama client to use the selected model if provided
    if (modelId) {
      ollama.updateModel(modelId);
      logInfo('SUMMARIZE', `Using selected model: ${modelId}`);
    }
    
    logInfo('SUMMARIZE', `Starting summarization for document: ${document.title}`, {
      documentId: document.id, 
      textLength: document.text.length,
      selectedModel: modelId || 'default'
    });

    try {
      // Split document into chunks optimized for the selected model
      onProgress?.(0, 100, 'Splitting document into chunks...');
      const chunks = modelId 
        ? TextSplitter.splitTextForModel(document.text, document.id, modelId)
        : TextSplitter.splitText(document.text, document.id);
      
      logInfo('SUMMARIZE', `Document split into ${chunks.length} chunks for fact extraction`, {
        documentId: document.id, 
        chunkCount: chunks.length,
        selectedModel: modelId || 'default',
        contextWindow: modelId ? TextSplitter.getModelContextWindow(modelId) : 'unknown'
      });

      // Check if we can use the fast path for large-context models
      const contextWindow = modelId ? TextSplitter.getModelContextWindow(modelId) : 4096;
      const canUseFastPath = chunks.length === 1 && contextWindow >= 32768; // 32K+ context models

      if (canUseFastPath) {
        logInfo('SUMMARIZE', `Using fast path for large-context model (${contextWindow} tokens)`, {
          documentId: document.id,
          modelId,
          contextWindow
        });
        
        onProgress?.(20, 100, 'Generating summary directly (fast path)...');
        
        // Generate summary directly from the full document - no fact extraction needed
        const rawSummary = await this.generateDirectSummary(document, styleGuide);
        
        onProgress?.(80, 100, 'Generating styled summary...');
        const styledSummary = await this.generateStyledSummaryFromRaw(document, rawSummary, styleGuide);
        
        // For backward compatibility, keep markdownSummary as the styled version
        const markdownSummary = styledSummary;
        
        onProgress?.(95, 100, 'Finalizing summaries...');
        
        const processingTime = Date.now() - startTime;
        
        // Create minimal chunk facts for compatibility
        const chunkFacts: ChunkFacts[] = [{
          chunkId: chunks[0].id,
          chunkIndex: 0,
          facts: {},
          parseSuccess: true,
          rawResponse: 'Fast path - no fact extraction needed',
          error: undefined,
        }];
        
        const result: SummarizationResult = {
          document,
          chunkFacts,
          mergedFacts: {
            learning_objectives: [],
            key_takeaways: [],
            topics: [],
            techniques: [],
            notable_quotes: [],
            action_items: [],
            class_title: document.title,
            date_or_series: '',
            audience: ''
          },
          markdownSummary,
          rawSummary,
          styledSummary,
          processingStats: {
            totalChunks: 1,
            successfulChunks: 1,
            failedChunks: 0,
            processingTime,
            modelUsed: modelId || 'default',
          }
        };
        
        logInfo('SUMMARIZE', `Fast path summarization completed for document: ${document.title}`, {
          documentId: document.id,
          ...result.processingStats,
          summaryLength: markdownSummary.length,
          fastPath: true
        });
        
        onProgress?.(100, 100, 'Summary completed successfully (fast path)!');
        return result;
      }

      // Standard path for smaller models or multiple chunks
      onProgress?.(10, 100, `Processing ${chunks.length} chunks for fact extraction...`);

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
      onProgress?.(70, 100, 'Merging facts from all chunks...');
      const mergedFacts = this.mergeFacts(chunkFacts);
      
      // Generate both raw and styled summaries
      onProgress?.(80, 100, 'Generating raw summary...');
      const rawSummary = await this.generateRawSummary(document, mergedFacts);
      
      onProgress?.(85, 100, 'Generating styled summary...');
      const styledSummary = await this.generateStyledSummary(document, mergedFacts, styleGuide);
      
      // For backward compatibility, keep markdownSummary as the styled version
      const markdownSummary = styledSummary;

      onProgress?.(95, 100, 'Finalizing summaries...');

      const processingTime = Date.now() - startTime;
      const successfulChunks = chunkFacts.filter(cf => cf.parseSuccess).length;
      
      const result: SummarizationResult = {
        document,
        chunkFacts,
        mergedFacts,
        markdownSummary,
        rawSummary,
        styledSummary,
        processingStats: {
          totalChunks: chunks.length,
          successfulChunks,
          failedChunks: chunks.length - successfulChunks,
          processingTime,
          modelUsed: modelId || 'default',
        }
      };

      logInfo('SUMMARIZE', `Summarization completed for document: ${document.title}`, {
        documentId: document.id,
        ...result.processingStats,
        summaryLength: markdownSummary.length,
        mergedFactKeys: Object.keys(mergedFacts)
      });

      onProgress?.(100, 100, 'Summary completed successfully!');
      return result;

    } catch (error) {
      logError('SUMMARIZE', `Summarization failed for document: ${document.title}`, {
        documentId: document.id, 
        error: error instanceof Error ? error.message : error
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
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    return PromptService.buildPrompt('fact-extraction', {
      styleInstructions,
      formalityLevel: styleGuide.tone_settings.formality.toString(),
      enthusiasmLevel: styleGuide.tone_settings.enthusiasm.toString(),
      technicalityLevel: styleGuide.tone_settings.technicality.toString(),
      keywords: styleGuide.keywords.join(', ') || 'None specified',
      examplePhrasesSection,
      chunkIndex: (chunkIndex + 1).toString(),
      chunkText
    });
  }

  /**
   * Process chunks with configurable parallel processing
   */
  private static async processChunks(
    chunks: TextChunk[], 
    styleGuide: StyleGuide, 
    documentId: string, 
    config: ProcessingConfig,
    onProgress?: (current: number, total: number, status?: string) => void
  ): Promise<ChunkFacts[]> {
    const chunkFacts: ChunkFacts[] = [];
    
    if (config.enableParallelFactExtraction && config.chunking.parallelProcessing) {
      // Parallel processing in batches with detailed progress updates
      const batchSize = config.chunking.batchSize;
      let completedChunks = 0;
      
      const processChunk = async (chunk: TextChunk): Promise<ChunkFacts> => {
        const chunkNumber = completedChunks + 1;
        onProgress?.(10 + (chunkNumber - 1) * 60 / chunks.length, 100, 
          `Extracting facts from chunk ${chunkNumber}/${chunks.length}...`);
        
        try {
          const facts = await this.extractFactsFromChunk(chunk.text, styleGuide, chunk.chunkIndex);
          completedChunks++;
          
          onProgress?.(10 + completedChunks * 60 / chunks.length, 100, 
            `Completed chunk ${completedChunks}/${chunks.length}`);
          
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
          completedChunks++;
          
          onProgress?.(10 + completedChunks * 60 / chunks.length, 100, 
            `Failed chunk ${completedChunks}/${chunks.length} - ${errorMessage}`);
          
          return {
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            facts: {},
            parseSuccess: false,
            rawResponse: '',
            error: errorMessage,
          };
        }
      };
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processChunk));
        chunkFacts.push(...batchResults);
        
        // Log batch completion
        logInfo('SUMMARIZE', `Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batchResults.length} chunks)`, {
          documentId,
          batchSize: batchResults.length,
          successful: batchResults.filter(r => r.parseSuccess).length
        });
        
        // Small delay between batches to avoid overwhelming Ollama
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      // Sequential processing with detailed progress updates
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        onProgress?.(10 + i * 60 / chunks.length, 100, 
          `Extracting facts from chunk ${i + 1}/${chunks.length}...`);
        
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
          
          logInfo('SUMMARIZE', `Extracted facts from chunk ${i + 1}/${chunks.length}`, {
            documentId, 
            chunkId: chunk.id, 
            parseSuccess: facts.parseSuccess,
            factKeys: Object.keys(facts.facts)
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
          
          logError('SUMMARIZE', `Failed to extract facts from chunk ${i + 1}/${chunks.length}`, {
            documentId, chunkId: chunk.id, error: errorMessage
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
   * Generate raw summary without style guide applied
   */
  private static async generateRawSummary(
    document: Document,
    mergedFacts: ExtractedFacts
  ): Promise<string> {
    const prompt = this.buildRawSummaryPrompt(document, mergedFacts);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      return response.trim();
      
    } catch (error) {
      logError('SUMMARIZE', 'Failed to generate raw summary', { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Raw summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate styled summary with style guide applied
   */
  private static async generateStyledSummary(
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
      
    } catch {
      // Fallback: generate summary from facts
      return this.generateFallbackSummary(document, mergedFacts);
    }
  }

  /**
   * Build raw summary generation prompt (without style guide)
   */
  private static buildRawSummaryPrompt(
    document: Document,
    mergedFacts: ExtractedFacts
  ): string {
    return `You are a professional transcript summarizer specializing in lessons, teachings, and meditations. Create a clear, factual summary of the following lesson/teaching transcript.

DOCUMENT: ${document.title}

EXTRACTED FACTS:
${JSON.stringify(mergedFacts, null, 2)}

REQUIRED STRUCTURE (use this exact format):
# ${document.title}

## Synopsis
[Exactly 4 sentences emphasizing WHY and WHAT benefits - compelling and benefit-focused]

## Learning Objectives
[What students will learn - bulleted list]

## Key Takeaways
[Main insights and lessons - bulleted list]

## Topics
[Subject areas covered - bulleted list]

## Techniques
[Specific methods, practices, exercises taught - bulleted list]

## Notable Quotes
[Memorable quotes from the lesson - bulleted list]

## Open Questions
[Questions for reflection or further exploration - bulleted list]

INSTRUCTIONS:
1. Follow the exact structure above - ALL sections must be included in this order
2. Use the extracted facts to populate each section appropriately
3. Use clear, professional language appropriate for educational content
4. Maintain objectivity and factual accuracy
5. Refer to the instructor as "Caren" throughout
6. Use lesson-appropriate language (e.g., "In this lesson", "In this teaching")
7. If a section has no content in the extracted facts, write "No specific [section name] identified in this lesson"
8. Focus on substance over style - this is a factual summary without specific voice requirements

SYNOPSIS REQUIREMENTS: Make the synopsis compelling and benefit-focused. Answer: What problems does this solve? What will you feel/experience? How will you be different after? LIMIT TO EXACTLY 4 SENTENCES.

Generate ONLY the markdown summary, no other text:`;
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
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    return PromptService.buildPrompt('summary-generation', {
      styleInstructions,
      formalityLevel: styleGuide.tone_settings.formality.toString(),
      enthusiasmLevel: styleGuide.tone_settings.enthusiasm.toString(),
      technicalityLevel: styleGuide.tone_settings.technicality.toString(),
      keywords: styleGuide.keywords.join(', ') || 'None specified',
      examplePhrasesSection,
      documentTitle: document.title,
      extractedFacts: JSON.stringify(mergedFacts, null, 2)
    });
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

  /**
   * Generate summary directly from document (fast path for large models)
   * Skips fact extraction and generates summary in one LLM call
   */
  private static async generateDirectSummary(
    document: Document,
    styleGuide: StyleGuide
  ): Promise<string> {
    const prompt = this.buildDirectSummaryPrompt(document, styleGuide);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      return response.trim();
      
    } catch (error) {
      logError('SUMMARIZE', 'Failed to generate direct summary', { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Direct summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate styled summary from raw summary (fast path)
   * Applies style guide to the raw summary
   */
  private static async generateStyledSummaryFromRaw(
    document: Document,
    rawSummary: string,
    styleGuide: StyleGuide
  ): Promise<string> {
    const prompt = this.buildStyleApplicationPrompt(document, rawSummary, styleGuide);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      return response.trim();
      
    } catch (error) {
      logError('SUMMARIZE', 'Failed to apply style guide to summary', { error: error instanceof Error ? error.message : String(error) });
      // Fallback: return raw summary if styling fails
      return rawSummary;
    }
  }

  /**
   * Build prompt for direct summary generation (fast path)
   */
  private static buildDirectSummaryPrompt(
    document: Document,
    styleGuide: StyleGuide
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a professional, clear tone.';
    
    return `You are a professional transcript summarizer specializing in lessons, teachings, and meditations. Create a clear, factual summary of the following lesson/teaching transcript.

DOCUMENT: ${document.title}

TRANSCRIPT TEXT:
${document.text}

STYLE INSTRUCTIONS: ${styleInstructions}

REQUIRED STRUCTURE (use this exact format):
# ${document.title}

## Synopsis
[Exactly 4 sentences emphasizing WHY and WHAT benefits - compelling and benefit-focused]

## Learning Objectives
[What students will learn - bulleted list]

## Key Takeaways
[Main insights and lessons - bulleted list]

## Topics
[Subject areas covered - bulleted list]

## Techniques
[Specific methods, practices, exercises taught - bulleted list]

## Notable Quotes
[Memorable quotes from the lesson - bulleted list]

## Open Questions
[Questions for reflection or further exploration - bulleted list]

INSTRUCTIONS:
1. Follow the exact structure above - ALL sections must be included in this order
2. Use the transcript text directly - no need to extract facts first
3. Keep each section concise but comprehensive
4. Maintain the professional tone specified in style instructions
5. Focus on actionable insights and practical value

Generate the summary now:`;
  }

  /**
   * Build prompt for applying style guide to existing summary
   */
  private static buildStyleApplicationPrompt(
    document: Document,
    rawSummary: string,
    styleGuide: StyleGuide
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a professional, clear tone.';
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    return `You are a professional content stylist. Apply the following style guide to the existing summary.

DOCUMENT: ${document.title}

EXISTING SUMMARY:
${rawSummary}

STYLE GUIDE:
- Instructions: ${styleInstructions}
- Formality: ${styleGuide.tone_settings.formality}
- Enthusiasm: ${styleGuide.tone_settings.enthusiasm}
- Technicality: ${styleGuide.tone_settings.technicality}
- Keywords: ${styleGuide.keywords.join(', ') || 'None specified'}

EXAMPLE PHRASES:
${examplePhrasesSection}

TASK:
Rewrite the summary to match the style guide while preserving all factual content and structure. Maintain the exact same sections and information, but adjust the tone, language, and presentation to match the specified style.

Apply the style guide now:`;
  }
}
