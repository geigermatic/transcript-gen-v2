import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorDatabase } from '../VectorDatabase';
import type { DocumentEmbedding, EmbeddingMetadata } from '../types';

/**
 * TDD Test Suite for US-002: Basic Vector Storage
 * 
 * RED PHASE: These tests will fail initially - this is expected and good!
 * Tests define the interface for storing and retrieving embeddings.
 */
describe('VectorDatabase - US-002: Basic Vector Storage', () => {
  let db: VectorDatabase;
  let testEmbeddings: DocumentEmbedding[];

  beforeEach(async () => {
    db = new VectorDatabase();
    await db.initialize();

    // Generate test embeddings
    testEmbeddings = generateTestEmbeddings(100);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Embedding Storage', () => {
    it('should store embeddings and retrieve them identically', async () => {
      // RED PHASE: insertEmbeddings method doesn't exist yet
      await db.insertEmbeddings(testEmbeddings);
      const retrieved = await db.getAllEmbeddings();

      expect(retrieved.length).toBe(testEmbeddings.length);

      // Check core properties (ignore timestamps)
      retrieved.forEach((retrieved, index) => {
        const original = testEmbeddings[index];
        expect(retrieved.id).toBe(original.id);
        expect(retrieved.documentId).toBe(original.documentId);
        expect(retrieved.chunkId).toBe(original.chunkId);
        expect(retrieved.vector).toEqual(original.vector);
        expect(retrieved.metadata).toEqual(original.metadata);
        expect(retrieved.createdAt).toBeInstanceOf(Date);
        expect(retrieved.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle single embedding insertion', async () => {
      const singleEmbedding = testEmbeddings[0];
      await db.insertEmbedding(singleEmbedding);

      const retrieved = await db.getAllEmbeddings();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0]).toEqual(singleEmbedding);
    });

    it('should handle batch embedding insertion', async () => {
      const batchSize = 50;
      const batch1 = testEmbeddings.slice(0, batchSize);
      const batch2 = testEmbeddings.slice(batchSize);

      await db.insertEmbeddings(batch1);
      await db.insertEmbeddings(batch2);

      const retrieved = await db.getAllEmbeddings();
      expect(retrieved.length).toBe(testEmbeddings.length);
    });

    it('should preserve embedding vector precision', async () => {
      const preciseEmbedding: DocumentEmbedding = {
        id: 'precision-test',
        documentId: 'doc-1',
        chunkId: 'chunk-1',
        vector: [0.123456789, -0.987654321, 0.555555555],
        metadata: {
          chunkText: 'Test precision',
          chunkIndex: 0,
          documentTitle: 'Precision Test'
        }
      };

      await db.insertEmbedding(preciseEmbedding);
      const retrieved = await db.getEmbeddingById('precision-test');

      expect(retrieved?.vector).toEqual(preciseEmbedding.vector);
    });
  });

  describe('Embedding Retrieval', () => {
    beforeEach(async () => {
      await db.insertEmbeddings(testEmbeddings);
    });

    it('should retrieve embedding by ID', async () => {
      const targetId = testEmbeddings[0].id;
      const retrieved = await db.getEmbeddingById(targetId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(targetId);
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await db.getEmbeddingById('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should retrieve embeddings by document ID', async () => {
      const documentId = testEmbeddings[0].documentId;
      const retrieved = await db.getEmbeddingsByDocumentId(documentId);

      expect(retrieved.length).toBeGreaterThan(0);
      retrieved.forEach(embedding => {
        expect(embedding.documentId).toBe(documentId);
      });
    });

    it('should retrieve all embeddings efficiently', async () => {
      const startTime = Date.now();
      const retrieved = await db.getAllEmbeddings();
      const endTime = Date.now();

      expect(retrieved.length).toBe(testEmbeddings.length);
      expect(endTime - startTime).toBeLessThan(1000); // < 1 second
    });
  });

  describe('Data Persistence', () => {
    it('should persist embeddings across database restarts', async () => {
      await db.insertEmbeddings(testEmbeddings);
      await db.close();

      // Reinitialize database
      await db.initialize();
      const retrieved = await db.getAllEmbeddings();

      expect(retrieved.length).toBe(testEmbeddings.length);
    });

    it('should maintain data integrity after unexpected shutdown', async () => {
      await db.insertEmbeddings(testEmbeddings.slice(0, 50));

      // Simulate unexpected shutdown (close without proper cleanup)
      await db.forceClose();

      // Reinitialize and check data
      await db.initialize();
      const retrieved = await db.getAllEmbeddings();

      expect(retrieved.length).toBe(50);
    });
  });

  describe('Embedding Updates and Deletion', () => {
    beforeEach(async () => {
      await db.insertEmbeddings(testEmbeddings);
    });

    it('should update existing embedding', async () => {
      const originalEmbedding = testEmbeddings[0];
      const updatedEmbedding = {
        ...originalEmbedding,
        vector: [0.1, 0.2, 0.3],
        metadata: {
          ...originalEmbedding.metadata,
          chunkText: 'Updated text'
        }
      };

      await db.updateEmbedding(updatedEmbedding);
      const retrieved = await db.getEmbeddingById(originalEmbedding.id);

      expect(retrieved?.vector).toEqual(updatedEmbedding.vector);
      expect(retrieved?.metadata.chunkText).toBe('Updated text');
    });

    it('should delete embedding by ID', async () => {
      const targetId = testEmbeddings[0].id;
      await db.deleteEmbedding(targetId);

      const retrieved = await db.getEmbeddingById(targetId);
      expect(retrieved).toBeNull();

      const allEmbeddings = await db.getAllEmbeddings();
      expect(allEmbeddings.length).toBe(testEmbeddings.length - 1);
    });

    it('should delete all embeddings for a document', async () => {
      const documentId = testEmbeddings[0].documentId;
      await db.deleteEmbeddingsByDocumentId(documentId);

      const retrieved = await db.getEmbeddingsByDocumentId(documentId);
      expect(retrieved.length).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should insert 1000 embeddings in under 5 seconds', async () => {
      const largeEmbeddingSet = generateTestEmbeddings(1000);

      const startTime = Date.now();
      await db.insertEmbeddings(largeEmbeddingSet);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should retrieve embeddings efficiently regardless of count', async () => {
      // Test with different sizes
      const sizes = [100, 500, 1000];

      for (const size of sizes) {
        const embeddings = generateTestEmbeddings(size);
        await db.clearAllEmbeddings();
        await db.insertEmbeddings(embeddings);

        const startTime = Date.now();
        await db.getAllEmbeddings();
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000); // Always < 1 second
      }
    });
  });
});

/**
 * Helper function to generate test embeddings
 * This will be used across multiple test files
 */
function generateTestEmbeddings(count: number): DocumentEmbedding[] {
  const embeddings: DocumentEmbedding[] = [];

  for (let i = 0; i < count; i++) {
    embeddings.push({
      id: `embedding-${i}`,
      documentId: `doc-${Math.floor(i / 10)}`, // 10 embeddings per document
      chunkId: `chunk-${i}`,
      vector: Array.from({ length: 384 }, () => Math.random() * 2 - 1), // Random 384-dim vector
      metadata: {
        chunkText: `This is test chunk ${i} with some sample content for testing.`,
        chunkIndex: i % 10,
        documentTitle: `Test Document ${Math.floor(i / 10)}`,
        documentPath: `/test/documents/doc-${Math.floor(i / 10)}.pdf`
      }
    });
  }

  return embeddings;
}

// Export for use in other test files
export { generateTestEmbeddings };
