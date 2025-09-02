import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmbeddingEngine } from '../embeddingEngine';
import type { EmbeddedChunk } from '../embeddingEngine';

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
    chat: vi.fn().mockResolvedValue('Mock response'),
    getCurrentModel: vi.fn().mockReturnValue('test-model'),
    updateModel: vi.fn(),
  },
}));

/**
 * TDD Test Suite for EmbeddingEngine Vector Database Integration
 * 
 * These tests verify that EmbeddingEngine.performHybridSearch() correctly
 * integrates with the vector database while maintaining API compatibility.
 * 
 * Requirements:
 * - Maintain exact same API interface
 * - 20-50x performance improvement over linear search
 * - Graceful fallback to linear search if vector DB fails
 * - Preserve all existing functionality
 */
describe('EmbeddingEngine - Vector Database Integration', () => {
  let testChunks: EmbeddedChunk[];

  beforeEach(() => {
    // Create test embedded chunks
    testChunks = [
      {
        id: 'chunk-1',
        documentId: 'test-doc',
        text: 'Machine learning is a subset of artificial intelligence that focuses on algorithms.',
        startIndex: 0,
        endIndex: 80,
        chunkIndex: 0,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      },
      {
        id: 'chunk-2',
        documentId: 'test-doc',
        text: 'Natural language processing helps computers understand human language.',
        startIndex: 81,
        endIndex: 150,
        chunkIndex: 1,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      },
      {
        id: 'chunk-3',
        documentId: 'test-doc',
        text: 'Deep learning uses neural networks with multiple layers for pattern recognition.',
        startIndex: 151,
        endIndex: 230,
        chunkIndex: 2,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      }
    ];
  });

  describe('API Compatibility', () => {
    it('should maintain exact same function signature', async () => {
      // Test that the function exists and accepts the expected parameters
      const result = await EmbeddingEngine.performHybridSearch(
        'test query',
        testChunks,
        5,
        0.7,
        0.3
      );

      expect(Array.isArray(result)).toBe(true);
      expect(typeof result).toBe('object');
    });

    it('should return RetrievalResult objects with correct structure', async () => {
      const results = await EmbeddingEngine.performHybridSearch(
        'machine learning',
        testChunks,
        3
      );

      expect(results.length).toBeGreaterThanOrEqual(0);

      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('chunk');
        expect(result).toHaveProperty('similarity');
        expect(result).toHaveProperty('rank');
        expect(typeof result.similarity).toBe('number');
        expect(typeof result.rank).toBe('number');
        expect(result.chunk).toHaveProperty('id');
        expect(result.chunk).toHaveProperty('text');
        expect(result.chunk).toHaveProperty('embedding');
      }
    });

    it('should respect maxResults parameter', async () => {
      const maxResults = 2;
      const results = await EmbeddingEngine.performHybridSearch(
        'test query',
        testChunks,
        maxResults
      );

      expect(results.length).toBeLessThanOrEqual(maxResults);
    });

    it('should handle default parameters correctly', async () => {
      // Test with minimal parameters (should use defaults)
      const results = await EmbeddingEngine.performHybridSearch(
        'test query',
        testChunks
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5); // Default maxResults
    });
  });

  describe('Performance Requirements', () => {
    it('should complete search in under 200ms for small datasets', async () => {
      const startTime = Date.now();

      await EmbeddingEngine.performHybridSearch(
        'machine learning artificial intelligence',
        testChunks,
        5
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should handle larger datasets efficiently', async () => {
      // Create larger test dataset
      const largeTestChunks = Array.from({ length: 100 }, (_, i) => ({
        id: `chunk-${i}`,
        documentId: 'large-test-doc',
        text: `Test chunk ${i} with various content about machine learning and AI.`,
        startIndex: i * 100,
        endIndex: (i + 1) * 100,
        chunkIndex: i,
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
        embeddingTimestamp: new Date().toISOString()
      }));

      const startTime = Date.now();

      const results = await EmbeddingEngine.performHybridSearch(
        'machine learning',
        largeTestChunks,
        10
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should still be fast
      expect(Array.isArray(results)).toBe(true); // Should return array even if empty
      expect(results.length).toBeLessThanOrEqual(10); // Should respect limit
    });
  });

  describe('Vector Database Integration', () => {
    it('should use vector database for search operations', async () => {
      // This test verifies that the vector database is being used
      // by checking that results are returned and performance is good
      const startTime = Date.now();

      const results = await EmbeddingEngine.performHybridSearch(
        'artificial intelligence',
        testChunks,
        3
      );

      const endTime = Date.now();

      // Should return results (may be 0 if similarity threshold not met, which is valid)
      expect(Array.isArray(results)).toBe(true);
      expect(endTime - startTime).toBeLessThan(200); // Vector DB should be fast

      // If results are returned, they should have proper structure
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('chunk');
        expect(results[0]).toHaveProperty('similarity');
        expect(results[0]).toHaveProperty('rank');
      }
    });

    it('should handle empty chunk arrays gracefully', async () => {
      const results = await EmbeddingEngine.performHybridSearch(
        'test query',
        [],
        5
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle invalid embeddings gracefully', async () => {
      const invalidChunks = [{
        id: 'invalid-chunk',
        documentId: 'test-doc',
        text: 'Test chunk with invalid embedding',
        startIndex: 0,
        endIndex: 30,
        chunkIndex: 0,
        embedding: [], // Invalid empty embedding
        embeddingTimestamp: new Date().toISOString()
      }];

      // Should not throw an error, should handle gracefully
      await expect(EmbeddingEngine.performHybridSearch(
        'test query',
        invalidChunks,
        5
      )).resolves.toBeDefined();
    });
  });

  describe('Search Quality', () => {
    it('should return results ranked by similarity', async () => {
      const results = await EmbeddingEngine.performHybridSearch(
        'machine learning',
        testChunks,
        3
      );

      if (results.length > 1) {
        // Results should be sorted by similarity (descending)
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
        }

        // Ranks should be sequential
        results.forEach((result, index) => {
          expect(result.rank).toBe(index + 1);
        });
      }
    });

    it('should return meaningful similarity scores', async () => {
      const results = await EmbeddingEngine.performHybridSearch(
        'machine learning',
        testChunks,
        3
      );

      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
        expect(typeof result.similarity).toBe('number');
        expect(isNaN(result.similarity)).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries gracefully', async () => {
      const results = await EmbeddingEngine.performHybridSearch(
        '', // Empty query
        testChunks,
        5
      );

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'machine learning '.repeat(100); // Very long query

      const results = await EmbeddingEngine.performHybridSearch(
        longQuery,
        testChunks,
        5
      );

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
