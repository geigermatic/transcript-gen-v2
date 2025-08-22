/**
 * Advanced offline-first storage system using IndexedDB via localForage
 */

import localforage from 'localforage';
import type { 
  Document, 
  StyleGuide, 
  AppSettings, 
  UserPreference, 
  EmbeddedChunk, 
  ABSummaryPair 
} from '../types';
import { logInfo, logError, logWarn } from './logger';

// Storage configuration
const STORAGE_CONFIG = {
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  name: 'TranscriptSummarizer',
  version: 1.0,
  size: 100 * 1024 * 1024, // 100MB
  storeName: 'app_data',
  description: 'Local-only transcript summarizer data'
};

// Storage instances for different data types
const documentsStore = localforage.createInstance({
  ...STORAGE_CONFIG,
  storeName: 'documents'
});

const embeddingsStore = localforage.createInstance({
  ...STORAGE_CONFIG,
  storeName: 'embeddings'
});

const preferencesStore = localforage.createInstance({
  ...STORAGE_CONFIG,
  storeName: 'preferences'
});

const settingsStore = localforage.createInstance({
  ...STORAGE_CONFIG,
  storeName: 'settings'
});

const abTestStore = localforage.createInstance({
  ...STORAGE_CONFIG,
  storeName: 'ab_tests'
});

export interface StorageStats {
  totalDocuments: number;
  totalEmbeddings: number;
  totalPreferences: number;
  totalABTests: number;
  estimatedSize: string;
  storageQuotaUsed: number;
  storageQuotaTotal: number;
}

export class OfflineStorage {
  private static instance: OfflineStorage;

  private constructor() {
    this.initialize();
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Test storage availability
      await this.testStorageAvailability();
      
      logInfo('SYSTEM', 'Offline storage initialized successfully', {
        driver: await documentsStore.driver(),
        databases: ['documents', 'embeddings', 'preferences', 'settings', 'ab_tests']
      });
    } catch (error) {
      logError('SYSTEM', 'Failed to initialize offline storage', { error });
      throw error;
    }
  }

  private async testStorageAvailability(): Promise<void> {
    const testKey = '_storage_test';
    const testValue = { test: true, timestamp: Date.now() };
    
    try {
      await documentsStore.setItem(testKey, testValue);
      const retrieved = await documentsStore.getItem(testKey);
      await documentsStore.removeItem(testKey);
      
      if (!retrieved) {
        throw new Error('Storage test failed: data not retrievable');
      }
      
      logInfo('SYSTEM', 'Storage availability test passed');
    } catch (error) {
      logError('SYSTEM', 'Storage availability test failed', { error });
      throw error;
    }
  }

  // Document storage
  async saveDocument(document: Document): Promise<void> {
    try {
      const startTime = performance.now();
      await documentsStore.setItem(document.id, document);
      const duration = performance.now() - startTime;
      
      logInfo('INGEST', `Document saved to IndexedDB: ${document.metadata.filename}`, {
        documentId: document.id,
        size: new Blob([JSON.stringify(document)]).size,
        duration
      });
    } catch (error) {
      logError('INGEST', 'Failed to save document', { documentId: document.id, error });
      throw error;
    }
  }

  async getDocument(id: string): Promise<Document | null> {
    try {
      const document = await documentsStore.getItem<Document>(id);
      return document;
    } catch (error) {
      logError('INGEST', 'Failed to retrieve document', { documentId: id, error });
      return null;
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      const startTime = performance.now();
      const documents: Document[] = [];
      
      await documentsStore.iterate<Document, void>((value) => {
        if (value && value.id) {
          documents.push(value);
        }
      });
      
      const duration = performance.now() - startTime;
      logInfo('INGEST', `Retrieved ${documents.length} documents from IndexedDB`, { duration });
      
      // Sort by upload date (newest first)
      return documents.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (error) {
      logError('INGEST', 'Failed to retrieve all documents', { error });
      return [];
    }
  }

  async removeDocument(id: string): Promise<void> {
    try {
      await documentsStore.removeItem(id);
      // Also remove associated embeddings
      await this.removeEmbeddings(id);
      logInfo('INGEST', `Document and embeddings removed: ${id}`);
    } catch (error) {
      logError('INGEST', 'Failed to remove document', { documentId: id, error });
      throw error;
    }
  }

  // Embeddings storage
  async saveEmbeddings(documentId: string, embeddings: EmbeddedChunk[]): Promise<void> {
    try {
      const startTime = performance.now();
      await embeddingsStore.setItem(documentId, embeddings);
      const duration = performance.now() - startTime;
      
      logInfo('EMBED', `Embeddings saved for document: ${documentId}`, {
        chunkCount: embeddings.length,
        totalVectors: embeddings.reduce((sum, chunk) => sum + chunk.embedding.length, 0),
        size: new Blob([JSON.stringify(embeddings)]).size,
        duration
      });
    } catch (error) {
      logError('EMBED', 'Failed to save embeddings', { documentId, error });
      throw error;
    }
  }

  async getEmbeddings(documentId: string): Promise<EmbeddedChunk[]> {
    try {
      const embeddings = await embeddingsStore.getItem<EmbeddedChunk[]>(documentId);
      return embeddings || [];
    } catch (error) {
      logError('EMBED', 'Failed to retrieve embeddings', { documentId, error });
      return [];
    }
  }

  async getAllEmbeddings(): Promise<Map<string, EmbeddedChunk[]>> {
    try {
      const embeddingsMap = new Map<string, EmbeddedChunk[]>();
      
      await embeddingsStore.iterate<EmbeddedChunk[], void>((value, key) => {
        if (value && Array.isArray(value)) {
          embeddingsMap.set(key, value);
        }
      });
      
      logInfo('EMBED', `Retrieved embeddings for ${embeddingsMap.size} documents`);
      return embeddingsMap;
    } catch (error) {
      logError('EMBED', 'Failed to retrieve all embeddings', { error });
      return new Map();
    }
  }

  async removeEmbeddings(documentId: string): Promise<void> {
    try {
      await embeddingsStore.removeItem(documentId);
      logInfo('EMBED', `Embeddings removed for document: ${documentId}`);
    } catch (error) {
      logError('EMBED', 'Failed to remove embeddings', { documentId, error });
      throw error;
    }
  }

  // Settings storage
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await settingsStore.setItem('app_settings', settings);
      logInfo('SYSTEM', 'App settings saved to IndexedDB');
    } catch (error) {
      logError('SYSTEM', 'Failed to save settings', { error });
      throw error;
    }
  }

  async getSettings(): Promise<AppSettings | null> {
    try {
      return await settingsStore.getItem<AppSettings>('app_settings');
    } catch (error) {
      logError('SYSTEM', 'Failed to retrieve settings', { error });
      return null;
    }
  }

  // Style guide storage
  async saveStyleGuide(styleGuide: StyleGuide): Promise<void> {
    try {
      await settingsStore.setItem('style_guide', styleGuide);
      logInfo('STYLE_GUIDE', 'Style guide saved to IndexedDB');
    } catch (error) {
      logError('STYLE_GUIDE', 'Failed to save style guide', { error });
      throw error;
    }
  }

  async getStyleGuide(): Promise<StyleGuide | null> {
    try {
      return await settingsStore.getItem<StyleGuide>('style_guide');
    } catch (error) {
      logError('STYLE_GUIDE', 'Failed to retrieve style guide', { error });
      return null;
    }
  }

  // User preferences (A/B testing feedback)
  async saveUserPreference(preference: UserPreference): Promise<void> {
    try {
      const preferences = await this.getAllUserPreferences();
      preferences.push(preference);
      await preferencesStore.setItem('user_preferences', preferences);
      logInfo('AB_TEST', 'User preference saved', { preferenceId: preference.id });
    } catch (error) {
      logError('AB_TEST', 'Failed to save user preference', { error });
      throw error;
    }
  }

  async getAllUserPreferences(): Promise<UserPreference[]> {
    try {
      const preferences = await preferencesStore.getItem<UserPreference[]>('user_preferences');
      return preferences || [];
    } catch (error) {
      logError('AB_TEST', 'Failed to retrieve user preferences', { error });
      return [];
    }
  }

  // A/B testing data
  async saveABSummaryPair(pair: ABSummaryPair): Promise<void> {
    try {
      await abTestStore.setItem(pair.id, pair);
      logInfo('AB_TEST', `A/B summary pair saved: ${pair.id}`, {
        documentId: pair.documentId,
        variantA: pair.variantA.name,
        variantB: pair.variantB.name
      });
    } catch (error) {
      logError('AB_TEST', 'Failed to save A/B summary pair', { error });
      throw error;
    }
  }

  async getABSummaryPair(id: string): Promise<ABSummaryPair | null> {
    try {
      return await abTestStore.getItem<ABSummaryPair>(id);
    } catch (error) {
      logError('AB_TEST', 'Failed to retrieve A/B summary pair', { pairId: id, error });
      return null;
    }
  }

  async getAllABSummaryPairs(): Promise<ABSummaryPair[]> {
    try {
      const pairs: ABSummaryPair[] = [];
      
      await abTestStore.iterate<ABSummaryPair, void>((value) => {
        if (value && value.id) {
          pairs.push(value);
        }
      });
      
      // Sort by creation date (newest first)
      return pairs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      logError('AB_TEST', 'Failed to retrieve A/B summary pairs', { error });
      return [];
    }
  }

  // Storage statistics and management
  async getStorageStats(): Promise<StorageStats> {
    try {
      const [documents, embeddings, preferences, abTests] = await Promise.all([
        this.getAllDocuments(),
        this.getAllEmbeddings(),
        this.getAllUserPreferences(),
        this.getAllABSummaryPairs()
      ]);

      // Estimate storage usage
      const documentsSize = new Blob([JSON.stringify(documents)]).size;
      const embeddingsSize = new Blob([JSON.stringify(Array.from(embeddings.entries()))]).size;
      const preferencesSize = new Blob([JSON.stringify(preferences)]).size;
      const abTestsSize = new Blob([JSON.stringify(abTests)]).size;
      const totalSize = documentsSize + embeddingsSize + preferencesSize + abTestsSize;

      // Get storage quota if available
      let quotaUsed = 0;
      let quotaTotal = 0;
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        quotaUsed = estimate.usage || 0;
        quotaTotal = estimate.quota || 0;
      }

      return {
        totalDocuments: documents.length,
        totalEmbeddings: embeddings.size,
        totalPreferences: preferences.length,
        totalABTests: abTests.length,
        estimatedSize: this.formatBytes(totalSize),
        storageQuotaUsed: quotaUsed,
        storageQuotaTotal: quotaTotal
      };
    } catch (error) {
      logError('SYSTEM', 'Failed to get storage stats', { error });
      return {
        totalDocuments: 0,
        totalEmbeddings: 0,
        totalPreferences: 0,
        totalABTests: 0,
        estimatedSize: '0 B',
        storageQuotaUsed: 0,
        storageQuotaTotal: 0
      };
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        documentsStore.clear(),
        embeddingsStore.clear(),
        preferencesStore.clear(),
        settingsStore.clear(),
        abTestStore.clear()
      ]);
      
      logWarn('SYSTEM', 'All application data cleared from IndexedDB');
    } catch (error) {
      logError('SYSTEM', 'Failed to clear all data', { error });
      throw error;
    }
  }

  async exportAllData(): Promise<string> {
    try {
      const [documents, embeddings, preferences, settings, styleGuide, abTests] = await Promise.all([
        this.getAllDocuments(),
        this.getAllEmbeddings(),
        this.getAllUserPreferences(),
        this.getSettings(),
        this.getStyleGuide(),
        this.getAllABSummaryPairs()
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
          documents,
          embeddings: Object.fromEntries(embeddings),
          preferences,
          settings,
          styleGuide,
          abTests
        }
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      logInfo('EXPORT', 'All data exported successfully', { 
        size: new Blob([jsonString]).size,
        documents: documents.length,
        embeddings: embeddings.size
      });

      return jsonString;
    } catch (error) {
      logError('EXPORT', 'Failed to export all data', { error });
      throw error;
    }
  }

  // Utility methods
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'failed'; details: Record<string, unknown> }> {
    const results = {
      documentsStore: false,
      embeddingsStore: false,
      preferencesStore: false,
      settingsStore: false,
      abTestStore: false,
      quota: { available: 0, used: 0 }
    };

    try {
      // Test each store
      const testKey = '_health_check';
      const testValue = { timestamp: Date.now() };

      const stores = [
        { name: 'documentsStore', store: documentsStore },
        { name: 'embeddingsStore', store: embeddingsStore },
        { name: 'preferencesStore', store: preferencesStore },
        { name: 'settingsStore', store: settingsStore },
        { name: 'abTestStore', store: abTestStore }
      ];

      for (const { name, store } of stores) {
        try {
          await store.setItem(testKey, testValue);
          await store.getItem(testKey);
          await store.removeItem(testKey);
          results[name as keyof typeof results] = true;
        } catch (error) {
          logError('SYSTEM', `Health check failed for ${name}`, { error });
        }
      }

      // Check quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        results.quota = {
          available: estimate.quota || 0,
          used: estimate.usage || 0
        };
      }

      const healthyStores = Object.values(results).filter(v => v === true).length;
      const totalStores = 5;

      let status: 'healthy' | 'degraded' | 'failed';
      if (healthyStores === totalStores) {
        status = 'healthy';
      } else if (healthyStores > 0) {
        status = 'degraded';
      } else {
        status = 'failed';
      }

      logInfo('SYSTEM', `Storage health check completed: ${status}`, results);
      return { status, details: results };
    } catch (error) {
      logError('SYSTEM', 'Storage health check failed', { error });
      return { status: 'failed', details: results };
    }
  }
}

// Global storage instance
export const offlineStorage = OfflineStorage.getInstance();
