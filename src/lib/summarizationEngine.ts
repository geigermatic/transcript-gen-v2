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
    modelId?: string,
    rawSummaryEnabled: boolean = true
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    
    // Check document size and provide early warnings
    const sizeCheck = this.checkDocumentSize(document, modelId);
    if (sizeCheck.warning) {
      console.warn(`⚠️ ${sizeCheck.warning}`);
      logInfo('SUMMARIZE', `Document size warning: ${sizeCheck.warning}`, {
        documentId: document.id,
        suggestedMode: sizeCheck.suggestedMode
      });
    }
    
    // Update the Ollama client to use the selected model if provided
    if (modelId) {
      ollama.updateModel(modelId);
      logInfo('SUMMARIZE', `Using selected model: ${modelId}`);
    }
    
    logInfo('SUMMARIZE', `Starting summarization for document: ${document.title}`, {
      documentId: document.id, 
      textLength: document.text.length,
      selectedModel: modelId || 'default',
      sizeWarning: sizeCheck.warning,
      suggestedMode: sizeCheck.suggestedMode
    });

    try {
      // Split document into chunks optimized for the selected model
      onProgress?.(0, 100, 'Splitting document into chunks...');
      let chunks: TextChunk[];
      
      try {
        chunks = modelId 
          ? TextSplitter.splitTextForModel(document.text, document.id, modelId)
          : TextSplitter.splitText(document.text, document.id);
      } catch (chunkingError) {
        console.warn('⚠️ Initial chunking failed, falling back to fast chunking:', chunkingError);
        
        // Fast fallback to aggressive chunking
        chunks = TextSplitter.splitText(document.text, document.id, {
          chunkSize: 3000, // Larger chunks for speed
          overlap: 100,    // Minimal overlap for speed
          maxChunks: 20    // Higher limit for speed
        });
        
        logInfo('SUMMARIZE', `Fast fallback chunking successful: ${chunks.length} chunks`, {
          documentId: document.id,
          fallbackChunkSize: 3000
        });
      }
      
      logInfo('SUMMARIZE', `Document split into ${chunks.length} chunks for fact extraction`, {
        documentId: document.id, 
        chunkCount: chunks.length,
        selectedModel: modelId || 'default',
        contextWindow: modelId ? TextSplitter.getModelContextWindow(modelId) : 'unknown'
      });

      // Check if we can use the fast path for large-context models
      const contextWindow = modelId ? TextSplitter.getModelContextWindow(modelId) : 4096;
      const canUseFastPath = chunks.length === 1 && contextWindow >= 32768; // 32K+ context models

      console.log('🔍 Fast Path Debug:', {
        modelId,
        contextWindow,
        chunkCount: chunks.length,
        canUseFastPath,
        textLength: document.text.length,
        estimatedTokens: Math.ceil(document.text.length / 4)
      });

      if (canUseFastPath) {
        logInfo('SUMMARIZE', `Using fast path for large-context model (${contextWindow} tokens)`, {
          documentId: document.id,
          modelId,
          contextWindow
        });
        
        onProgress?.(20, 100, 'Generating combined summary (ultra-fast path)...');
        
        try {
          let rawSummary: string | undefined;
          let styledSummary: string;
          
          if (rawSummaryEnabled) {
            // OPTIMIZED: Single Ollama call for both raw and styled summary
            const combinedResult = await this.generateCombinedSummary(document, styleGuide);
            rawSummary = combinedResult.rawSummary;
            styledSummary = combinedResult.styledSummary;
          } else {
            // Generate only styled summary for faster processing
            onProgress?.(20, 100, 'Generating styled summary (fast path)...');
            styledSummary = await this.generateStyledSummaryDirect(document, styleGuide);
          }
          
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
          
        } catch (fastPathError) {
          console.warn('⚠️ Fast path failed, falling back to standard processing:', fastPathError);
          logInfo('SUMMARIZE', `Fast path failed, falling back to standard processing`, {
            documentId: document.id,
            error: fastPathError instanceof Error ? fastPathError.message : 'Unknown error'
          });
          // Continue to standard processing below
        }
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
      
      // Generate summaries based on settings
      let rawSummary: string | undefined;
      let styledSummary: string;
      
      if (rawSummaryEnabled) {
        onProgress?.(80, 100, 'Generating raw summary...');
        rawSummary = await this.generateRawSummary(document, mergedFacts);
        
        onProgress?.(85, 100, 'Generating styled summary...');
        styledSummary = await this.generateStyledSummary(document, mergedFacts, styleGuide);
      } else {
        onProgress?.(80, 100, 'Generating styled summary...');
        styledSummary = await this.generateStyledSummary(document, mergedFacts, styleGuide);
      }
      
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
   * Combine chunks for efficiency to reduce LLM calls
   */
  private static combineChunksForEfficiency(chunks: TextChunk[]): TextChunk[] {
    const combined: TextChunk[] = [];
    let currentCombined = '';
    let startIndex = 0;
    let chunkIndex = 0;
    
    // Target size for combined chunks (aim for ~8-12K characters)
    const targetSize = 10000;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // If adding this chunk would exceed target size, save current combined chunk
      if (currentCombined.length + chunk.text.length > targetSize && currentCombined.length > 0) {
        combined.push({
          id: `combined-${chunkIndex}`,
          documentId: chunk.documentId,
          text: currentCombined.trim(),
          startIndex,
          endIndex: startIndex + currentCombined.length,
          chunkIndex: chunkIndex++
        });
        
        // Start new combined chunk
        currentCombined = chunk.text;
        startIndex = chunk.startIndex;
      } else {
        // Add to current combined chunk
        if (currentCombined.length > 0) {
          currentCombined += '\n\n' + chunk.text;
        } else {
          currentCombined = chunk.text;
          startIndex = chunk.startIndex;
        }
      }
    }
    
    // Add the last combined chunk
    if (currentCombined.length > 0) {
      combined.push({
        id: `combined-${chunkIndex}`,
        documentId: chunks[0].documentId,
        text: currentCombined.trim(),
        startIndex,
        endIndex: startIndex + currentCombined.length,
        chunkIndex: chunkIndex
      });
    }
    
    return combined;
  }
  
  /**
   * Process combined chunks efficiently
   */
  private static async processCombinedChunks(
    combinedChunks: TextChunk[],
    styleGuide: StyleGuide,
    documentId: string,
    _config: ProcessingConfig,
    onProgress?: (current: number, total: number, status?: string) => void
  ): Promise<ChunkFacts[]> {
    const chunkFacts: ChunkFacts[] = [];
    
    // Process combined chunks sequentially for better control
    for (let i = 0; i < combinedChunks.length; i++) {
      const chunk = combinedChunks[i];
      onProgress?.(10 + i * 60 / combinedChunks.length, 100, 
        `Processing combined section ${i + 1}/${combinedChunks.length}...`);
      
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
        
        logInfo('SUMMARIZE', `Processed combined chunk ${i + 1}/${combinedChunks.length}`, {
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
        
        logError('SUMMARIZE', `Failed to process combined chunk ${i + 1}/${combinedChunks.length}`, {
          documentId, chunkId: chunk.id, error: errorMessage
        });
      }
      
      // Small delay between combined chunks
      if (i < combinedChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return chunkFacts;
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
    
    // OPTIMIZATION: For large documents, combine chunks to reduce LLM calls
    if (chunks.length > 8) {
      console.log(`🚀 Large document detected (${chunks.length} chunks). Combining chunks for efficiency...`);
      
      // Combine chunks into larger sections to reduce LLM calls
      const combinedChunks = this.combineChunksForEfficiency(chunks);
      console.log(`📦 Reduced from ${chunks.length} to ${combinedChunks.length} combined chunks`);
      
      // Process combined chunks instead
      return this.processCombinedChunks(combinedChunks, styleGuide, documentId, config, onProgress);
    }
    
    // Check if we have too many chunks and need to fall back to more conservative chunking
    if (chunks.length > 15) {
      console.warn(`⚠️ Document has ${chunks.length} chunks, which may cause processing issues. Consider using 'ultra-fast' mode for very large documents.`);
    }
    
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
6. Use lesson-appropriate language (e.g., "Here's the thing", "What I want you to notice is", "Let's get real for a moment")
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
   * Generate raw summary directly from document (ultra-fast path step 1)
   * Basic factual summary without style guide applied
   */
  private static async generateRawSummaryDirect(
    document: Document
  ): Promise<string> {
    const prompt = this.buildRawSummaryDirectPrompt(document);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      return response.trim();
      
    } catch (error) {
      logError('SUMMARIZE', 'Failed to generate raw summary directly', { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Raw summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate styled summary from raw summary (ultra-fast path step 2)
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
   * Build prompt for raw summary generation (ultra-fast path step 1)
   */
  private static buildRawSummaryDirectPrompt(
    document: Document
  ): string {
    return `You are a professional transcript summarizer. Create a clear, factual summary of the following lesson/teaching transcript.

DOCUMENT: ${document.title}

TRANSCRIPT:
${document.text}

REQUIRED FORMAT (follow exactly):
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
2. Keep each section concise but comprehensive
3. Focus on factual content and actionable insights
4. Use clear, professional language
5. No specific styling - just the facts and structure

Generate the raw summary now:`;
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
    
    return `You are a professional content stylist. Rewrite the following summary to match the specified voice style guide.

DOCUMENT: ${document.title}

EXISTING SUMMARY:
${rawSummary}

VOICE STYLE GUIDE:
- Instructions: ${styleInstructions}
- Formality Level: ${styleGuide.tone_settings.formality}
- Enthusiasm Level: ${styleGuide.tone_settings.enthusiasm}
- Technicality Level: ${styleGuide.tone_settings.technicality}
- Keywords to Use: ${styleGuide.keywords.join(', ') || 'None specified'}

EXAMPLE PHRASES (use similar style):
${examplePhrasesSection}

TASK:
Rewrite the summary to match the voice style guide while preserving ALL factual content and structure. Maintain the exact same sections and information, but transform the tone, language, and presentation to match the specified style.

CRITICAL REQUIREMENTS:
1. Keep all factual content exactly the same
2. Maintain the exact same structure and sections
3. Apply the voice style guide to EVERY section
4. Use the specified keywords where appropriate
5. Match the formality, enthusiasm, and technicality levels
6. Use the example phrases as a guide for writing style

The result should be dramatically different in tone and style while preserving all the facts.

Apply the voice style guide now:`;
  }

  /**
   * Generate combined summary (raw + styled) directly from document (ultra-fast path)
   */
  private static async generateCombinedSummary(
    document: Document,
    styleGuide: StyleGuide
  ): Promise<{ rawSummary: string; styledSummary: string }> {
    const prompt = this.buildCombinedSummaryPrompt(document, styleGuide);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      // Attempt to parse the JSON response
      try {
        const cleanedResponse = this.cleanJsonResponse(response);
        const parsed = JSON.parse(cleanedResponse);
        
        // Validate the response structure
        if (parsed.rawSummary && parsed.styledSummary) {
          // QUALITY CHECK: Ensure we have sufficient detail
          if (this.hasSufficientDetail(parsed.rawSummary)) {
            return { 
              rawSummary: parsed.rawSummary.trim(), 
              styledSummary: parsed.styledSummary.trim() 
            };
          } else {
            logInfo('SUMMARIZE', 'Combined summary lacks sufficient detail, falling back to separate generation', {
              documentId: document.id,
              summaryLength: parsed.rawSummary.length
            });
          }
        } else {
          throw new Error('Invalid response structure - missing rawSummary or styledSummary');
        }
      } catch (parseError) {
        // If JSON parsing fails, fall back to generating both summaries separately
        logInfo('SUMMARIZE', 'Combined summary JSON parsing failed, falling back to separate generation', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responsePreview: response.substring(0, 200) + '...'
        });
      }
      
      // Fallback: generate summaries separately (still faster than the old approach)
      logInfo('SUMMARIZE', 'Using fallback separate generation for better detail', {
        documentId: document.id
      });
      
      const rawSummary = await this.generateRawSummaryDirect(document);
      const styledSummary = await this.generateStyledSummaryFromRaw(document, rawSummary, styleGuide);
      
      return { rawSummary, styledSummary };
      
    } catch (error) {
      logError('SUMMARIZE', 'Failed to generate combined summary', { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Combined summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for combined summary generation (ultra-fast path)
   */
  private static buildCombinedSummaryPrompt(
    document: Document,
    styleGuide: StyleGuide
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a professional, clear tone.';
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    return PromptService.buildPrompt('combined-summary-generation', {
      styleInstructions,
      formalityLevel: styleGuide.tone_settings.formality.toString(),
      enthusiasmLevel: styleGuide.tone_settings.enthusiasm.toString(),
      technicalityLevel: styleGuide.tone_settings.technicality.toString(),
      keywords: styleGuide.keywords.join(', ') || 'None specified',
      examplePhrasesSection,
      documentTitle: document.title,
      documentText: document.text
    });
  }

  /**
   * Check if the raw summary has sufficient detail for the combined summary quality check.
   * Looks for specific content indicators to ensure quality without additional LLM calls.
   */
  private static hasSufficientDetail(rawSummary: string): boolean {
    // Basic length check
    if (rawSummary.length < 200) {
      return false;
    }
    
    // Check for specific content indicators
    const hasNotableQuotes = rawSummary.includes('## Notable Quotes') && 
                             rawSummary.includes('## Notable Quotes') && 
                             !rawSummary.includes('## Notable Quotes\n\n');
    
    const hasLearningObjectives = rawSummary.includes('## Learning Objectives') && 
                                 rawSummary.includes('## Learning Objectives') && 
                                 !rawSummary.includes('## Learning Objectives\n\n');
    
    const hasKeyTakeaways = rawSummary.includes('## Key Takeaways') && 
                           rawSummary.includes('## Key Takeaways') && 
                           !rawSummary.includes('## Key Takeaways\n\n');
    
    const hasTechniques = rawSummary.includes('## Techniques') && 
                         rawSummary.includes('## Techniques') && 
                         !rawSummary.includes('## Techniques\n\n');
    
    // Check if sections have actual content (not just headers)
    const hasContentInQuotes = rawSummary.includes('## Notable Quotes') && 
                               rawSummary.includes('## Notable Quotes') && 
                               rawSummary.split('## Notable Quotes')[1]?.includes('-');
    
    const hasContentInObjectives = rawSummary.includes('## Learning Objectives') && 
                                  rawSummary.includes('## Learning Objectives') && 
                                  rawSummary.split('## Learning Objectives')[1]?.includes('-');
    
    // Return true only if we have sufficient content indicators
    return hasNotableQuotes && hasLearningObjectives && hasKeyTakeaways && hasTechniques &&
           hasContentInQuotes && hasContentInObjectives;
  }

  /**
   * Check if document size might cause processing issues and suggest alternatives
   */
  private static checkDocumentSize(document: Document, modelId?: string): {
    isLarge: boolean;
    isExtremelyLarge: boolean;
    suggestedMode: string;
    warning?: string;
  } {
    const textLength = document.text.length;
    
    // Fast size check - only warn for very large documents
    if (textLength <= 50000) { // 50KB - safe for most processing
      return { isLarge: false, isExtremelyLarge: false, suggestedMode: 'balanced' };
    }
    
    const estimatedTokens = Math.ceil(textLength / 4);
    const contextWindow = modelId ? TextSplitter.getModelContextWindow(modelId) : 4096;
    
    const isLarge = estimatedTokens > contextWindow * 0.8;
    const isExtremelyLarge = estimatedTokens > contextWindow * 2;
    
    let suggestedMode = 'balanced';
    let warning: string | undefined;
    
    if (isExtremelyLarge) {
      suggestedMode = 'ultra-fast';
      warning = `Large document detected. Using 'ultra-fast' mode recommended.`;
    } else if (isLarge) {
      suggestedMode = 'fast';
      warning = `Large document detected. Consider 'fast' mode for better performance.`;
    }
    
    return { isLarge, isExtremelyLarge, suggestedMode, warning };
  }

  /**
   * Generate styled summary directly from document (fast path without raw summary)
   */
  private static async generateStyledSummaryDirect(
    document: Document,
    styleGuide: StyleGuide
  ): Promise<string> {
    const prompt = this.buildStyledSummaryDirectPrompt(document, styleGuide);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);
      
      return response.trim();
      
    } catch (error) {
      logError('SUMMARIZE', 'Failed to generate styled summary directly', { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Styled summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for styled summary generation directly from document
   */
  private static buildStyledSummaryDirectPrompt(
    document: Document,
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
      extractedFacts: JSON.stringify({
        learning_objectives: [],
        key_takeaways: [],
        topics: [],
        techniques: [],
        notable_quotes: [],
        action_items: [],
        class_title: document.title,
        date_or_series: '',
        audience: ''
      }, null, 2)
    });
  }

  /**
   * Main summarization method
   */
}
