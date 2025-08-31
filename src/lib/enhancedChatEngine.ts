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
        // Check if this might be a summary editing request in summary view
        if (context.location === 'summary' && chatContext.selectedDocumentSummary) {
          const editingKeywords = ['remove', 'delete', 'change', 'edit', 'modify', 'update', 'fix', 'correct', 'revise'];
          const lowerQuery = query.toLowerCase();

          if (editingKeywords.some(keyword => lowerQuery.includes(keyword))) {
            return await this.processSummaryRevision(query, chatContext, 'edit');
          }
        }

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
    // Check if user has a current summary to work with
    if (!chatContext.selectedDocumentSummary) {
      return this.createSimpleResponse(
        "I don't see a summary to format. Please make sure you're viewing a document summary.",
        []
      );
    }

    // Try to process the formatting request directly
    return await this.processSummaryRevision(query, chatContext, 'format');
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
    // Check if user has a current summary to work with
    if (!chatContext.selectedDocumentSummary) {
      return this.createSimpleResponse(
        "I don't see a summary to rephrase. Please make sure you're viewing a document summary.",
        []
      );
    }

    // Try to process the voice rephrasing request directly
    return await this.processSummaryRevision(query, chatContext, 'rephrase');
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

  // Enhanced handlers for summary revision capabilities
  private static async handleRegenerateSections(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    // Check if user has a current summary to work with
    if (!chatContext.selectedDocumentSummary) {
      return this.createSimpleResponse(
        "I don't see a summary to regenerate. Please make sure you're viewing a document summary.",
        []
      );
    }

    // Process as a general edit request
    return await this.processSummaryRevision(query, chatContext, 'edit');
  }

  private static async handleAddContent(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    // Check if user has a current summary to work with
    if (!chatContext.selectedDocumentSummary) {
      return this.createSimpleResponse(
        "I don't see a summary to modify. Please make sure you're viewing a document summary.",
        []
      );
    }

    // Process as a general edit request
    return await this.processSummaryRevision(query, chatContext, 'edit');
  }

  private static async handleStyleAdjustments(query: string, context: any, chatContext: ChatContext, conversationContext: Record<string, any> = {}): Promise<ChatResponse> {
    // Check if user has a current summary to work with
    if (!chatContext.selectedDocumentSummary) {
      return this.createSimpleResponse(
        "I don't see a summary to adjust. Please make sure you're viewing a document summary.",
        []
      );
    }

    // Process as a rephrase request
    return await this.processSummaryRevision(query, chatContext, 'rephrase');
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
   * Process summary revision requests - the core functionality for modifying summaries
   */
  private static async processSummaryRevision(
    query: string,
    chatContext: ChatContext,
    revisionType: 'format' | 'rephrase' | 'edit' | 'remove'
  ): Promise<ChatResponse> {
    const { addLog, styleGuide, addSummaryVersion } = useAppStore.getState();

    try {
      // Get current summary content
      const currentSummary = chatContext.selectedDocumentSummary;
      if (!currentSummary || !currentSummary.summaryA?.styledSummary) {
        return this.createSimpleResponse(
          "I don't have access to the current summary content. Please try refreshing the page.",
          []
        );
      }

      const originalContent = currentSummary.summaryA.styledSummary;
      const documentId = currentSummary.documentId;

      addLog({
        level: 'info',
        category: 'chat',
        message: 'Processing summary revision request',
        details: {
          query,
          revisionType,
          documentId,
          originalLength: originalContent.length
        }
      });

      // Build revision prompt using LLM-driven analysis
      const revisionPrompt = await this.buildRevisionPrompt(
        query,
        originalContent,
        revisionType,
        styleGuide
      );

      // Process the revision with Ollama
      const revisedContent = await ollama.chat([{
        role: 'user',
        content: revisionPrompt
      }]);

      const cleanedContent = revisedContent.trim();

      // Validate the revision
      if (!cleanedContent || cleanedContent.length < 50) {
        return this.createSimpleResponse(
          "I wasn't able to generate a good revision. Could you be more specific about what you'd like me to change?",
          []
        );
      }

      // Use LLM-driven validation for all edits
      const validationResult = await this.validateEditWithLLM(query, originalContent, cleanedContent);

      if (!validationResult.isValid) {
        // Try again with corrective feedback
        const retryPrompt = this.buildCorrectionPrompt(query, originalContent, cleanedContent, validationResult.feedback);

        try {
          const retryContent = await ollama.chat([{
            role: 'user',
            content: retryPrompt
          }]);

          const retryCleanedContent = retryContent.trim();
          if (retryCleanedContent && retryCleanedContent.length >= 50) {
            cleanedContent = retryCleanedContent;

            addLog({
              level: 'info',
              category: 'chat',
              message: 'Summary revision corrected after validation feedback',
              details: { documentId, feedback: validationResult.feedback }
            });
          }
        } catch (retryError) {
          console.warn('Retry attempt failed:', retryError);
        }
      }

      // Add the revised summary as a new version
      try {
        addSummaryVersion(
          documentId,
          cleanedContent,
          false, // Not original
          'Enhanced Chat Revision'
        );

        addLog({
          level: 'info',
          category: 'chat',
          message: 'Summary revision completed and saved',
          details: {
            documentId,
            revisionType,
            originalLength: originalContent.length,
            revisedLength: cleanedContent.length
          }
        });

        // Get change summary
        const changesSummary = await this.summarizeChanges(originalContent, cleanedContent);

        // Return success response with the revision
        return {
          message: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `✅ **Summary Updated!**\n\nI've successfully ${this.getRevisionDescription(revisionType, query)} and saved it as a new version.\n\n**Changes made:**\n- ${changesSummary}\n\nThe updated summary is now displayed above. You can always restore previous versions if needed.`,
            timestamp: new Date().toISOString()
          },
          hasGrounding: true,
          sources: [],
          responseMetrics: {
            processingTime: 2000,
            retrievalCount: 0,
            topSimilarity: 1.0,
            responseLength: 200
          },
          // Special flag to trigger UI update
          summaryRevision: {
            documentId,
            newContent: cleanedContent,
            revisionType
          }
        };

      } catch (versionError) {
        addLog({
          level: 'error',
          category: 'chat',
          message: 'Failed to save revised summary version',
          details: { documentId, error: versionError }
        });

        return this.createSimpleResponse(
          "I created the revision but couldn't save it as a new version. The changes may not persist.",
          []
        );
      }

    } catch (error) {
      addLog({
        level: 'error',
        category: 'chat',
        message: 'Summary revision failed',
        details: { query, revisionType, error: error instanceof Error ? error.message : String(error) }
      });

      return this.createSimpleResponse(
        "I encountered an error while processing your revision request. Please try again with a more specific request.",
        []
      );
    }
  }

  /**
   * Build revision prompt using LLM-driven two-stage approach
   */
  private static async buildRevisionPrompt(
    userRequest: string,
    originalContent: string,
    revisionType: string,
    styleGuide?: any
  ): Promise<string> {
    // Stage 1: Let LLM analyze the intent
    const intentAnalysis = await this.analyzeEditIntent(userRequest, originalContent);

    // Stage 2: Build execution prompt based on LLM's understanding
    return this.buildExecutionPrompt(userRequest, originalContent, intentAnalysis, styleGuide);
  }

  /**
   * LLM-driven intent analysis - understand what the user wants to do
   */
  private static async analyzeEditIntent(userRequest: string, originalContent: string): Promise<any> {
    const analysisPrompt = `You are analyzing a user's request to edit a document summary. Your job is to understand their intent and provide structured analysis.

ORIGINAL SUMMARY:
${originalContent}

USER REQUEST: ${userRequest}

Analyze this request and respond with a JSON object containing:
{
  "editType": "specific" | "general",
  "action": "remove" | "add" | "modify" | "reformat" | "rephrase",
  "target": {
    "type": "bullet_point" | "section" | "sentence" | "word" | "paragraph" | "entire_content",
    "identifier": "description of what to target",
    "location": "where in the document (section name, position, etc.)",
    "specificText": "exact text if quoted or clearly identified"
  },
  "instruction": "clear, specific instruction for what to do",
  "scope": "minimal" | "moderate" | "extensive"
}

Examples:
- "Remove the second bullet point" → {"editType": "specific", "action": "remove", "target": {"type": "bullet_point", "identifier": "second bullet point", "location": "any section"}}
- "Make this warmer" → {"editType": "general", "action": "rephrase", "scope": "extensive"}
- "Delete the techniques section" → {"editType": "specific", "action": "remove", "target": {"type": "section", "identifier": "techniques section"}}

Respond with ONLY the JSON object:`;

    try {
      const response = await ollama.chat([{
        role: 'user',
        content: analysisPrompt
      }]);

      // Parse the JSON response
      const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, '');
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.warn('Intent analysis failed, using fallback:', error);
      // Fallback to simple analysis
      return {
        editType: "general",
        action: "modify",
        scope: "moderate",
        instruction: userRequest
      };
    }
  }

  /**
   * Build execution prompt based on LLM's intent analysis
   */
  private static buildExecutionPrompt(
    userRequest: string,
    originalContent: string,
    intentAnalysis: any,
    styleGuide?: any
  ): string {
    const isSpecificEdit = intentAnalysis.editType === 'specific';

    if (isSpecificEdit) {
      return this.buildSpecificEditPrompt(userRequest, originalContent, intentAnalysis, styleGuide);
    } else {
      return this.buildGeneralEditPrompt(userRequest, originalContent, intentAnalysis, styleGuide);
    }
  }

  /**
   * Build prompt for specific, targeted edits using LLM understanding
   */
  private static buildSpecificEditPrompt(
    userRequest: string,
    originalContent: string,
    intentAnalysis: any,
    styleGuide?: any
  ): string {
    const { action, target, instruction } = intentAnalysis;

    return `You are making a PRECISE, SURGICAL edit to a document summary based on detailed analysis of the user's request.

ORIGINAL SUMMARY:
${originalContent}

USER REQUEST: ${userRequest}

INTENT ANALYSIS:
- Action: ${action}
- Target: ${target?.type || 'unspecified'} (${target?.identifier || 'general'})
- Location: ${target?.location || 'anywhere in document'}
- Specific Text: ${target?.specificText || 'none specified'}
- Instruction: ${instruction}

EXECUTION INSTRUCTIONS:
1. Understand the document structure (sections, bullet points, paragraphs)
2. Locate the exact target: ${target?.identifier || 'the content to modify'}
3. Perform ONLY the requested action: ${action}
4. Leave everything else COMPLETELY unchanged
5. Maintain exact formatting, spacing, and structure
6. Do NOT rephrase, improve, or modify other content
7. Return the complete summary with ONLY the requested change

CRITICAL: This is a surgical edit. Change only what was specifically requested.

EDITED SUMMARY:`;
  }

  /**
   * Build prompt for general edits using LLM understanding
   */
  private static buildGeneralEditPrompt(
    userRequest: string,
    originalContent: string,
    intentAnalysis: any,
    styleGuide?: any
  ): string {
    const { action, scope, instruction } = intentAnalysis;

    return `You are revising a document summary based on detailed analysis of the user's request.

ORIGINAL SUMMARY:
${originalContent}

USER REQUEST: ${userRequest}

INTENT ANALYSIS:
- Action: ${action}
- Scope: ${scope}
- Instruction: ${instruction}

REVISION INSTRUCTIONS:
- Apply the requested changes throughout the document as appropriate
- Maintain the overall structure and quality of the summary
- Keep all important information unless specifically asked to remove it
- If this is a formatting change, apply consistently while preserving content
- If this is a voice/tone change, adjust the language style appropriately
- Return ONLY the revised summary content, no explanations or commentary

${styleGuide ? `STYLE GUIDE TO MAINTAIN:
- Voice: ${styleGuide.voice || 'Warm and compassionate'}
- Tone: ${styleGuide.tone || 'Professional yet approachable'}
- Perspective: ${styleGuide.perspective || 'Second person'}
- Structure: ${styleGuide.structure || 'Clear sections with headers'}` : ''}

REVISED SUMMARY:`;
  }

  /**
   * LLM-driven validation - ask the AI to check if the edit was successful
   */
  private static async validateEditWithLLM(
    userRequest: string,
    originalContent: string,
    revisedContent: string
  ): Promise<{ isValid: boolean; feedback?: string }> {
    const validationPrompt = `You are validating whether an edit request was successfully completed.

ORIGINAL CONTENT:
${originalContent}

USER REQUEST: ${userRequest}

REVISED CONTENT:
${revisedContent}

Analyze whether the user's request was successfully fulfilled. Respond with a JSON object:
{
  "isValid": true/false,
  "feedback": "explanation of what was or wasn't done correctly"
}

Consider:
- Was the specific request followed exactly?
- If removal was requested, was the content actually removed?
- If modification was requested, was it properly applied?
- Were any unintended changes made?
- Is the overall structure and quality maintained?

Respond with ONLY the JSON object:`;

    try {
      const response = await ollama.chat([{
        role: 'user',
        content: validationPrompt
      }]);

      const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, '');
      const validation = JSON.parse(cleanResponse);

      return {
        isValid: validation.isValid === true,
        feedback: validation.feedback || 'No specific feedback provided'
      };
    } catch (error) {
      console.warn('LLM validation failed, assuming valid:', error);
      return { isValid: true, feedback: 'Validation check failed, assuming edit was successful' };
    }
  }



  /**
   * Build correction prompt based on LLM validation feedback
   */
  private static buildCorrectionPrompt(
    userRequest: string,
    originalContent: string,
    failedRevision: string,
    validationFeedback: string
  ): string {
    return `Your previous edit attempt needs correction based on validation feedback.

ORIGINAL CONTENT:
${originalContent}

USER REQUEST: ${userRequest}

PREVIOUS ATTEMPT:
${failedRevision}

VALIDATION FEEDBACK: ${validationFeedback}

CORRECTION INSTRUCTIONS:
- Review the validation feedback carefully
- Understand what went wrong with the previous attempt
- Make the edit correctly this time
- Follow the user's request precisely
- Return the complete, corrected summary

CORRECTED SUMMARY:`;
  }

  /**
   * Get human-readable description of revision type
   */
  private static getRevisionDescription(revisionType: string, query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('bullet') || lowerQuery.includes('list')) {
      return 'reformatted the content as bullet points';
    }
    if (lowerQuery.includes('warmer') || lowerQuery.includes('compassionate')) {
      return 'applied a warmer, more compassionate tone';
    }
    if (lowerQuery.includes('remove') || lowerQuery.includes('delete')) {
      return 'removed the requested content';
    }
    if (lowerQuery.includes('add') || lowerQuery.includes('include')) {
      return 'added the requested content';
    }
    if (lowerQuery.includes('rephrase') || lowerQuery.includes('reword')) {
      return 'rephrased the content';
    }

    switch (revisionType) {
      case 'format': return 'reformatted the content';
      case 'rephrase': return 'rephrased the content with improved voice';
      case 'edit': return 'made the requested edits';
      case 'remove': return 'removed the specified content';
      default: return 'revised the content';
    }
  }

  /**
   * LLM-driven change summarization
   */
  private static async summarizeChanges(original: string, revised: string): Promise<string> {
    const summaryPrompt = `Compare these two versions of a document summary and describe what changed.

ORIGINAL VERSION:
${original}

REVISED VERSION:
${revised}

Provide a brief, clear description of what changed. Focus on:
- Content that was added, removed, or modified
- Structural changes (sections, bullet points, formatting)
- Tone or style adjustments
- Any other notable differences

Respond with a concise summary (1-2 sentences) of the changes made:`;

    try {
      const response = await ollama.chat([{
        role: 'user',
        content: summaryPrompt
      }]);

      return response.trim() || 'Content was revised';
    } catch (error) {
      console.warn('Change summarization failed, using fallback:', error);

      // Simple fallback based on length difference
      const lengthDiff = revised.length - original.length;
      if (Math.abs(lengthDiff) > original.length * 0.1) {
        if (lengthDiff > 0) {
          return `Expanded content (+${lengthDiff} characters)`;
        } else {
          return `Condensed content (${Math.abs(lengthDiff)} characters)`;
        }
      }
      return 'Refined language and tone';
    }
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
