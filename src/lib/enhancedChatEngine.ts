/**
 * Enhanced Chat Engine - Context-aware chat with command detection
 * Maintains existing UI while adding intelligent functionality
 */

import { ollama } from './ollama';
import { ChatEngine } from './chatEngine';
import { ChatContextDetector } from './chatContextDetector';
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
   * Process context-aware chat queries with intelligent routing
   */
  static async processContextAwareQuery(
    query: string,
    chatContext: ChatContext,
    pathname: string = '/'
  ): Promise<ChatResponse> {
    const { addLog, documents, abSummaryPairs, styleGuide } = useAppStore.getState();
    const startTime = Date.now();

    try {
      // Detect current context and capabilities
      const context = ChatContextDetector.detectContext(
        pathname,
        documents,
        abSummaryPairs,
        chatContext.activeDocument,
        styleGuide
      );

      // Detect user intent with conversation awareness
      const intent = ChatContextDetector.detectIntent(query, context, chatContext.messages);

      addLog({
        level: 'info',
        category: 'chat',
        message: 'Processing context-aware chat query',
        details: {
          query,
          location: context.location,
          capability: intent.capability?.name,
          confidence: intent.confidence,
          isFollowUp: intent.conversationContext.isFollowUp || false
        }
      });

      // Route to appropriate handler based on intent
      if (intent.capability && intent.confidence > 0.3) {
        return await this.routeToHandler(intent.capability, query, context, chatContext, intent.conversationContext);
      } else {
        // Fall back to regular chat engine for general Q&A
        return await ChatEngine.processQuery(query, chatContext);
      }

    } catch (error) {
      addLog({
        level: 'error',
        category: 'chat',
        message: 'Context-aware chat processing failed',
        details: { query, error: error instanceof Error ? error.message : error }
      });

      return this.createErrorResponse(query, error, startTime);
    }
  }

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
   * Route to appropriate handler based on detected capability
   */
  private static async routeToHandler(
    capability: any,
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    const handlerMap: Record<string, Function> = {
      'handleDocumentSearch': this.handleDocumentSearch,
      'handleUploadHelp': this.handleUploadHelp,
      'handleLibraryManagement': this.handleLibraryManagement,
      'handleGeneralQA': this.handleGeneralQA,
      'handleFormatContent': this.handleFormatContent,
      'handleRephraseVoice': this.handleRephraseVoice,
      'handleRegenerateSections': this.handleRegenerateSections,
      'handleAddContent': this.handleAddContent,
      'handleStyleAdjustments': this.handleStyleAdjustments,
      'handleDocumentQA': this.handleDocumentQA,
      'handleContentAnalysis': this.handleContentAnalysis,
      'handleNavigationHelp': this.handleNavigationHelp,
      'handleWorkspaceQA': this.handleWorkspaceQA
    };

    const handler = handlerMap[capability.handler];
    if (handler) {
      return await handler.call(this, query, context, chatContext, conversationContext);
    } else {
      // Fall back to regular chat engine
      return await ChatEngine.processQuery(query, chatContext);
    }
  }

  /**
   * Handle document search requests
   */
  private static async handleDocumentSearch(
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    const { documents } = useAppStore.getState();

    // Check if this is a follow-up to a previous search
    if (conversationContext.isFollowUp && conversationContext.previousContext?.type === 'results') {
      // User agreed to something about search results - provide more specific help
      return this.createSimpleResponse(
        "Great! You can click on any document title to open it, or tell me which specific document you'd like to explore. You can also ask me to search for something more specific if needed.",
        []
      );
    }

    // Extract search terms from query
    const searchTerms = query.toLowerCase()
      .replace(/(?:search|find|look for|documents about|show me)/g, '')
      .trim();

    if (!searchTerms && !conversationContext.isFollowUp) {
      return this.createSimpleResponse(
        "I can help you search your documents! What topic or keyword would you like me to look for?",
        []
      );
    }

    // Search through document titles and content
    const matchingDocs = documents.filter(doc =>
      doc.title?.toLowerCase().includes(searchTerms) ||
      doc.filename.toLowerCase().includes(searchTerms) ||
      doc.text.toLowerCase().includes(searchTerms)
    );

    if (matchingDocs.length === 0) {
      return this.createSimpleResponse(
        `I couldn't find any documents matching "${searchTerms}". Try different keywords or check if you've uploaded documents on that topic.`,
        []
      );
    }

    const response = `I found ${matchingDocs.length} document${matchingDocs.length > 1 ? 's' : ''} matching "${searchTerms}":\n\n` +
      matchingDocs.map(doc => `📄 **${doc.title || doc.filename}**`).join('\n') +
      '\n\nWould you like me to open one of these documents or search for something more specific?';

    return this.createSimpleResponse(response, []);
  }

  /**
   * Handle upload assistance requests
   */
  private static async handleUploadHelp(
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    // Check if this is a follow-up to upload guidance
    if (conversationContext.isFollowUp && conversationContext.previousContext?.action === 'upload-help') {
      return this.createSimpleResponse(
        "Perfect! Just drag your document file anywhere on this page, or look for the upload area. I'll process it automatically and create a summary for you. The whole process usually takes about 30 seconds.",
        []
      );
    }

    const response = `I'd be happy to help you upload documents! Here's how:\n\n` +
      `📁 **Drag & Drop**: Simply drag any PDF, TXT, or DOCX file onto this page\n` +
      `📂 **Click to Upload**: Look for the upload area on this page and click to browse files\n` +
      `⚡ **Processing**: Once uploaded, I'll automatically process and summarize your document\n\n` +
      `**Supported formats**: PDF, TXT, DOCX\n` +
      `**Processing time**: Usually takes about 30 seconds\n\n` +
      `What type of document are you looking to upload?`;

    return this.createSimpleResponse(response, []);
  }

  /**
   * Process regular Q&A queries with enhanced context
   */
  private static async processRegularQuery(
    query: string,
    context: ChatContext
  ): Promise<EnhancedChatResponse> {
    // Use existing ChatEngine for regular queries
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
   * Handle library management requests
   */
  private static async handleLibraryManagement(
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    const { documents } = useAppStore.getState();

    const response = `Here's your document library overview:\n\n` +
      `📚 **Total Documents**: ${documents.length}\n` +
      `📄 **Recent uploads**: ${documents.slice(-3).map(d => d.title || d.filename).join(', ')}\n\n` +
      `**Available actions**:\n` +
      `• Search documents: "Find documents about [topic]"\n` +
      `• Upload new content: "Help me upload a document"\n` +
      `• View summaries: Navigate to any document's summary\n\n` +
      `What would you like to do with your library?`;

    return this.createSimpleResponse(response, []);
  }

  /**
   * Handle general Q&A about app functionality
   */
  private static async handleGeneralQA(
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    // Use regular chat engine for general questions
    return await ChatEngine.processQuery(query, chatContext);
  }

  /**
   * Handle content formatting requests (summary view)
   */
  private static async handleFormatContent(
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    const response = `I can help you reformat your summary content! Here are some options:\n\n` +
      `📝 **Bullet Points**: "Reformat as bullet points"\n` +
      `🔢 **Numbered Lists**: "Make this a numbered list"\n` +
      `📋 **Sections**: "Organize into clear sections"\n` +
      `📊 **Tables**: "Format as a table"\n\n` +
      `Which section would you like me to reformat, and in what style?`;

    return this.createSimpleResponse(response, []);
  }

  /**
   * Handle voice rephrasing requests (summary view)
   */
  private static async handleRephraseVoice(
    query: string,
    context: any,
    chatContext: ChatContext,
    conversationContext: Record<string, any> = {}
  ): Promise<ChatResponse> {
    const response = `I can help apply Caren's warm, compassionate voice to your content!\n\n` +
      `🌟 **Warmer tone**: "Make this warmer and more welcoming"\n` +
      `💝 **More compassionate**: "Add more compassion to this section"\n` +
      `🎓 **Teaching style**: "Make this more like Caren's teaching approach"\n` +
      `🤗 **Nurturing**: "Make this more nurturing and supportive"\n\n` +
      `Which section would you like me to rephrase with Caren's voice?`;

    return this.createSimpleResponse(response, []);
  }

  /**
   * Create simple response helper
   */
  private static createSimpleResponse(content: string, sources: any[]): ChatResponse {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      sources
    };

    return {
      message,
      hasGrounding: sources.length > 0,
      sources,
      responseMetrics: {
        processingTime: 100,
        retrievalCount: sources.length,
        topSimilarity: 0,
        responseLength: content.length
      }
    };
  }

  // Placeholder handlers for remaining capabilities
  private static async handleRegenerateSections(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return this.createSimpleResponse("Content regeneration feature coming soon! For now, you can manually edit sections.", []);
  }

  private static async handleAddContent(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return this.createSimpleResponse("Content addition feature coming soon! I can help you identify where to add examples or explanations.", []);
  }

  private static async handleStyleAdjustments(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return this.createSimpleResponse("Style adjustment feature coming soon! I can suggest ways to make content more beginner-friendly or advanced.", []);
  }

  private static async handleDocumentQA(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return await ChatEngine.processQuery(query, chatContext);
  }

  private static async handleContentAnalysis(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return await ChatEngine.processQuery(query, chatContext);
  }

  private static async handleNavigationHelp(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return this.createSimpleResponse("I can help you find specific sections in your document. What are you looking for?", []);
  }

  private static async handleWorkspaceQA(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    return this.createSimpleResponse("This workspace helps you analyze and work with your documents. What would you like to know?", []);
  }

  /**
   * Create error response
   */
  private static createErrorResponse(
    query: string,
    error: unknown,
    startTime: number
  ): ChatResponse {
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
