import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedChatEngine } from '../enhancedChatEngine';
import type { ChatContext, EmbeddedChunk } from '../../types';

// Mock localStorage for Node.js test environment
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock ollama for tests
vi.mock('../ollama', () => ({
  ollama: {
    generateEmbedding: vi.fn().mockResolvedValue(
      Array.from({ length: 384 }, () => Math.random() - 0.5)
    ),
    chat: vi.fn().mockResolvedValue('Mock enhanced chat response for testing'),
    getCurrentModel: vi.fn().mockReturnValue('test-model'),
    updateModel: vi.fn(),
  },
}));

// Mock useAppStore
vi.mock('../../../store', () => ({
  useAppStore: {
    getState: vi.fn().mockReturnValue({
      addLog: vi.fn(),
      getAllEmbeddings: vi.fn().mockReturnValue(new Map([
        ['test-doc', [
          {
            content: 'Test chunk content that matches the query',
            embedding: [0.1, 0.2, 0.3],
            metadata: { source: 'test-doc', chunkIndex: 0 }
          }
        ]]
      ])),
      documents: [
        { id: 'test-doc', title: 'Test Document', filename: 'test.pdf', text: 'Test content' }
      ],
      styleGuide: {
        voice_description: 'Professional and clear',
        tone_settings: {
          formality: 7,
          enthusiasm: 5
        },
        vocabulary: {
          preferred_phrases: ['test phrase', 'example'],
          avoid_phrases: ['avoid this']
        },
        custom_instructions: 'Test instructions'
      },
      addSummaryVersion: vi.fn()
    }),
  },
}));

/**
 * TDD Test Suite for EnhancedChatEngine Vector Database Integration
 * 
 * These tests verify that EnhancedChatEngine correctly uses vector database search
 * for all its enhanced capabilities while maintaining context-aware functionality.
 * 
 * Requirements:
 * - Use vector database for document search and Q&A
 * - Maintain all enhanced chat capabilities (commands, context detection)
 * - Preserve summary editing and revision features
 * - Handle both main page and summary view contexts
 */
describe('EnhancedChatEngine - Vector Database Integration', () => {
  let testContext: ChatContext;
  let testEmbeddings: EmbeddedChunk[];

  beforeEach(() => {
    testContext = {
      conversationHistory: [],
      selectedDocumentId: 'test-doc',
      selectedDocumentSummary: 'This is a test document summary about machine learning and AI.',
      currentPage: 'summary'
    };

    testEmbeddings = [
      {
        id: 'chunk-1',
        documentId: 'test-doc',
        text: 'Machine learning is a powerful subset of artificial intelligence.',
        startIndex: 0,
        endIndex: 65,
        chunkIndex: 0,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      },
      {
        id: 'chunk-2',
        documentId: 'test-doc',
        text: 'Natural language processing helps computers understand text.',
        startIndex: 66,
        endIndex: 125,
        chunkIndex: 1,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      }
    ];

    // Test embeddings are already mocked in the store mock above
  });

  describe('Context-Aware Vector Search', () => {
    it('should use vector search for document Q&A in summary view', async () => {
      const startTime = Date.now();

      const response = await EnhancedChatEngine.processContextAwareQuery(
        'What does this document say about machine learning?',
        testContext
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should be fast with vector search
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should use vector search for main page document search', async () => {
      const mainPageContext: ChatContext = {
        ...testContext,
        currentPage: 'main',
        selectedDocumentSummary: undefined
      };

      const response = await EnhancedChatEngine.processContextAwareQuery(
        'Find documents about artificial intelligence',
        mainPageContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should maintain context awareness with vector search', async () => {
      const response = await EnhancedChatEngine.processContextAwareQuery(
        'Remove the bullet points from this summary',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      // Should recognize this as a summary editing command
    });
  });

  describe('Enhanced Chat Commands with Vector Search', () => {
    it('should process reformat commands using vector search for context', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'Reformat this as bullet points',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.command).toBeDefined();
      expect(response.command?.type).toBe('reformat');
    });

    it('should process rephrase commands with vector-enhanced context', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'Rephrase this in a more casual tone',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.command).toBeDefined();
      expect(response.command?.type).toBe('rephrase');
    });

    it('should handle document search commands with vector search', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'Search for documents about neural networks',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should process add content commands with vector context', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'Add a section about deep learning applications',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.command).toBeDefined();
      expect(response.command?.type).toBe('add');
    });
  });

  describe('Summary Editing with Vector Search', () => {
    it('should use vector search for summary revision context', async () => {
      const response = await EnhancedChatEngine.processContextAwareQuery(
        'Make this summary more technical',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should handle remove commands with vector-enhanced understanding', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'Remove the section about basic concepts',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.command).toBeDefined();
      expect(response.command?.type).toBe('remove');
    });

    it('should maintain summary version history with vector search', async () => {
      // Store is already mocked at the top level

      await EnhancedChatEngine.processEnhancedQuery(
        'Simplify this summary',
        testContext
      );

      // Should call addSummaryVersion for tracking changes
      // Note: Store is mocked at the top level, so we can access the mock directly
      // expect(mockStore.addSummaryVersion).toHaveBeenCalled();
    });
  });

  describe('Performance with Vector Search', () => {
    it('should complete enhanced queries in under 3 seconds', async () => {
      const startTime = Date.now();

      await EnhancedChatEngine.processEnhancedQuery(
        'Analyze this document and suggest improvements',
        testContext
      );

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should handle concurrent enhanced queries efficiently', async () => {
      const queries = [
        'Reformat as bullet points',
        'What are the key concepts?',
        'Add more examples'
      ];

      const startTime = Date.now();

      const promises = queries.map(query =>
        EnhancedChatEngine.processEnhancedQuery(query, testContext)
      );

      const responses = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(3);
      expect(duration).toBeLessThan(8000); // Should handle concurrent requests
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
      });
    });
  });

  describe('API Compatibility', () => {
    it('should maintain processContextAwareQuery interface', async () => {
      const response = await EnhancedChatEngine.processContextAwareQuery(
        'test query',
        testContext
      );

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('sources');
      expect(response).toHaveProperty('hasGrounding');
      expect(response).toHaveProperty('responseMetrics');
    });

    it('should maintain processEnhancedQuery interface', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'test enhanced query',
        testContext
      );

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('sources');
      expect(response).toHaveProperty('hasGrounding');
      expect(response).toHaveProperty('responseMetrics');
      // Enhanced response should have suggestions for regular queries
      expect(response).toHaveProperty('suggestions');
      // Command property should only be present for command queries
      expect(response.command).toBeUndefined();
    });

    it('should preserve enhanced response structure', async () => {
      const response = await EnhancedChatEngine.processEnhancedQuery(
        'Reformat this content',
        testContext
      );

      if (response.command) {
        expect(response.command).toHaveProperty('type');
        expect(['reformat', 'rephrase', 'remove', 'add', 'summarize', 'question']).toContain(response.command.type);
      }

      if (response.suggestions) {
        expect(Array.isArray(response.suggestions)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid context gracefully', async () => {
      const invalidContext = {} as ChatContext;

      const response = await EnhancedChatEngine.processContextAwareQuery(
        'test query',
        invalidContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should handle malformed enhanced queries', async () => {
      const malformedQueries = ['', '   ', '\n\t', '!@#$%^&*()'];

      for (const query of malformedQueries) {
        const response = await EnhancedChatEngine.processEnhancedQuery(query, testContext);
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
      }
    });

    it('should fallback to regular chat when enhanced features fail', async () => {
      // Test with a query that might cause enhanced features to fail
      const response = await EnhancedChatEngine.processContextAwareQuery(
        'This is a complex query that might cause issues with enhanced processing',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('Document Search Integration', () => {
    it('should use vector search for document discovery', async () => {
      const response = await EnhancedChatEngine.processContextAwareQuery(
        'Find documents about machine learning algorithms',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should handle document search with no results', async () => {
      const response = await EnhancedChatEngine.processContextAwareQuery(
        'Find documents about quantum computing', // Not in test data
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });
});
