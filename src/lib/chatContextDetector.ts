/**
 * Chat Context Detector - Determines chat context and capabilities based on current location
 * Enables context-aware chat functionality without UI changes
 */

import type { Document, ABSummaryPair, StyleGuide } from '../types';

export type ChatLocation = 'main' | 'summary' | 'document' | 'workspace';

export interface ChatCapability {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  handler: string; // Handler function name
}

export interface ChatContext {
  location: ChatLocation;
  capabilities: ChatCapability[];
  availableDocuments: Document[];
  currentDocument?: Document;
  currentSummary?: ABSummaryPair;
  styleGuide?: StyleGuide;
  metadata: Record<string, any>;
}

export class ChatContextDetector {

  /**
   * Detect current chat context based on URL and available data
   */
  static detectContext(
    pathname: string,
    documents: Document[],
    summaries: ABSummaryPair[],
    selectedDocument?: Document,
    styleGuide?: StyleGuide
  ): ChatContext {
    const location = this.detectLocation(pathname);
    const capabilities = this.getCapabilitiesForLocation(location);

    // Find current summary if we're in summary view
    let currentSummary: ABSummaryPair | undefined;
    if (location === 'summary' && pathname.includes('/summary/')) {
      const documentId = pathname.split('/summary/')[1];
      currentSummary = summaries.find(s => s.documentId === documentId);
    }

    return {
      location,
      capabilities,
      availableDocuments: documents,
      currentDocument: selectedDocument,
      currentSummary,
      styleGuide,
      metadata: {
        pathname,
        hasDocuments: documents.length > 0,
        hasSummaries: summaries.length > 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Detect location based on URL pathname
   */
  private static detectLocation(pathname: string): ChatLocation {
    if (pathname.includes('/summary/')) {
      return 'summary';
    }
    if (pathname.includes('/document/') || pathname.includes('/workspace/')) {
      return 'document';
    }
    if (pathname.includes('/workspace')) {
      return 'workspace';
    }
    return 'main';
  }

  /**
   * Get available capabilities for each location
   */
  private static getCapabilitiesForLocation(location: ChatLocation): ChatCapability[] {
    const capabilities: Record<ChatLocation, ChatCapability[]> = {
      main: [
        {
          id: 'document-search',
          name: 'Document Search',
          description: 'Search across all uploaded documents',
          keywords: ['search', 'find', 'look for', 'documents about', 'show me'],
          handler: 'handleDocumentSearch'
        },
        {
          id: 'upload-help',
          name: 'Upload Assistance',
          description: 'Help with uploading and organizing documents',
          keywords: ['upload', 'add document', 'how to upload', 'drag and drop'],
          handler: 'handleUploadHelp'
        },
        {
          id: 'library-management',
          name: 'Library Management',
          description: 'Organize and manage document library',
          keywords: ['organize', 'manage', 'library', 'documents', 'collection'],
          handler: 'handleLibraryManagement'
        },
        {
          id: 'general-qa',
          name: 'General Q&A',
          description: 'Answer questions about app functionality',
          keywords: ['how', 'what', 'why', 'help', 'explain'],
          handler: 'handleGeneralQA'
        }
      ],

      summary: [
        {
          id: 'format-content',
          name: 'Format Content',
          description: 'Reformat summary sections (bullets, numbers, etc.)',
          keywords: ['format', 'bullet points', 'numbered list', 'reformat', 'organize'],
          handler: 'handleFormatContent'
        },
        {
          id: 'rephrase-voice',
          name: 'Rephrase with Voice',
          description: 'Apply Caren\'s voice or adjust tone',
          keywords: ['warmer', 'caren\'s voice', 'rephrase', 'tone', 'compassionate'],
          handler: 'handleRephraseVoice'
        },
        {
          id: 'regenerate-sections',
          name: 'Regenerate Sections',
          description: 'Regenerate specific summary sections',
          keywords: ['regenerate', 'rewrite', 'redo', 'synopsis', 'takeaways'],
          handler: 'handleRegenerateSections'
        },
        {
          id: 'add-content',
          name: 'Add Content',
          description: 'Add examples, explanations, or expand sections',
          keywords: ['add examples', 'expand', 'more detail', 'explain further'],
          handler: 'handleAddContent'
        },
        {
          id: 'style-adjustments',
          name: 'Style Adjustments',
          description: 'Adjust style for different audiences',
          keywords: ['beginner friendly', 'simplify', 'advanced', 'technical'],
          handler: 'handleStyleAdjustments'
        }
      ],

      document: [
        {
          id: 'document-qa',
          name: 'Document Q&A',
          description: 'Answer questions about specific document content',
          keywords: ['what', 'how', 'explain', 'tell me about', 'summarize'],
          handler: 'handleDocumentQA'
        },
        {
          id: 'content-analysis',
          name: 'Content Analysis',
          description: 'Analyze themes, topics, and key points',
          keywords: ['themes', 'main points', 'analysis', 'key topics'],
          handler: 'handleContentAnalysis'
        },
        {
          id: 'navigation-help',
          name: 'Navigation Help',
          description: 'Help find specific sections or content',
          keywords: ['find', 'locate', 'section about', 'where is'],
          handler: 'handleNavigationHelp'
        }
      ],

      workspace: [
        {
          id: 'workspace-qa',
          name: 'Workspace Q&A',
          description: 'Help with workspace functionality',
          keywords: ['how to', 'workspace', 'tools', 'features'],
          handler: 'handleWorkspaceQA'
        }
      ]
    };

    return capabilities[location] || [];
  }

  /**
   * Detect user intent from message content with conversation awareness
   */
  static detectIntent(
    message: string,
    context: ChatContext,
    conversationHistory?: any[]
  ): {
    capability: ChatCapability | null;
    confidence: number;
    extractedParams: Record<string, any>;
    conversationContext: Record<string, any>;
  } {
    const lowerMessage = message.toLowerCase();
    let bestMatch: ChatCapability | null = null;
    let bestScore = 0;
    let extractedParams: Record<string, any> = {};
    let conversationContext: Record<string, any> = {};

    // Analyze conversation context for follow-up responses
    if (conversationHistory && conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];

      // Check for agreement/confirmation words
      const agreementWords = ['yes', 'yeah', 'sure', 'ok', 'okay', 'please', 'go ahead', 'that sounds good'];
      const isAgreement = agreementWords.some(word => lowerMessage.includes(word));

      // Check for follow-up context
      if (isAgreement && lastMessage.role === 'assistant') {
        conversationContext = {
          isFollowUp: true,
          lastAssistantMessage: lastMessage.content,
          agreementDetected: true,
          previousContext: this.extractActionFromMessage(lastMessage.content)
        };

        // If this looks like agreement to a previous suggestion, boost confidence
        if (conversationContext.previousContext) {
          bestScore = 0.8; // High confidence for follow-ups
          bestMatch = this.getCapabilityFromPreviousContext(conversationContext.previousContext, context);
        }
      }
    }

    // If no conversation context match, do regular keyword matching
    if (bestScore === 0) {
      for (const capability of context.capabilities) {
        let score = 0;
        const matchedKeywords: string[] = [];

        for (const keyword of capability.keywords) {
          if (lowerMessage.includes(keyword.toLowerCase())) {
            score += 1;
            matchedKeywords.push(keyword);
          }
        }

        // Boost score for exact matches
        if (score > 0) {
          score = score / capability.keywords.length;

          if (score > bestScore) {
            bestScore = score;
            bestMatch = capability;
            extractedParams = {
              matchedKeywords,
              originalMessage: message,
              context: context.location
            };
          }
        }
      }
    }

    return {
      capability: bestMatch,
      confidence: bestScore,
      extractedParams,
      conversationContext
    };
  }

  /**
   * Extract actionable context from assistant messages
   */
  private static extractActionFromMessage(message: string): any {
    const lowerMessage = message.toLowerCase();

    // Look for specific action suggestions in the message
    if (lowerMessage.includes('upload') || lowerMessage.includes('drag')) {
      return { action: 'upload-help', type: 'guidance' };
    }
    if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return { action: 'document-search', type: 'search' };
    }
    if (lowerMessage.includes('documents') && lowerMessage.includes('found')) {
      return { action: 'document-search', type: 'results' };
    }
    if (lowerMessage.includes('library') || lowerMessage.includes('organize')) {
      return { action: 'library-management', type: 'overview' };
    }

    return null;
  }

  /**
   * Get capability based on previous conversation context
   */
  private static getCapabilityFromPreviousContext(previousContext: any, context: ChatContext): ChatCapability | null {
    const actionMap: Record<string, string> = {
      'upload-help': 'upload-help',
      'document-search': 'document-search',
      'library-management': 'library-management'
    };

    const targetId = actionMap[previousContext.action];
    return context.capabilities.find(cap => cap.id === targetId) || null;
  }

  /**
   * Get contextual suggestions based on current location and available data
   */
  static getContextualSuggestions(context: ChatContext): string[] {
    const suggestions: Record<ChatLocation, string[]> = {
      main: [
        "Show me all my documents",
        "Help me upload a new document",
        "Search for documents about meditation",
        "How do I organize my library?"
      ],

      summary: [
        "Make this synopsis warmer",
        "Reformat key takeaways as bullet points",
        "Add practical examples to the techniques",
        "Regenerate this for beginners"
      ],

      document: [
        "What are the main themes in this document?",
        "Summarize the key techniques mentioned",
        "Find the section about breathing",
        "What action items are recommended?"
      ],

      workspace: [
        "How do I use this workspace?",
        "What tools are available here?",
        "Help me get started"
      ]
    };

    const baseSuggestions = suggestions[context.location] || [];

    // Customize suggestions based on available data
    const customSuggestions: string[] = [];

    if (context.location === 'main' && context.availableDocuments.length === 0) {
      customSuggestions.push("Help me upload my first document");
    }

    if (context.location === 'summary' && context.currentSummary) {
      customSuggestions.push(`Improve the ${context.currentSummary.documentTitle} summary`);
    }

    return [...customSuggestions, ...baseSuggestions].slice(0, 4);
  }
}
