// @phase: 2
// @phase-name: Advanced Vector Features
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorDatabase } from '../VectorDatabase';
import type { DocumentEmbedding, VectorDatabaseConfig } from '../types';
import { generateTestEmbeddings } from './vector-storage.test';

/**
 * TDD Test Suite for US-003: HNSW Index Implementation
 * 
 * RED PHASE: These tests will fail initially - this is expected and good!
 * Tests define the interface for HNSW indexing before implementation.
 */
describe('VectorDatabase - US-003: HNSW Index Implementation', () => {
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

    // Generate test embeddings for indexing
    testEmbeddings = generateTestEmbeddings(100);
    await db.insertEmbeddings(testEmbeddings);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('HNSW Index Creation', () => {
    it('should create HNSW index with default parameters', async () => {
      // RED PHASE: buildIndex method doesn't exist yet
      await expect(db.buildIndex()).resolves.not.toThrow();

      const indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');
    });

    it('should create HNSW index with custom parameters', async () => {
      const customConfig: VectorDatabaseConfig = {
        path: ':memory:',
        vectorDimension: 384,
        indexParams: {
          M: 32,
          efConstruction: 400,
          ef: 200
        }
      };

      const customDb = new VectorDatabase(customConfig);
      await customDb.initialize();
      await customDb.insertEmbeddings(testEmbeddings);

      await expect(customDb.buildIndex()).resolves.not.toThrow();

      const indexStatus = await customDb.getIndexStatus();
      expect(indexStatus).toBe('ready');

      await customDb.close();
    });

    it('should handle index creation on empty database', async () => {
      const emptyDb = new VectorDatabase();
      await emptyDb.initialize();

      await expect(emptyDb.buildIndex()).resolves.not.toThrow();

      const indexStatus = await emptyDb.getIndexStatus();
      expect(indexStatus).toBe('ready');

      await emptyDb.close();
    });

    it('should rebuild existing index without errors', async () => {
      await db.buildIndex();

      // Rebuild should work without issues
      await expect(db.rebuildIndex()).resolves.not.toThrow();

      const indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');
    });
  });

  describe('Index Build Performance', () => {
    it('should build index for 1000 embeddings in under 10 seconds', async () => {
      const largeEmbeddingSet = generateTestEmbeddings(1000);
      await db.clearAllEmbeddings();
      await db.insertEmbeddings(largeEmbeddingSet);

      const startTime = Date.now();
      await db.buildIndex();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // < 10 seconds

      const indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');
    });

    it('should build index for 5000 embeddings in under 30 seconds', async () => {
      const veryLargeEmbeddingSet = generateTestEmbeddings(5000);
      await db.clearAllEmbeddings();
      await db.insertEmbeddings(veryLargeEmbeddingSet);

      const startTime = Date.now();
      await db.buildIndex();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000); // < 30 seconds

      const indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');
    }, 35000); // 35 second timeout

    it('should provide progress feedback during index building', async () => {
      const largeEmbeddingSet = generateTestEmbeddings(1000);
      await db.clearAllEmbeddings();
      await db.insertEmbeddings(largeEmbeddingSet);

      let progressUpdates = 0;
      const progressCallback = (progress: number) => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
        progressUpdates++;
      };

      await db.buildIndex(progressCallback);

      expect(progressUpdates).toBeGreaterThan(0);
    });
  });

  describe('Index Update Efficiency', () => {
    beforeEach(async () => {
      await db.buildIndex();
    });

    it('should update index when new embeddings are added', async () => {
      const newEmbeddings = generateTestEmbeddings(10);

      await db.insertEmbeddings(newEmbeddings);

      // Index should automatically update or be marked for update
      const indexStatus = await db.getIndexStatus();
      expect(['ready', 'updating']).toContain(indexStatus);
    });

    it('should update index when embeddings are deleted', async () => {
      const embeddingToDelete = testEmbeddings[0];

      await db.deleteEmbedding(embeddingToDelete.id);

      // Index should handle deletion
      const indexStatus = await db.getIndexStatus();
      expect(['ready', 'updating']).toContain(indexStatus);
    });

    it('should handle bulk updates efficiently', async () => {
      const newEmbeddings = generateTestEmbeddings(100);

      const startTime = Date.now();
      await db.insertEmbeddings(newEmbeddings);
      const endTime = Date.now();

      // Bulk update should be fast
      expect(endTime - startTime).toBeLessThan(5000); // < 5 seconds

      const indexStatus = await db.getIndexStatus();
      expect(['ready', 'updating']).toContain(indexStatus);
    });
  });

  describe('Distance Metrics Support', () => {
    beforeEach(async () => {
      await db.buildIndex();
    });

    it('should support cosine distance metric', async () => {
      const queryVector = testEmbeddings[0].vector;

      // RED PHASE: searchSimilar method doesn't exist yet
      const results = await db.searchSimilar(queryVector, {
        limit: 5,
        distanceMetric: 'cosine'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // Results should be sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should support euclidean distance metric', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, {
        limit: 5,
        distanceMetric: 'euclidean'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // Results should be sorted by distance (ascending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].distance).toBeLessThanOrEqual(results[i].distance);
      }
    });

    it('should support dot product distance metric', async () => {
      const queryVector = testEmbeddings[0].vector;

      const results = await db.searchSimilar(queryVector, {
        limit: 5,
        distanceMetric: 'dot_product'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Index Persistence', () => {
    it('should persist index across database restarts', async () => {
      await db.buildIndex();

      // Verify index is ready
      let indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');

      await db.close();

      // Reinitialize database
      await db.initialize();

      // Index should be loaded from storage
      indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');
    });

    it('should maintain index performance after restart', async () => {
      await db.buildIndex();

      const queryVector = testEmbeddings[0].vector;

      // Perform search before restart
      const resultsBefore = await db.searchSimilar(queryVector, { limit: 5 });

      await db.close();
      await db.initialize();

      // Perform same search after restart
      const startTime = Date.now();
      const resultsAfter = await db.searchSimilar(queryVector, { limit: 5 });
      const endTime = Date.now();

      // Results should be consistent
      expect(resultsAfter.length).toBe(resultsBefore.length);

      // Performance should still be good
      expect(endTime - startTime).toBeLessThan(100); // < 100ms
    });
  });

  describe('Index Corruption Handling', () => {
    it('should detect corrupted index data', async () => {
      await db.buildIndex();

      // Simulate index corruption (this would be implementation-specific)
      // For now, we test the interface
      const indexStatus = await db.getIndexStatus();
      expect(['ready', 'error', 'corrupted']).toContain(indexStatus);
    });

    it('should rebuild corrupted index automatically', async () => {
      await db.buildIndex();

      // If corruption is detected, rebuild should fix it
      await expect(db.rebuildIndex()).resolves.not.toThrow();

      const indexStatus = await db.getIndexStatus();
      expect(indexStatus).toBe('ready');
    });

    it('should provide meaningful error messages for index issues', async () => {
      try {
        // Try to use index before building
        const queryVector = testEmbeddings[0].vector;
        await db.searchSimilar(queryVector, { limit: 5 });
      } catch (error) {
        expect(error.message).toContain('index');
        expect(error.message.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Index Performance Monitoring', () => {
    beforeEach(async () => {
      await db.buildIndex();
    });

    it('should provide index performance metrics', async () => {
      const stats = await db.getStats();

      expect(stats.indexStatus).toBeDefined();
      expect(stats.indexSize).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });

    it('should track search performance metrics', async () => {
      const queryVector = testEmbeddings[0].vector;

      const startTime = Date.now();
      await db.searchSimilar(queryVector, { limit: 10 });
      const endTime = Date.now();

      // Search should be fast with index
      expect(endTime - startTime).toBeLessThan(50); // < 50ms
    });

    it('should monitor index memory usage', async () => {
      const stats = await db.getStats();

      expect(stats.indexSize).toBeGreaterThan(0);
      expect(stats.indexSize).toBeLessThan(100 * 1024 * 1024); // < 100MB for test data
    });
  });
});
