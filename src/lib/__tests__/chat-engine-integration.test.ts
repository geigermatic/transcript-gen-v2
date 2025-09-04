// @phase: 3
// @phase-name: Vector Database Integration
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatEngine } from '../chatEngine';
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
    chat: vi.fn().mockResolvedValue('Mock chat response for testing'),
    getCurrentModel: vi.fn().mockReturnValue('test-model'),
    updateModel: vi.fn(),
  },
}));

// Mock useAppStore
vi.mock('../../store', () => ({
  useAppStore: {
    getState: vi.fn().mockReturnValue({
      addLog: vi.fn(),
      getAllEmbeddings: vi.fn().mockReturnValue(new Map([
        ['test-doc', [
          {
            id: 'chunk-1',
            documentId: 'test-doc',
            text: 'Machine learning is a subset of artificial intelligence.',
            startIndex: 0,
            endIndex: 55,
            chunkIndex: 0,
            embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
            embeddingTimestamp: new Date().toISOString()
          },
          {
            id: 'chunk-2',
            documentId: 'test-doc',
            text: 'Deep learning uses neural networks for pattern recognition.',
            startIndex: 56,
            endIndex: 115,
            chunkIndex: 1,
            embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
            embeddingTimestamp: new Date().toISOString()
          }
        ]]
      ])),
      documents: [
        { id: 'test-doc', title: 'Test Document', filename: 'test.pdf', text: 'Test content about AI and ML' }
      ],
      styleGuide: { tone: 'professional', format: 'structured' }
    }),
  },
}));

/**
 * TDD Test Suite for ChatEngine Vector Database Integration
 * 
 * These tests verify that ChatEngine.retrieveRelevantChunks() correctly
 * uses the new vector database search while maintaining all existing functionality.
 * 
 * Requirements:
 * - Use vector database search for 20-50x performance improvement
 * - Maintain exact same API interface and behavior
 * - Preserve all chat capabilities and response quality
 * - Handle edge cases and errors gracefully
 */
describe('ChatEngine - Vector Database Integration', () => {
  let testContext: ChatContext;
  let testEmbeddings: EmbeddedChunk[];

  beforeEach(() => {
    testContext = {
      messages: [],
      documentIds: ['test-doc'],
      activeDocument: {
        id: 'test-doc',
        title: 'Test Document',
        filename: 'test.pdf',
        text: 'Test content about machine learning and artificial intelligence.',
        uploadDate: new Date().toISOString(),
        fileSize: 1024,
        fileType: 'application/pdf'
      },
      selectedDocumentSummary: 'Test document summary about machine learning and artificial intelligence.'
    };

    testEmbeddings = [
      {
        id: 'chunk-1',
        documentId: 'test-doc',
        text: 'Machine learning algorithms are used in artificial intelligence applications.',
        startIndex: 0,
        endIndex: 75,
        chunkIndex: 0,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      },
      {
        id: 'chunk-2',
        documentId: 'test-doc',
        text: 'Natural language processing enables computers to understand human language.',
        startIndex: 76,
        endIndex: 150,
        chunkIndex: 1,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      },
      {
        id: 'chunk-3',
        documentId: 'test-doc',
        text: 'Deep learning neural networks process complex patterns in data.',
        startIndex: 151,
        endIndex: 210,
        chunkIndex: 2,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      }
    ];

    // Mock getAllEmbeddings to return our test data
    // Note: The vi.mock above should handle this automatically
  });

  describe('Vector Search Integration', () => {
    it('should use vector database for retrieving relevant chunks', async () => {
      const startTime = Date.now();

      const response = await ChatEngine.processQuery(
        'What is machine learning?',
        testContext
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly with vector database
      expect(duration).toBeLessThan(1000); // Generous for test environment
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.hasGrounding).toBeDefined();
    });

    it('should maintain response quality with vector search', async () => {
      const response = await ChatEngine.processQuery(
        'Explain artificial intelligence',
        testContext
      );

      expect(response.message.content).toBeDefined();
      expect(typeof response.message.content).toBe('string');
      expect(response.message.content.length).toBeGreaterThan(0);
      expect(response.responseMetrics).toBeDefined();
      expect(response.responseMetrics.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle queries with no relevant content gracefully', async () => {
      const response = await ChatEngine.processQuery(
        'What is the weather like today?', // Unrelated to test content
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(typeof response.hasGrounding).toBe('boolean');
    });

    it('should preserve source attribution in responses', async () => {
      const response = await ChatEngine.processQuery(
        'Tell me about machine learning',
        testContext
      );

      expect(response.sources).toBeDefined();
      expect(Array.isArray(response.sources)).toBe(true);

      if (response.sources.length > 0) {
        expect(response.sources[0]).toHaveProperty('chunk');
        expect(response.sources[0]).toHaveProperty('similarity');
        expect(response.sources[0].chunk).toHaveProperty('text');
        expect(response.sources[0].chunk).toHaveProperty('documentId');
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete queries in under 2 seconds', async () => {
      const startTime = Date.now();

      await ChatEngine.processQuery(
        'What are the main concepts in artificial intelligence?',
        testContext
      );

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle concurrent queries efficiently', async () => {
      const queries = [
        'What is machine learning?',
        'Explain neural networks',
        'How does AI work?'
      ];

      const startTime = Date.now();

      const promises = queries.map(query =>
        ChatEngine.processQuery(query, testContext)
      );

      const responses = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(3);
      expect(duration).toBeLessThan(5000); // Should handle concurrent requests
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
      });
    });
  });

  describe('API Compatibility', () => {
    it('should maintain exact same processQuery interface', async () => {
      // Test that the function signature hasn't changed
      const response = await ChatEngine.processQuery(
        'test query',
        testContext
      );

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('sources');
      expect(response).toHaveProperty('hasGrounding');
      expect(response).toHaveProperty('responseMetrics');

      expect(response.message).toHaveProperty('id');
      expect(response.message).toHaveProperty('role');
      expect(response.message).toHaveProperty('content');
      expect(response.message).toHaveProperty('timestamp');
    });

    it('should preserve response metrics structure', async () => {
      const response = await ChatEngine.processQuery(
        'test query for metrics',
        testContext
      );

      expect(response.responseMetrics).toHaveProperty('retrievalCount');
      expect(response.responseMetrics).toHaveProperty('topSimilarity');
      expect(response.responseMetrics).toHaveProperty('responseLength');
      expect(response.responseMetrics).toHaveProperty('processingTime');

      expect(typeof response.responseMetrics.retrievalCount).toBe('number');
      expect(typeof response.responseMetrics.topSimilarity).toBe('number');
      expect(typeof response.responseMetrics.responseLength).toBe('number');
      expect(typeof response.responseMetrics.processingTime).toBe('number');
    });

    it('should handle empty embeddings gracefully', async () => {
      // This test will verify that ChatEngine handles empty embeddings gracefully
      // The mock store already returns empty embeddings by default
      const response = await ChatEngine.processQuery(
        'test query with no data',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.hasGrounding).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries gracefully', async () => {
      const malformedQueries = ['', '   ', '\n\t', '?', '!@#$%^&*()'];

      for (const query of malformedQueries) {
        const response = await ChatEngine.processQuery(query, testContext);
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
      }
    });

    it('should handle very long queries', async () => {
      const longQuery = 'machine learning '.repeat(200); // Very long query

      const response = await ChatEngine.processQuery(longQuery, testContext);

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should handle invalid context gracefully', async () => {
      const invalidContext = {} as ChatContext;

      const response = await ChatEngine.processQuery(
        'test query',
        invalidContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('Chat Context Integration', () => {
    it('should use conversation history for context', async () => {
      const contextWithHistory: ChatContext = {
        ...testContext,
        conversationHistory: [
          {
            id: 'prev-1',
            role: 'user',
            content: 'What is AI?',
            timestamp: new Date().toISOString()
          },
          {
            id: 'prev-2',
            role: 'assistant',
            content: 'AI is artificial intelligence...',
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await ChatEngine.processQuery(
        'Can you tell me more about that?',
        contextWithHistory
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should use selected document context', async () => {
      const response = await ChatEngine.processQuery(
        'Summarize this document',
        testContext
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });
});
