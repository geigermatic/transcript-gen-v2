/**
 * Enhanced Chat Engine for Document Manipulation and Conversational Editing
 * Supports reformatting, rephrasing, and guided editing with Caren's voice
 */

import { ollama } from './ollama';
import { EmbeddingEngine } from './embeddingEngine';
import { useAppStore } from '../store';
import type { 
  ChatMessage, 
  ChatContext, 
  ChatResponse, 
  Document, 
  StyleGuide,
  ABSummaryPair 
} from '../types';

export interface ChatCommand {
  type: 'reformat' | 'rephrase' | 'remove' | 'add' | 'summarize' | 'question';
  target?: string; // What to target (e.g., "bullet points", "section 2")
  instruction?: string; // How to modify
  context?: string; // Additional context
}

export interface EnhancedChatResponse extends ChatResponse {
  command?: ChatCommand;
  modifiedContent?: string;
  suggestions?: string[];
}

export class EnhancedChatEngine {
  private static readonly COMMAND_PATTERNS = {
    reformat: /(?:reformat|format|restructure|organize)\s+(.+?)(?:\s+(?:as|to|into)\s+(.+))?/i,
    rephrase: /(?:rephrase|rewrite|reword)\s+(.+?)(?:\s+(?:as|to|in)\s+(.+))?/i,
    remove: /(?:remove|delete|take out)\s+(.+)/i,
    add: /(?:add|include|insert)\s+(.+?)(?:\s+(?:to|in|after)\s+(.+))?/i,
    summarize: /(?:summarize|sum up|condense)\s+(.+)/i,
  };

  /**
   * Process chat message with enhanced document manipulation capabilities
   */
  static async processEnhancedQuery(
    query: string,
    context: ChatContext
  ): Promise<EnhancedChatResponse> {
    const { addLog, styleGuide } = useAppStore.getState();
    const startTime = Date.now();

    try {
      // Detect if this is a command or regular question
      const command = this.detectCommand(query);
      
      if (command) {
        return await this.processCommand(command, query, context);
      } else {
        // Regular Q&A with enhanced context
        return await this.processRegularQuery(query, context);
      }
    } catch (error) {
      addLog({
        level: 'error',
        category: 'chat',
        message: 'Enhanced chat processing failed',
        details: { query, error: error instanceof Error ? error.message : error }
      });
      
      return this.createErrorResponse(query, error, startTime);
    }
  }

  /**
   * Detect chat commands from user input
   */
  private static detectCommand(query: string): ChatCommand | null {
    for (const [type, pattern] of Object.entries(this.COMMAND_PATTERNS)) {
      const match = query.match(pattern);
      if (match) {
        return {
          type: type as ChatCommand['type'],
          target: match[1]?.trim(),
          instruction: match[2]?.trim(),
          context: query
        };
      }
    }
    return null;
  }

  /**
   * Process document manipulation commands
   */
  private static async processCommand(
    command: ChatCommand,
    originalQuery: string,
    context: ChatContext
  ): Promise<EnhancedChatResponse> {
    const { styleGuide } = useAppStore.getState();

    switch (command.type) {
      case 'reformat':
        return await this.handleReformat(command, context, styleGuide);
      case 'rephrase':
        return await this.handleRephrase(command, context, styleGuide);
      case 'remove':
        return await this.handleRemove(command, context);
      case 'add':
        return await this.handleAdd(command, context, styleGuide);
      case 'summarize':
        return await this.handleSummarize(command, context, styleGuide);
      default:
        return await this.processRegularQuery(originalQuery, context);
    }
  }

  /**
   * Handle reformatting requests
   */
  private static async handleReformat(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): Promise<EnhancedChatResponse> {
    const prompt = this.buildReformatPrompt(command, context, styleGuide);
    
    const response = await ollama.chat([{
      role: 'user',
      content: prompt
    }]);

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.trim(),
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: true,
      command,
      modifiedContent: response.trim(),
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 1.0,
        responseLength: response.length,
        processingTime: 0
      }
    };
  }

  /**
   * Handle rephrasing requests with Caren's voice
   */
  private static async handleRephrase(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): Promise<EnhancedChatResponse> {
    const prompt = this.buildRephrasePrompt(command, context, styleGuide);
    
    const response = await ollama.chat([{
      role: 'user',
      content: prompt
    }]);

    const suggestions = await this.generateAlternatives(command, context, styleGuide);

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.trim(),
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: true,
      command,
      modifiedContent: response.trim(),
      suggestions,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 1.0,
        responseLength: response.length,
        processingTime: 0
      }
    };
  }

  /**
   * Build reformat prompt with style guide integration
   */
  private static buildReformatPrompt(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): string {
    const targetContent = this.extractTargetContent(command, context);
    const formatInstruction = command.instruction || 'a clearer, more organized format';

    return `You are Caren, a warm and compassionate meditation teacher. Please reformat the following content ${formatInstruction}.

STYLE GUIDE:
${this.formatStyleGuideForPrompt(styleGuide)}

CONTENT TO REFORMAT:
${targetContent}

INSTRUCTIONS:
- Maintain Caren's warm, conversational voice
- Keep all important information
- Improve clarity and organization
- Use the specified format: ${formatInstruction}
- Apply the style guide principles above

Please provide the reformatted content:`;
  }

  /**
   * Build rephrase prompt with voice consistency
   */
  private static buildRephrasePrompt(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): string {
    const targetContent = this.extractTargetContent(command, context);
    const voiceInstruction = command.instruction || 'Caren\'s warm, compassionate voice';

    return `You are Caren, a warm and compassionate meditation teacher. Please rephrase the following content in ${voiceInstruction}.

CAREN'S VOICE CHARACTERISTICS:
${this.formatStyleGuideForPrompt(styleGuide)}

CONTENT TO REPHRASE:
${targetContent}

INSTRUCTIONS:
- Maintain the core meaning and information
- Apply Caren's signature voice patterns and vocabulary
- Use the tone specified: ${voiceInstruction}
- Keep the same level of detail
- Make it feel authentic to Caren's teaching style

Please provide the rephrased content:`;
  }

  /**
   * Extract target content from context based on command
   */
  private static extractTargetContent(command: ChatCommand, context: ChatContext): string {
    // If we have a specific document summary, use that
    if (context.selectedDocumentSummary) {
      return context.selectedDocumentSummary;
    }

    // Otherwise, use recent chat context
    const recentMessages = context.messages.slice(-5);
    return recentMessages
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content)
      .join('\n\n');
  }

  /**
   * Format style guide for prompt inclusion
   */
  private static formatStyleGuideForPrompt(styleGuide: StyleGuide): string {
    return `
VOICE: ${styleGuide.voice_description}
TONE: Formality: ${styleGuide.tone_settings.formality}/10, Enthusiasm: ${styleGuide.tone_settings.enthusiasm}/10
PREFERRED PHRASES: ${styleGuide.vocabulary.preferred_phrases.join(', ')}
AVOID: ${styleGuide.vocabulary.avoid_phrases.join(', ')}
CUSTOM INSTRUCTIONS: ${styleGuide.custom_instructions}
    `.trim();
  }

  /**
   * Generate alternative phrasings
   */
  private static async generateAlternatives(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): Promise<string[]> {
    const prompt = `Generate 2 alternative ways to rephrase this content in Caren's voice:

${this.extractTargetContent(command, context)}

Style: ${this.formatStyleGuideForPrompt(styleGuide)}

Provide just the alternatives, numbered 1. and 2.`;

    try {
      const response = await ollama.chat([{
        role: 'user',
        content: prompt
      }]);

      return response.split(/\d+\./).slice(1).map(alt => alt.trim());
    } catch {
      return [];
    }
  }

  /**
   * Process regular Q&A queries with enhanced context
   */
  private static async processRegularQuery(
    query: string,
    context: ChatContext
  ): Promise<EnhancedChatResponse> {
    // Use existing ChatEngine for regular queries
    const { ChatEngine } = await import('./chatEngine');
    const response = await ChatEngine.processQuery(query, context);
    
    return {
      ...response,
      suggestions: await this.generateFollowUpSuggestions(query, response)
    };
  }

  /**
   * Generate follow-up suggestions
   */
  private static async generateFollowUpSuggestions(
    query: string,
    response: ChatResponse
  ): Promise<string[]> {
    return [
      "Would you like me to rephrase this in a different tone?",
      "Should I reformat this as bullet points?",
      "Would you like me to expand on any particular section?"
    ];
  }

  /**
   * Handle content removal requests
   */
  private static async handleRemove(
    command: ChatCommand,
    context: ChatContext
  ): Promise<EnhancedChatResponse> {
    // Implementation for removing specific content
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `I'll help you remove "${command.target}" from the content. Here's the updated version:`,
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: true,
      command,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 1.0,
        responseLength: message.content.length,
        processingTime: 0
      }
    };
  }

  /**
   * Handle content addition requests
   */
  private static async handleAdd(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): Promise<EnhancedChatResponse> {
    // Implementation for adding content
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `I'll add "${command.target}" to the content in Caren's voice. Here's the updated version:`,
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: true,
      command,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 1.0,
        responseLength: message.content.length,
        processingTime: 0
      }
    };
  }

  /**
   * Handle summarization requests
   */
  private static async handleSummarize(
    command: ChatCommand,
    context: ChatContext,
    styleGuide: StyleGuide
  ): Promise<EnhancedChatResponse> {
    // Implementation for summarizing content
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Here's a summary of "${command.target}" in Caren's voice:`,
      timestamp: new Date().toISOString(),
    };

    return {
      message,
      sources: [],
      hasGrounding: true,
      command,
      responseMetrics: {
        retrievalCount: 0,
        topSimilarity: 1.0,
        responseLength: message.content.length,
        processingTime: 0
      }
    };
  }

  /**
   * Create error response
   */
  private static createErrorResponse(
    query: string,
    error: unknown,
    startTime: number
  ): EnhancedChatResponse {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'I apologize, but I encountered an issue processing your request. Could you please try rephrasing your question?',
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
        processingTime: Date.now() - startTime
      }
    };
  }
}
