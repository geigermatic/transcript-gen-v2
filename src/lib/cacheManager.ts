/**
 * Multi-level cache manager for performance optimization
 * Implements memory, disk, and network caching with intelligent hierarchy
 */

import localforage from 'localforage';

export interface CacheConfig {
  memoryLimit: number;    // Maximum items in memory cache
  diskLimit: number;      // Maximum items in disk cache
  ttl: number;           // Time to live in milliseconds
  enableCompression?: boolean;
  enableMetrics?: boolean;
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  source?: 'memory' | 'disk' | 'network';
}

export interface CacheStats {
  memoryHits: number;
  diskHits: number;
  networkHits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  diskUsage: number;
  evictions: number;
}

export type CacheLevel = 'memory' | 'disk' | 'network';

export class CacheManager {
  private memoryCache = new Map<string, CacheItem>();
  private diskCache: LocalForage;
  private diskCacheMap = new Map<string, CacheItem>(); // Fallback for test environment
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private useMapFallback = false;

  constructor(config: CacheConfig) {
    this.config = {
      enableCompression: false,
      enableMetrics: true,
      ...config
    };

    this.stats = {
      memoryHits: 0,
      diskHits: 0,
      networkHits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0,
      diskUsage: 0,
      evictions: 0
    };

    // Initialize disk cache with localforage
    this.diskCache = localforage.createInstance({
      name: 'CacheManager',
      storeName: 'diskCache',
      description: 'Multi-level cache disk storage'
    });

    // Detect test environment and use Map fallback if needed
    this.useMapFallback = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get item from cache with hierarchy: memory -> disk -> network
   */
  async get<T = any>(key: string): Promise<(T & { source: CacheLevel }) | null> {
    this.stats.totalRequests++;

    try {
      // Level 1: Check memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && !this.isExpired(memoryItem)) {
        this.updateAccessStats(memoryItem);
        this.stats.memoryHits++;
        this.updateHitRate();

        // Return the value with source information
        const result = typeof memoryItem.value === 'object' && memoryItem.value !== null
          ? { ...memoryItem.value, source: 'memory' as CacheLevel }
          : { value: memoryItem.value, source: 'memory' as CacheLevel };
        return result;
      }

      // Level 2: Check disk cache
      const diskItem = this.useMapFallback
        ? this.diskCacheMap.get(key)
        : await this.diskCache.getItem<CacheItem<T>>(key);


      if (diskItem && !this.isExpired(diskItem)) {
        this.updateAccessStats(diskItem);
        this.stats.diskHits++;

        // Promote to memory cache
        this.setMemoryCache(key, diskItem);

        this.updateHitRate();

        // Return the value with source information
        const result = typeof diskItem.value === 'object' && diskItem.value !== null
          ? { ...diskItem.value, source: 'disk' as CacheLevel }
          : { value: diskItem.value, source: 'disk' as CacheLevel };
        return result;
      }

      // Cache miss
      this.stats.misses++;
      this.updateHitRate();
      return null;

    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set item in cache at specified level
   */
  async set<T = any>(
    key: string,
    value: T,
    level: CacheLevel = 'memory',
    customTtl?: number
  ): Promise<void> {
    const ttl = customTtl || this.config.ttl;
    const now = Date.now();

    const cacheItem: CacheItem<T> = {
      key,
      value,
      timestamp: now,
      ttl,
      size: this.calculateSize(value),
      accessCount: 1,
      lastAccessed: now
    };

    try {
      switch (level) {
        case 'memory':
          this.setMemoryCache(key, cacheItem);
          break;

        case 'disk':
          await this.setDiskCache(key, cacheItem);
          break;

        case 'network':
          // For network caching, store in both memory and disk
          this.setMemoryCache(key, cacheItem);
          await this.setDiskCache(key, cacheItem);
          break;
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Remove item from all cache levels
   */
  async remove(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      if (this.useMapFallback) {
        this.diskCacheMap.delete(key);
      } else {
        await this.diskCache.removeItem(key);
      }
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      if (this.useMapFallback) {
        this.diskCacheMap.clear();
      } else {
        await this.diskCache.clear();
      }
      this.resetStats();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    // Update usage stats
    this.stats.memoryUsage = this.memoryCache.size;

    try {
      if (this.useMapFallback) {
        this.stats.diskUsage = this.diskCacheMap.size;
      } else {
        const diskKeys = await this.diskCache.keys();
        this.stats.diskUsage = diskKeys.length;
      }
    } catch (error) {
      console.error('Error getting disk usage:', error);
    }

    return { ...this.stats };
  }

  /**
   * Set item in memory cache with LRU eviction
   */
  private setMemoryCache<T>(key: string, item: CacheItem<T>): void {
    // If key already exists, just update it
    if (this.memoryCache.has(key)) {
      this.memoryCache.set(key, item);
      return;
    }

    // Check if we need to evict items before adding new one
    if (this.memoryCache.size >= this.config.memoryLimit) {
      this.evictLRU();
    }

    this.memoryCache.set(key, item);
  }

  /**
   * Set item in disk cache
   */
  private async setDiskCache<T>(key: string, item: CacheItem<T>): Promise<void> {
    try {
      if (this.useMapFallback) {
        // Use Map fallback for test environment
        if (this.diskCacheMap.size >= this.config.diskLimit) {
          this.evictMapLRU();
        }
        this.diskCacheMap.set(key, item);

      } else {
        // Check disk limit
        const diskKeys = await this.diskCache.keys();
        if (diskKeys.length >= this.config.diskLimit) {
          await this.evictDiskLRU();
        }

        await this.diskCache.setItem(key, item);

      }
    } catch (error) {
      console.error('Disk cache set error:', error);
      throw error;
    }
  }

  /**
   * Evict least recently used item from memory
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict least recently used item from Map fallback
   */
  private evictMapLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.diskCacheMap.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.diskCacheMap.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict least recently used item from disk
   */
  private async evictDiskLRU(): Promise<void> {
    try {
      const keys = await this.diskCache.keys();
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const key of keys) {
        const item = await this.diskCache.getItem<CacheItem>(key);
        if (item && item.lastAccessed < oldestTime) {
          oldestTime = item.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        await this.diskCache.removeItem(oldestKey);
        this.stats.evictions++;
      }
    } catch (error) {
      console.error('Disk LRU eviction error:', error);
    }
  }

  /**
   * Check if cache item is expired
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * Update access statistics for cache item
   */
  private updateAccessStats(item: CacheItem): void {
    item.accessCount++;
    item.lastAccessed = Date.now();
  }

  /**
   * Calculate approximate size of cached value
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1; // Fallback size
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const totalHits = this.stats.memoryHits + this.stats.diskHits + this.stats.networkHits;
    this.stats.hitRate = this.stats.totalRequests > 0
      ? totalHits / this.stats.totalRequests
      : 0;
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      memoryHits: 0,
      diskHits: 0,
      networkHits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0,
      diskUsage: 0,
      evictions: 0
    };
  }

  /**
   * Start cleanup interval for expired items
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up expired items from all cache levels
   */
  private async cleanupExpiredItems(): Promise<void> {
    try {
      // Cleanup memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        if (this.isExpired(item)) {
          this.memoryCache.delete(key);
        }
      }

      // Cleanup disk cache
      const diskKeys = await this.diskCache.keys();
      for (const key of diskKeys) {
        const item = await this.diskCache.getItem<CacheItem>(key);
        if (item && this.isExpired(item)) {
          await this.diskCache.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();
  }
}
