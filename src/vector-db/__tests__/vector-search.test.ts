// @phase: 2
// @phase-name: Advanced Vector Features
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorDatabase } from '../VectorDatabase';
import type { DocumentEmbedding, VectorDatabaseConfig, SearchResult } from '../types';
import { generateTestEmbeddings } from './vector-storage.test';

/**
 * TDD Test Suite for US-004: Basic Vector Search
 * 
 * RED PHASE: These tests will fail initially - this is expected and good!
 * Tests define the interface for vector similarity search before implementation.
 * 
 * Requirements:
 * - Vector search returns ranked results in <200ms
 * - Results ranked by similarity score
 * - Support for multiple distance metrics
 * - Configurable result limits
 * - Accurate similarity scoring
 */
describe('VectorDatabase - US-004: Basic Vector Search', () => {
  let db: VectorDatabase;
  let testEmbeddings: DocumentEmbedding[];

  beforeEach(async () => {
    const config: VectorDatabaseConfig = {
      path: ':memory:',
      vectorDimension: 384,
      indexParams: {
        M: 16,
        efConstruction: 200,
        ef: 100
      }
    };
    db = new VectorDatabase(config);
    await db.initialize();

    // Generate test embeddings for search
    testEmbeddings = generateTestEmbeddings(100);
    await db.insertEmbeddings(testEmbeddings);

    // Build index for search performance
    await db.buildIndex();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Search Performance Requirements', () => {
    it('should return results in <200ms for any query', async () => {
      const queryVector = testEmbeddings[0].vector;

      const startTime = Date.now();
      const results = await db.searchSimilar(queryVector, { limit: 10 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should maintain performance regardless of library size', async () => {
      // Add more embeddings to test scalability
      const largeEmbeddingSet = generateTestEmbeddings(1000);
      await db.insertEmbeddings(largeEmbeddingSet);
      await db.buildIndex(); // Rebuild index with larger dataset

      const queryVector = testEmbeddings[0].vector;

      const startTime = Date.now();
      const results = await db.searchSimilar(queryVector, { limit: 10 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle concurrent search requests efficiently', async () => {
      const queryVector = testEmbeddings[0].vector;

      // Run multiple searches concurrently
      const searchPromises = Array.from({ length: 5 }, () => {
        const startTime = Date.now();
        return db.searchSimilar(queryVector, { limit: 5 }).then(results => ({
          results,
          duration: Date.now() - startTime
        }));
      });

      const searchResults = await Promise.all(searchPromises);

      // All searches should complete within time limit
      searchResults.forEach(({ duration }) => {
        expect(duration).toBeLessThan(200);
      });
    });
  });

  describe('Search Result Quality', () => {
    it('should return results ranked by similarity score', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, { limit: 5 });

      expect(results.length).toBeGreaterThan(0);

      // Results should be sorted by similarity (highest first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should return accurate similarity scores', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, { limit: 10 });

      expect(results.length).toBeGreaterThan(0);

      // Similarity scores should be between 0 and 1
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });

      // First result should be the query vector itself (highest similarity)
      expect(results[0].similarity).toBeCloseTo(1.0, 2);
    });

    it('should respect result limit parameter', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results5 = await db.searchSimilar(queryVector, { limit: 5 });
      const results10 = await db.searchSimilar(queryVector, { limit: 10 });
      const results20 = await db.searchSimilar(queryVector, { limit: 20 });

      expect(results5.length).toBeLessThanOrEqual(5);
      expect(results10.length).toBeLessThanOrEqual(10);
      expect(results20.length).toBeLessThanOrEqual(20);
    });

    it('should handle edge case queries gracefully', async () => {
      // Test with zero vector
      const zeroVector = new Array(384).fill(0);
      const zeroResults = await db.searchSimilar(zeroVector, { limit: 5 });
      expect(Array.isArray(zeroResults)).toBe(true);

      // Test with random vector
      const randomVector = Array.from({ length: 384 }, () => Math.random() - 0.5);
      const randomResults = await db.searchSimilar(randomVector, { limit: 5 });
      expect(Array.isArray(randomResults)).toBe(true);
    });
  });

  describe('Distance Metrics Support', () => {
    it('should support cosine distance metric', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, {
        limit: 5,
        distanceMetric: 'cosine'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeCloseTo(1.0, 2);
    });

    it('should support euclidean distance metric', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, {
        limit: 5,
        distanceMetric: 'euclidean'
      });

      expect(results.length).toBeGreaterThan(0);
      // For euclidean, smaller distance = higher similarity
      expect(results[0].similarity).toBeGreaterThan(0);
    });

    it('should support dot product distance metric', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, {
        limit: 5,
        distanceMetric: 'dotproduct'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0);
    });

    it('should produce consistent results for same query', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results1 = await db.searchSimilar(queryVector, { limit: 5 });
      const results2 = await db.searchSimilar(queryVector, { limit: 5 });

      expect(results1.length).toBe(results2.length);

      // Results should be identical
      for (let i = 0; i < results1.length; i++) {
        expect(results1[i].id).toBe(results2[i].id);
        expect(results1[i].similarity).toBeCloseTo(results2[i].similarity, 5);
      }
    });
  });

  describe('Search Integration', () => {
    it('should integrate with existing embedding storage', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, { limit: 5 });

      // Results should reference actual stored embeddings
      for (const result of results) {
        const embedding = await db.getEmbeddingById(result.id);
        expect(embedding).toBeDefined();
        expect(embedding!.id).toBe(result.id);
      }
    });

    it('should work with freshly inserted embeddings', async () => {
      // Insert new embedding
      const newEmbedding: DocumentEmbedding = {
        id: 'fresh-embedding',
        documentId: 'fresh-doc',
        chunkIndex: 0,
        vector: Array.from({ length: 384 }, () => Math.random() - 0.5),
        metadata: { text: 'Fresh embedding for search test' }
      };

      await db.insertEmbeddings([newEmbedding]);
      await db.buildIndex(); // Rebuild index to include new embedding

      const results = await db.searchSimilar(newEmbedding.vector, { limit: 10 });

      // Should find the newly inserted embedding
      const foundEmbedding = results.find(r => r.id === newEmbedding.id);
      expect(foundEmbedding).toBeDefined();
      expect(foundEmbedding!.similarity).toBeCloseTo(1.0, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid vector dimensions', async () => {
      const invalidVector = [1, 2, 3]; // Wrong dimension

      await expect(db.searchSimilar(invalidVector, { limit: 5 }))
        .rejects.toThrow(/dimension/i);
    });

    it('should handle search on empty database', async () => {
      const emptyDb = new VectorDatabase({ path: ':memory:', vectorDimension: 384 });
      await emptyDb.initialize();

      const queryVector = testEmbeddings[0].vector;
      const results = await emptyDb.searchSimilar(queryVector, { limit: 5 });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);

      await emptyDb.close();
    });

    it('should provide meaningful error messages', async () => {
      const queryVector = testEmbeddings[0].vector;

      // Test with invalid limit
      await expect(db.searchSimilar(queryVector, { limit: -1 }))
        .rejects.toThrow(/limit/i);

      await expect(db.searchSimilar(queryVector, { limit: 0 }))
        .rejects.toThrow(/limit/i);
    });
  });
});
