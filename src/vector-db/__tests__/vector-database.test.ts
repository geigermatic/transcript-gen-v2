import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorDatabase } from '../VectorDatabase';

/**
 * TDD Test Suite for US-001: SQLite Vector Database Setup
 * 
 * RED PHASE: These tests will fail initially - this is expected and good!
 * The goal is to define the interface and behavior before implementation.
 */
describe('VectorDatabase - US-001: SQLite Vector Database Setup', () => {
  let db: VectorDatabase;

  beforeEach(async () => {
    // Fresh database instance for each test
    db = new VectorDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    if (db) {
      await db.close();
    }
  });

  describe('Initialization', () => {
    it('should initialize SQLite with vector extensions', async () => {
      // RED PHASE: This will fail - VectorDatabase doesn't exist yet
      await expect(db.initialize()).resolves.not.toThrow();
      expect(db.hasVectorSupport()).toBe(true);
    });

    it('should work offline without external dependencies', async () => {
      // Simulate offline environment (no network access)
      const originalFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('Network unavailable'));
      
      try {
        await expect(db.initialize()).resolves.not.toThrow();
        expect(db.isInitialized()).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should initialize in under 1 second', async () => {
      const startTime = Date.now();
      await db.initialize();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await db.initialize();
      await expect(db.initialize()).resolves.not.toThrow();
      expect(db.isInitialized()).toBe(true);
    });
  });

  describe('Vector Extension Support', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should have sqlite-vss extension loaded', async () => {
      const extensions = await db.getLoadedExtensions();
      expect(extensions).toContain('sqlite-vss');
    });

    it('should support vector operations', async () => {
      // Test basic vector operations are available
      const hasVectorOps = await db.supportsVectorOperations();
      expect(hasVectorOps).toBe(true);
    });

    it('should support HNSW index creation', async () => {
      const supportsHNSW = await db.supportsHNSWIndex();
      expect(supportsHNSW).toBe(true);
    });
  });

  describe('Database Configuration', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should use local file storage', async () => {
      const dbPath = db.getDatabasePath();
      expect(dbPath).toBeDefined();
      expect(dbPath).toMatch(/\.db$/); // Should end with .db
    });

    it('should enable WAL mode for better performance', async () => {
      const journalMode = await db.getJournalMode();
      expect(journalMode).toBe('wal');
    });

    it('should have appropriate timeout settings', async () => {
      const timeout = await db.getBusyTimeout();
      expect(timeout).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted database files gracefully', async () => {
      // Simulate corrupted database
      const corruptedDb = new VectorDatabase({ path: '/invalid/path/corrupted.db' });
      
      await expect(corruptedDb.initialize()).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      const invalidDb = new VectorDatabase({ path: '/readonly/path.db' });
      
      try {
        await invalidDb.initialize();
      } catch (error) {
        expect(error.message).toContain('database');
        expect(error.message.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on close', async () => {
      await db.initialize();
      await db.close();
      
      expect(db.isInitialized()).toBe(false);
    });

    it('should handle close without initialization', async () => {
      await expect(db.close()).resolves.not.toThrow();
    });

    it('should prevent operations after close', async () => {
      await db.initialize();
      await db.close();
      
      await expect(db.hasVectorSupport()).rejects.toThrow('Database is closed');
    });
  });
});

/**
 * Performance Benchmarks for US-001
 * These establish baseline performance requirements
 */
describe('VectorDatabase Performance Benchmarks', () => {
  let db: VectorDatabase;

  beforeEach(async () => {
    db = new VectorDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should initialize within performance targets', async () => {
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const testDb = new VectorDatabase();
      const startTime = Date.now();
      await testDb.initialize();
      const endTime = Date.now();
      times.push(endTime - startTime);
      await testDb.close();
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    expect(avgTime).toBeLessThan(1000); // Average < 1 second
  });

  it('should have minimal memory footprint', async () => {
    const beforeMemory = process.memoryUsage().heapUsed;
    await db.initialize();
    const afterMemory = process.memoryUsage().heapUsed;
    
    const memoryIncrease = afterMemory - beforeMemory;
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // < 5MB increase
  });
});
