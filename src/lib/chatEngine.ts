/**
 * Chat engine for conversational Q&A with grounded responses
 */

import { ollama } from './ollama';
import { EmbeddingEngine } from './embeddingEngine';
import { PromptService } from './promptService';
import { useAppStore } from '../store';
import type { ChatMessage, ChatContext, ChatResponse, EmbeddedChunk, SearchResult, StyleGuide } from '../types';

export interface RetrievalContext {
  query: string;
  retrievedChunks: SearchResult[];
  topScores: number[];
  hasRelevantContent: boolean;
}

export class ChatEngine {
  private static readonly MAX_RETRIEVAL_RESULTS = 5;
  private static readonly MIN_SIMILARITY_THRESHOLD = 0.3;
  private static readonly MAX_CONTEXT_MESSAGES = 10;
  private static readonly MAX_CONTEXT_LENGTH = 4000; // characters

  /**
   * Process a user question and generate a grounded response
   */
  static async processQuery(
    query: string,
    context: ChatContext,
    styleGuide: StyleGuide
  ): Promise<ChatResponse> {
    const { addLog, getAllEmbeddings } = useAppStore.getState();
    const startTime = Date.now();
    
    // Check for format requirements
    const formatRequirements = this.detectFormatRequirements(query);
    const hasFormatRequirements = formatRequirements.length > 0;

    addLog({
      level: 'info',
      category: 'chat',
      message: `Processing user query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`,
      details: { 
        queryLength: query.length,
        contextMessages: context.messages.length,
        hasSummaryContext: !!context.selectedDocumentSummary,
        summaryLength: context.selectedDocumentSummary?.length || 0,
        hasFormatRequirements,
        formatRequirements: hasFormatRequirements ? formatRequirements.trim() : null
      }
    });

    try {
      // Get all available embeddings
      const allEmbeddings = getAllEmbeddings();
      
      if (allEmbeddings.length === 0) {
        const noDataResponse = this.createNoDataResponse(query, startTime);
        addLog({
          level: 'warn',
          category: 'chat',
          message: 'No embeddings available for grounding',
          details: { query }
        });
        return noDataResponse;
      }

      // Retrieve relevant chunks
      const retrievalContext = await this.retrieveRelevantChunks(query, allEmbeddings);
      
      // Log retrieval results
      addLog({
        level: 'info',
        category: 'chat',
        message: 'Retrieved relevant chunks for grounding',
        details: {
          query,
          retrievalCount: retrievalContext.retrievedChunks.length,
          topScores: retrievalContext.topScores,
          hasRelevantContent: retrievalContext.hasRelevantContent
        }
      });

      // Generate response based on retrieval results
      const response = retrievalContext.hasRelevantContent
        ? await this.generateGroundedResponse(query, context, retrievalContext, styleGuide)
        : this.createNoGroundingResponse(query, startTime);

      const processingTime = Date.now() - startTime;
      
      // Update response metrics
      response.responseMetrics.processingTime = processingTime;
      response.responseMetrics.retrievalCount = retrievalContext.retrievedChunks.length;
      response.responseMetrics.topSimilarity = retrievalContext.topScores[0] || 0;
      response.responseMetrics.responseLength = response.message.content.length;

      addLog({
        level: 'info',
        category: 'chat',
        message: 'Chat response generated',
        details: {
          query,
          hasGrounding: response.hasGrounding,
          responseLength: response.responseMetrics.responseLength,
          processingTime: response.responseMetrics.processingTime,
          topSimilarity: response.responseMetrics.topSimilarity
        }
      });

      return response;

    } catch (error) {
      addLog({
        level: 'error',
        category: 'chat',
        message: 'Chat processing failed',
        details: { query, error: error instanceof Error ? error.message : error }
      });
      
      return this.createErrorResponse(query, error, startTime);
    }
  }

  /**
   * Retrieve relevant chunks for the query
   */
  private static async retrieveRelevantChunks(
    query: string,
    embeddedChunks: EmbeddedChunk[]
  ): Promise<RetrievalContext> {
    try {
      // Perform hybrid search for best results
      const searchResults = await EmbeddingEngine.performHybridSearch(
        query,
        embeddedChunks,
        this.MAX_RETRIEVAL_RESULTS
      );

      // Filter by similarity threshold
      const relevantResults = searchResults.filter(
        result => result.similarity >= this.MIN_SIMILARITY_THRESHOLD
      );

      const topScores = searchResults.slice(0, 5).map(r => r.similarity);
      const hasRelevantContent = relevantResults.length > 0;

      return {
        query,
        retrievedChunks: relevantResults,
        topScores,
        hasRelevantContent,
      };
    } catch (error) {
      throw new Error(`Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a grounded response using retrieved chunks
   */
  private static async generateGroundedResponse(
    query: string,
    context: ChatContext,
    retrievalContext: RetrievalContext,
    styleGuide: StyleGuide
  ): Promise<ChatResponse> {
    const prompt = this.buildGroundedPrompt(query, context, retrievalContext, styleGuide);
    
    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);

      console.log('🔍 generateGroundedResponse - Raw Ollama response:', response);
      
      // Format the response with proper paragraph breaks
      const formattedResponse = this.formatResponseWithParagraphs(response.trim());
      console.log('🔍 generateGroundedResponse - After formatting:', formattedResponse);

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: formattedResponse,
        timestamp: new Date().toISOString(),
        sources: retrievalContext.retrievedChunks,
      };

      return {
        message,
        sources: retrievalContext.retrievedChunks,
        hasGrounding: true,
        responseMetrics: {
          retrievalCount: retrievalContext.retrievedChunks.length,
          topSimilarity: retrievalContext.topScores[0] || 0,
          responseLength: formattedResponse.length,
          processingTime: 0, // Will be set by caller
        }
      };
    } catch (error) {
      throw new Error(`Response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format AI response with proper paragraph breaks for better readability
   */
  private static formatResponseWithParagraphs(response: string): string {
    console.log('🔍 formatResponseWithParagraphs - Input response:', response);
    
    // Split the response into sentences
    const sentences = response.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    console.log('🔍 formatResponseWithParagraphs - Sentences found:', sentences.length);
    console.log('🔍 formatResponseWithParagraphs - First few sentences:', sentences.slice(0, 3));
    
    if (sentences.length <= 3) {
      // For short responses, just return as is
      console.log('🔍 formatResponseWithParagraphs - Short response, returning as-is');
      return response;
    }

    // Group sentences into logical paragraphs
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];
    
    sentences.forEach((sentence, index) => {
      currentParagraph.push(sentence);
      
      // Start a new paragraph after 2-4 sentences, or at natural break points
      const shouldStartNewParagraph = 
        currentParagraph.length >= 3 || // After 3 sentences
        (index < sentences.length - 1 && this.isNaturalParagraphBreak(sentence, sentences[index + 1])) || // Natural break
        (index === sentences.length - 1); // End of response
      
      if (shouldStartNewParagraph) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    });
    
    console.log('🔍 formatResponseWithParagraphs - Paragraphs created:', paragraphs.length);
    console.log('🔍 formatResponseWithParagraphs - First paragraph:', paragraphs[0]);
    
    // Join paragraphs with double newlines for proper spacing
    const result = paragraphs.join('\n\n');
    console.log('🔍 formatResponseWithParagraphs - Final result:', result);
    
    return result;
  }

  /**
   * Determine if there's a natural break point between two sentences
   */
  private static isNaturalParagraphBreak(sentence1: string, sentence2: string): boolean {
    const sentence1Lower = sentence1.toLowerCase();
    const sentence2Lower = sentence2.toLowerCase();
    
    // Break after introductory phrases
    if (sentence1Lower.includes('first') || sentence1Lower.includes('initially') || 
        sentence1Lower.includes('to begin') || sentence1Lower.includes('let me start')) {
      return true;
    }
    
    // Break before transition phrases
    if (sentence2Lower.includes('however') || sentence2Lower.includes('on the other hand') ||
        sentence2Lower.includes('meanwhile') || sentence2Lower.includes('additionally') ||
        sentence2Lower.includes('furthermore') || sentence2Lower.includes('in addition') ||
        sentence2Lower.includes('next') || sentence2Lower.includes('then') ||
        sentence2Lower.includes('finally') || sentence2Lower.includes('in conclusion')) {
      return true;
    }
    
    // Break after questions
    if (sentence1.includes('?') || sentence1.includes('?')) {
      return true;
    }
    
    // Break before examples or specific details
    if (sentence2Lower.includes('for example') || sentence2Lower.includes('specifically') ||
        sentence2Lower.includes('in particular') || sentence2Lower.includes('such as')) {
      return true;
    }
    
    return false;
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
   * Build the grounded prompt with context and sources
   */
  /**
   * Detect specific format requirements in user query
   */
  private static detectFormatRequirements(query: string): string {
    const requirements = [];
    
    // Detect sentence count requirements
    const sentenceMatch = query.match(/(\d+)\s+sentences?/i);
    if (sentenceMatch) {
      const count = sentenceMatch[1];
      requirements.push(`- You MUST write exactly ${count} sentences. Count each sentence carefully.`);
      requirements.push(`- End each sentence with a period. Do not exceed ${count} sentences.`);
    }
    
    // Detect bullet point requirements
    if (/bullet\s+points?|bulleted?\s+list/i.test(query)) {
      requirements.push(`- Format as bullet points using "•" symbols`);
      requirements.push(`- One main idea per bullet point`);
    }
    
    // Detect paragraph requirements
    const paragraphMatch = query.match(/(\d+)\s+paragraphs?/i);
    if (paragraphMatch) {
      const count = paragraphMatch[1];
      requirements.push(`- Write exactly ${count} paragraphs separated by blank lines`);
    }
    
    // Detect word count requirements
    const wordMatch = query.match(/(\d+)\s+words?/i);
    if (wordMatch) {
      const count = wordMatch[1];
      requirements.push(`- Write approximately ${count} words. Be concise and precise.`);
    }
    
    // Detect synopsis/summary length requirements
    if (/synopsis|brief|concise|short/i.test(query)) {
      requirements.push(`- Be concise and direct. Avoid unnecessary elaboration.`);
    }
    
    return requirements.length > 0 
      ? `CRITICAL FORMAT REQUIREMENTS:\n${requirements.join('\n')}\n\n`
      : '';
  }

  private static buildGroundedPrompt(
    query: string,
    context: ChatContext,
    retrievalContext: RetrievalContext,
    styleGuide: StyleGuide
  ): string {
    const styleInstructions = styleGuide.instructions_md || 'Use a helpful, professional tone.';
    const examplePhrasesSection = this.buildExamplePhrasesSection(styleGuide);
    
    // Format conversation context
    const contextMessages = context.messages
      .slice(-this.MAX_CONTEXT_MESSAGES)
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Format retrieved chunks with document filenames
    const sourceChunks = retrievalContext.retrievedChunks
      .map((result) => {
        // Get document filename from the store
        const { documents } = useAppStore.getState();
        const document = documents.find(doc => doc.id === result.chunk.documentId);
        const filename = document?.title || document?.filename || `Document ${result.chunk.documentId}`;
        
        return `[${filename}] (Similarity: ${(result.similarity * 100).toFixed(1)}%)\n${result.chunk.text}`;
      })
      .join('\n\n');

    // Add summary context if available
    const summarySection = context.selectedDocumentSummary 
      ? `GENERATED SUMMARY:
${context.selectedDocumentSummary}

NOTE: When the user refers to "the summary", "the generated summary", or "this summary", they mean the above GENERATED SUMMARY section.

`
      : '';

    // Detect format requirements in the user's query
    const formatRequirements = this.detectFormatRequirements(query);

    return PromptService.buildPrompt('chat-response', {
      summarySection,
      formatRequirements,
      styleInstructions,
      formalityLevel: styleGuide.tone_settings.formality.toString(),
      enthusiasmLevel: styleGuide.tone_settings.enthusiasm.toString(),
      technicalityLevel: styleGuide.tone_settings.technicality.toString(),
      keywords: styleGuide.keywords.join(', ') || 'None specified',
      examplePhrasesSection,
      contextMessages,
      sourceChunks,
      userQuery: query
    });
  }

  /**
   * Create response when no grounding is available
   */
  private static createNoGroundingResponse(_query: string, startTime: number): ChatResponse {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "I don't have enough information in the provided sources to answer that question. Could you try rephrasing your question or make sure you have uploaded and indexed relevant documents?",
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: false,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 0,
        responseLength: message.content.length,
        processingTime: Date.now() - startTime,
      }
    };
  }

  /**
   * Create response when no data is available
   */
  private static createNoDataResponse(_query: string, startTime: number): ChatResponse {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "I don't have any documents to search through yet. Please upload some documents and generate embeddings first, then I'll be able to help answer questions about their content.",
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: false,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 0,
        responseLength: message.content.length,
        processingTime: Date.now() - startTime,
      }
    };
  }

  /**
   * Create error response
   */
  private static createErrorResponse(_query: string, error: unknown, startTime: number): ChatResponse {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `I encountered an error while trying to answer your question: ${errorMessage}. Please try again or check that Ollama is running properly.`,
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: false,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 0,
        responseLength: message.content.length,
        processingTime: Date.now() - startTime,
      }
    };
  }

  /**
   * Format context messages for display
   */
  static formatContextLength(context: ChatContext): number {
    return context.messages
      .map(msg => msg.content.length)
      .reduce((total, length) => total + length, 0);
  }

  /**
   * Trim context to fit within limits
   */
  static trimContext(context: ChatContext): ChatContext {
    let messages = [...context.messages];
    let totalLength = this.formatContextLength({ messages, maxContextLength: context.maxContextLength });
    
    // Remove oldest messages until we're under the limit
    while (totalLength > this.MAX_CONTEXT_LENGTH && messages.length > 1) {
      messages.shift();
      totalLength = this.formatContextLength({ messages, maxContextLength: context.maxContextLength });
    }
    
    return {
      messages: messages.slice(-this.MAX_CONTEXT_MESSAGES),
      maxContextLength: context.maxContextLength,
    };
  }
}
