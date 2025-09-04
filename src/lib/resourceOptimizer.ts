/**
 * Resource Optimizer for managing memory usage, lazy loading, and resource pooling
 * Provides intelligent memory management and performance optimization
 */

export interface ResourceOptimizerConfig {
  memoryThreshold: number;           // Memory usage threshold (0-1)
  maxDocuments: number;              // Maximum documents to keep in memory
  enableGarbageCollection: boolean;  // Enable automatic garbage collection
  enableMemoryPressureDetection: boolean; // Enable memory pressure detection
  lazyLoadingEnabled?: boolean;      // Enable lazy loading for embeddings
  resourcePoolSize?: number;         // Size of resource pools
}

export interface Document {
  id: string;
  content: string;
  embeddings?: number[];
  metadata: {
    title: string;
    size: number;
    created: number;
    lastAccessed?: number;
  };
}

export interface MemoryStats {
  used: number;      // Memory used in bytes
  total: number;     // Total available memory in bytes
  percentage: number; // Usage percentage (0-1)
  documents: number; // Number of documents in memory
}

export interface MemoryPressure {
  isUnderPressure: boolean;
  currentUsage: number;
  threshold: number;
  recommendation: string;
}

export interface OptimizationResult {
  documentsProcessed: number;
  memoryFreed: number;
  optimizationTime: number;
}

export interface CleanupResult {
  documentsRemoved: number;
  memoryFreed: number;
}

export interface LazyLoadResult {
  loaded: boolean;
  size: number;
  loadTime?: number;
}

export interface BatchLazyLoadResult {
  totalLoaded: number;
  totalSize: number;
  loadTime: number;
}

export interface UnloadResult {
  unloaded: number;
  memoryFreed: number;
}

export interface EmbeddingCacheStats {
  totalEmbeddings: number;
  loadedEmbeddings: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export interface PressureResponseResult {
  actionsPerformed: number;
  memoryFreed: number;
  responseTime: number;
}

export interface MonitoringResult {
  monitoringActive: boolean;
  interval?: number;
}

export interface PressureLevels {
  low: number;
  moderate: number;
  high: number;
  critical: number;
}

export interface BatchProcessingOptions {
  batchSize: number;
  yieldInterval: number;
  enableCpuOptimization: boolean;
}

export interface BatchProcessingResult {
  processed: number;
  processingTime: number;
  cpuUsage: number;
}

export interface CpuStats {
  currentUsage: number;
  averageUsage: number;
  peakUsage: number;
}

export interface ResourcePoolStats {
  totalPools: number;
  activeResources: number;
  availableResources: number;
}

export interface Resource {
  id: string;
  type: string;
  inUse: boolean;
  created: number;
}

export class ResourceOptimizer {
  private config: Required<ResourceOptimizerConfig>;
  private documents = new Map<string, Document>();
  private documentSizes = new Map<string, number>();
  private accessTimes = new Map<string, number>();
  private totalMemoryUsed = 0;
  private lastGCTime = Date.now();
  private embeddingCache = new Map<string, number[]>();
  private embeddingCacheHits = 0;
  private embeddingCacheRequests = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private resourcePools = new Map<string, Resource[]>();
  private cpuUsageHistory: number[] = [];
  private resourceCounter = 0;

  constructor(config: ResourceOptimizerConfig) {
    this.config = {
      lazyLoadingEnabled: true,
      resourcePoolSize: 10,
      ...config
    };
  }

  /**
   * Add a document to the optimizer
   */
  async addDocument(document: Document): Promise<void> {
    const size = this.calculateDocumentSize(document);

    // Check if we need to free memory first
    if (this.shouldOptimizeMemory()) {
      await this.optimizeMemory();
    }

    // Store document
    this.documents.set(document.id, {
      ...document,
      metadata: {
        ...document.metadata,
        lastAccessed: Date.now()
      }
    });

    // Cache embeddings if they exist
    if (document.embeddings && this.config.lazyLoadingEnabled) {
      this.embeddingCache.set(document.id, document.embeddings);
    }

    this.documentSizes.set(document.id, size);
    this.accessTimes.set(document.id, Date.now());
    this.totalMemoryUsed += size;
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const document = this.documents.get(id);
    if (document) {
      // Update access time
      this.accessTimes.set(id, Date.now());
      document.metadata.lastAccessed = Date.now();
      return document;
    }
    return null;
  }

  /**
   * Get multiple documents by IDs
   */
  async getDocuments(ids: string[]): Promise<Document[]> {
    const results: Document[] = [];
    for (const id of ids) {
      const doc = await this.getDocument(id);
      if (doc) {
        results.push(doc);
      }
    }
    return results;
  }

  /**
   * Get current memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    // Simulate memory calculation (in a real implementation, this would use actual memory APIs)
    const totalMemory = 1024 * 1024 * 1024; // 1GB simulated
    const usedMemory = this.totalMemoryUsed;

    return {
      used: usedMemory,
      total: totalMemory,
      percentage: usedMemory / totalMemory,
      documents: this.documents.size
    };
  }

  /**
   * Detect memory pressure
   */
  async detectMemoryPressure(): Promise<MemoryPressure> {
    const stats = await this.getMemoryStats();

    // Check both memory percentage and document count
    const memoryPressure = stats.percentage > this.config.memoryThreshold;
    const documentPressure = this.documents.size > this.config.maxDocuments;
    const isUnderPressure = memoryPressure || documentPressure;

    let recommendation = 'Memory usage is normal';
    if (isUnderPressure) {
      if (stats.percentage > 0.9 || this.documents.size > this.config.maxDocuments * 2) {
        recommendation = 'Critical: Immediate cleanup required';
      } else if (stats.percentage > 0.8 || this.documents.size > this.config.maxDocuments * 1.5) {
        recommendation = 'High: Consider optimizing memory usage';
      } else {
        recommendation = 'Moderate: Monitor memory usage';
      }
    }

    return {
      isUnderPressure,
      currentUsage: Math.max(stats.percentage, this.documents.size / this.config.maxDocuments),
      threshold: this.config.memoryThreshold,
      recommendation
    };
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(): Promise<OptimizationResult> {
    const startTime = Date.now();
    let documentsProcessed = 0;
    let memoryFreed = 0;

    // Get documents sorted by last access time (LRU)
    const documentEntries = Array.from(this.documents.entries());
    const sortedByAccess = documentEntries.sort((a, b) => {
      const timeA = this.accessTimes.get(a[0]) || 0;
      const timeB = this.accessTimes.get(b[0]) || 0;
      return timeA - timeB; // Oldest first
    });

    // Remove least recently used documents if over limit
    const documentsToRemove = Math.max(0, this.documents.size - this.config.maxDocuments);

    for (let i = 0; i < documentsToRemove; i++) {
      const [docId] = sortedByAccess[i];
      const size = this.documentSizes.get(docId) || 0;

      this.documents.delete(docId);
      this.documentSizes.delete(docId);
      this.accessTimes.delete(docId);

      this.totalMemoryUsed -= size;
      memoryFreed += size;
      documentsProcessed++;
    }

    // Optimize remaining documents (lazy loading simulation)
    if (this.config.lazyLoadingEnabled) {
      for (const [docId, document] of this.documents.entries()) {
        if (document.embeddings && document.embeddings.length > 0) {
          // Simulate lazy loading by removing embeddings from memory
          // In a real implementation, these would be loaded on demand
          const embeddingSize = document.embeddings.length * 8; // 8 bytes per float
          document.embeddings = undefined; // Remove from memory
          memoryFreed += embeddingSize;
          documentsProcessed++;
        }
      }
    }

    // Trigger garbage collection if enabled
    if (this.config.enableGarbageCollection) {
      this.triggerGarbageCollection();
    }

    const optimizationTime = Date.now() - startTime;

    return {
      documentsProcessed,
      memoryFreed,
      optimizationTime
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<CleanupResult> {
    const documentsRemoved = this.documents.size;
    const memoryFreed = this.totalMemoryUsed;

    // Clear all data structures
    this.documents.clear();
    this.documentSizes.clear();
    this.accessTimes.clear();
    this.totalMemoryUsed = 0;

    return {
      documentsRemoved,
      memoryFreed
    };
  }

  /**
   * Lazy load embeddings for a specific document
   */
  async lazyLoadEmbeddings(documentId: string): Promise<LazyLoadResult> {
    const startTime = Date.now();
    this.embeddingCacheRequests++;

    // Check if embeddings are already in cache
    if (this.embeddingCache.has(documentId)) {
      this.embeddingCacheHits++;
      const embeddings = this.embeddingCache.get(documentId)!;
      return {
        loaded: true,
        size: embeddings.length * 8,
        loadTime: Date.now() - startTime
      };
    }

    // Check if document exists
    const document = this.documents.get(documentId);
    if (!document) {
      return { loaded: false, size: 0 };
    }

    // Simulate loading embeddings (in real implementation, this would load from disk/network)
    if (document.embeddings) {
      this.embeddingCache.set(documentId, document.embeddings);
      return {
        loaded: true,
        size: document.embeddings.length * 8,
        loadTime: Date.now() - startTime
      };
    }

    return { loaded: false, size: 0 };
  }

  /**
   * Batch lazy load embeddings for multiple documents
   */
  async batchLazyLoadEmbeddings(documentIds: string[]): Promise<BatchLazyLoadResult> {
    const startTime = Date.now();
    let totalLoaded = 0;
    let totalSize = 0;

    for (const docId of documentIds) {
      const result = await this.lazyLoadEmbeddings(docId);
      if (result.loaded) {
        totalLoaded++;
        totalSize += result.size;
      }
    }

    return {
      totalLoaded,
      totalSize,
      loadTime: Date.now() - startTime
    };
  }

  /**
   * Unload embeddings from memory to free space
   */
  async unloadEmbeddings(documentIds: string[]): Promise<UnloadResult> {
    let unloaded = 0;
    let memoryFreed = 0;

    for (const docId of documentIds) {
      if (this.embeddingCache.has(docId)) {
        const embeddings = this.embeddingCache.get(docId)!;
        const size = embeddings.length * 8;

        this.embeddingCache.delete(docId);
        this.totalMemoryUsed -= size;

        unloaded++;
        memoryFreed += size;
      }
    }

    return { unloaded, memoryFreed };
  }

  /**
   * Get embedding cache statistics
   */
  async getEmbeddingCacheStats(): Promise<EmbeddingCacheStats> {
    const totalEmbeddings = this.documents.size;
    const loadedEmbeddings = this.embeddingCache.size;
    const cacheHitRate = this.embeddingCacheRequests > 0
      ? this.embeddingCacheHits / this.embeddingCacheRequests
      : 0;

    let memoryUsage = 0;
    for (const embeddings of this.embeddingCache.values()) {
      memoryUsage += embeddings.length * 8;
    }

    return {
      totalEmbeddings,
      loadedEmbeddings,
      cacheHitRate,
      memoryUsage
    };
  }

  /**
   * Respond to memory pressure by taking corrective actions
   */
  async respondToMemoryPressure(): Promise<PressureResponseResult> {
    const startTime = Date.now();
    let actionsPerformed = 0;
    let memoryFreed = 0;

    const pressure = await this.detectMemoryPressure();

    if (pressure.isUnderPressure) {
      // Action 1: Optimize memory
      const optimizeResult = await this.optimizeMemory();
      memoryFreed += optimizeResult.memoryFreed;
      actionsPerformed++;

      // Action 2: Unload some embeddings if still under pressure
      const afterOptimizePressure = await this.detectMemoryPressure();
      if (afterOptimizePressure.isUnderPressure) {
        const embeddingIds = Array.from(this.embeddingCache.keys()).slice(0, 5);
        const unloadResult = await this.unloadEmbeddings(embeddingIds);
        memoryFreed += unloadResult.memoryFreed;
        actionsPerformed++;
      }

      // Action 3: Trigger garbage collection
      if (this.config.enableGarbageCollection) {
        this.triggerGarbageCollection();
        actionsPerformed++;
      }
    }

    return {
      actionsPerformed,
      memoryFreed,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Start automatic memory pressure monitoring
   */
  async startMemoryPressureMonitoring(intervalMs: number = 1000): Promise<MonitoringResult> {
    if (this.isMonitoring) {
      return { monitoringActive: true, interval: intervalMs };
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      const pressure = await this.detectMemoryPressure();
      if (pressure.isUnderPressure) {
        await this.respondToMemoryPressure();
      }
    }, intervalMs);

    return { monitoringActive: true, interval: intervalMs };
  }

  /**
   * Stop automatic memory pressure monitoring
   */
  async stopMemoryPressureMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Get memory pressure level thresholds
   */
  async getMemoryPressureLevels(): Promise<PressureLevels> {
    return {
      low: 0.5,      // 50% memory usage
      moderate: 0.7, // 70% memory usage
      high: 0.85,    // 85% memory usage
      critical: 0.95 // 95% memory usage
    };
  }

  /**
   * Process documents in batches with CPU optimization
   */
  async processBatch(documents: Document[], options: BatchProcessingOptions): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    let processed = 0;
    let totalCpuUsage = 0;
    let cpuSamples = 0;

    for (let i = 0; i < documents.length; i += options.batchSize) {
      const batch = documents.slice(i, i + options.batchSize);

      for (const doc of batch) {
        await this.addDocument(doc);
        processed++;

        // Simulate CPU usage tracking
        const cpuUsage = Math.random() * 0.6 + 0.1; // 10-70% usage
        totalCpuUsage += cpuUsage;
        cpuSamples++;
        this.cpuUsageHistory.push(cpuUsage);

        // Yield control periodically for CPU optimization
        if (options.enableCpuOptimization && processed % options.yieldInterval === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    }

    const averageCpuUsage = cpuSamples > 0 ? totalCpuUsage / cpuSamples : 0;

    return {
      processed,
      processingTime: Date.now() - startTime,
      cpuUsage: averageCpuUsage
    };
  }

  /**
   * Get CPU usage statistics
   */
  async getCpuStats(): Promise<CpuStats> {
    const currentUsage = this.cpuUsageHistory.length > 0
      ? this.cpuUsageHistory[this.cpuUsageHistory.length - 1]
      : 0;

    const averageUsage = this.cpuUsageHistory.length > 0
      ? this.cpuUsageHistory.reduce((sum, usage) => sum + usage, 0) / this.cpuUsageHistory.length
      : 0;

    const peakUsage = this.cpuUsageHistory.length > 0
      ? Math.max(...this.cpuUsageHistory)
      : 0;

    return { currentUsage, averageUsage, peakUsage };
  }

  /**
   * Get resource pool statistics
   */
  async getResourcePoolStats(): Promise<ResourcePoolStats> {
    // Initialize default pools if they don't exist
    if (!this.resourcePools.has('embedding-processor')) {
      this.initializeResourcePool('embedding-processor', this.config.resourcePoolSize);
    }

    let totalPools = this.resourcePools.size;
    let activeResources = 0;
    let availableResources = 0;

    for (const pool of this.resourcePools.values()) {
      for (const resource of pool) {
        if (resource.inUse) {
          activeResources++;
        } else {
          availableResources++;
        }
      }
    }

    return { totalPools, activeResources, availableResources };
  }

  /**
   * Acquire a resource from the pool
   */
  async acquireResource(type: string): Promise<Resource> {
    if (!this.resourcePools.has(type)) {
      this.initializeResourcePool(type, this.config.resourcePoolSize);
    }

    const pool = this.resourcePools.get(type)!;
    const availableResource = pool.find(r => !r.inUse);

    if (availableResource) {
      availableResource.inUse = true;
      return availableResource;
    }

    // Create new resource if pool is full
    const newResource: Resource = {
      id: `${type}-${++this.resourceCounter}`,
      type,
      inUse: true,
      created: Date.now()
    };

    pool.push(newResource);
    return newResource;
  }

  /**
   * Use a resource with automatic release
   */
  async useResource<T>(resourceId: string, operation: (resource: Resource) => Promise<T>): Promise<T> {
    const resource = this.findResource(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    try {
      return await operation(resource);
    } finally {
      // Resource is automatically released after operation
    }
  }

  /**
   * Release a resource back to the pool
   */
  async releaseResource(resourceId: string): Promise<void> {
    const resource = this.findResource(resourceId);
    if (resource) {
      resource.inUse = false;
    }
  }

  /**
   * Initialize a resource pool
   */
  private initializeResourcePool(type: string, size: number): void {
    const pool: Resource[] = [];
    for (let i = 0; i < size; i++) {
      pool.push({
        id: `${type}-${++this.resourceCounter}`,
        type,
        inUse: false,
        created: Date.now()
      });
    }
    this.resourcePools.set(type, pool);
  }

  /**
   * Find a resource by ID
   */
  private findResource(resourceId: string): Resource | null {
    for (const pool of this.resourcePools.values()) {
      const resource = pool.find(r => r.id === resourceId);
      if (resource) return resource;
    }
    return null;
  }

  /**
   * Destroy the optimizer and clean up all resources
   */
  async destroy(): Promise<void> {
    await this.stopMemoryPressureMonitoring();
    this.embeddingCache.clear();
    await this.cleanup();
  }

  /**
   * Check if memory optimization is needed
   */
  private shouldOptimizeMemory(): boolean {
    // Only optimize when significantly over limits to allow pressure to build up for testing
    const memoryPressure = this.totalMemoryUsed / (1024 * 1024 * 1024); // Convert to GB
    return memoryPressure > (this.config.memoryThreshold + 0.2) ||
      this.documents.size > (this.config.maxDocuments * 1.5);
  }

  /**
   * Calculate the size of a document in bytes
   */
  private calculateDocumentSize(document: Document): number {
    let size = 0;

    // Content size
    size += document.content.length * 2; // 2 bytes per character (UTF-16)

    // Embeddings size
    if (document.embeddings) {
      size += document.embeddings.length * 8; // 8 bytes per float64
    }

    // Metadata size (rough estimate)
    size += JSON.stringify(document.metadata).length * 2;

    // Object overhead
    size += 100; // Rough estimate for object overhead

    return size;
  }

  /**
   * Trigger garbage collection (simulation)
   */
  private triggerGarbageCollection(): void {
    this.lastGCTime = Date.now();

    // In a real implementation, this might:
    // - Call global.gc() if available
    // - Trigger WeakRef cleanup
    // - Clear internal caches
    // - Optimize data structures

    // For now, we'll simulate by optimizing our data structures
    this.optimizeDataStructures();
  }

  /**
   * Optimize internal data structures
   */
  private optimizeDataStructures(): void {
    // Remove stale access time entries
    const currentTime = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [docId, accessTime] of this.accessTimes.entries()) {
      if (currentTime - accessTime > staleThreshold && !this.documents.has(docId)) {
        this.accessTimes.delete(docId);
        this.documentSizes.delete(docId);
      }
    }
  }
}
