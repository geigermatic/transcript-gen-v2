/**
 * Configurable chunking and processing options for speed optimization
 */

export interface ChunkingConfig {
  mode: 'balanced' | 'fast' | 'quality' | 'ultra-fast' | 'custom';
  chunkSize: number;
  overlap: number;
  maxChunks?: number; // Limit total chunks for very large documents
  parallelProcessing: boolean;
  batchSize: number; // For parallel processing
  description: string;
}

export interface ProcessingConfig {
  chunking: ChunkingConfig;
  enableParallelFactExtraction: boolean;
  factExtractionTimeout: number; // ms
  enableFastMode: boolean; // Skip detailed analysis for speed
  maxRetries: number;
}

export const CHUNKING_PRESETS: Record<string, ChunkingConfig> = {
  'ultra-fast': {
    mode: 'ultra-fast',
    chunkSize: 8000, // ~1600 words - 3x larger chunks
    overlap: 100,    // Reduced overlap
    maxChunks: 10,   // Hard limit for very large docs
    parallelProcessing: true,
    batchSize: 4,    // Process 4 chunks simultaneously
    description: 'Ultra-fast processing with large chunks and parallel processing. Best for getting quick overviews of large documents.'
  },
  'fast': {
    mode: 'fast',
    chunkSize: 5000, // ~1000 words - 2x larger chunks
    overlap: 150,
    maxChunks: 20,
    parallelProcessing: true,
    batchSize: 3,
    description: 'Fast processing with larger chunks and parallel processing. Good balance of speed and quality.'
  },
  'balanced': {
    mode: 'balanced',
    chunkSize: 2500, // Current default
    overlap: 200,
    parallelProcessing: true,
    batchSize: 2,
    description: 'Balanced processing for good quality and reasonable speed. Default setting.'
  },
  'quality': {
    mode: 'quality',
    chunkSize: 1500, // Smaller chunks for better analysis
    overlap: 300,
    parallelProcessing: false,
    batchSize: 1,
    description: 'High-quality processing with smaller chunks for detailed analysis. Slower but more thorough.'
  }
};

export const PROCESSING_PRESETS: Record<string, ProcessingConfig> = {
  'ultra-fast': {
    chunking: CHUNKING_PRESETS['ultra-fast'],
    enableParallelFactExtraction: true,
    factExtractionTimeout: 15000, // 15s timeout per chunk
    enableFastMode: true,
    maxRetries: 1
  },
  'fast': {
    chunking: CHUNKING_PRESETS['fast'],
    enableParallelFactExtraction: true,
    factExtractionTimeout: 25000, // 25s timeout per chunk
    enableFastMode: true,
    maxRetries: 2
  },
  'balanced': {
    chunking: CHUNKING_PRESETS['balanced'],
    enableParallelFactExtraction: true,
    factExtractionTimeout: 40000, // 40s timeout per chunk
    enableFastMode: false,
    maxRetries: 2
  },
  'quality': {
    chunking: CHUNKING_PRESETS['quality'],
    enableParallelFactExtraction: false,
    factExtractionTimeout: 60000, // 60s timeout per chunk
    enableFastMode: false,
    maxRetries: 3
  }
};

export class ChunkingConfigManager {
  private static currentConfig: ProcessingConfig = PROCESSING_PRESETS['balanced'];

  static getCurrentConfig(): ProcessingConfig {
    return this.currentConfig;
  }

  static setConfig(preset: keyof typeof PROCESSING_PRESETS): void {
    this.currentConfig = PROCESSING_PRESETS[preset];
  }

  static setCustomConfig(config: ProcessingConfig): void {
    this.currentConfig = config;
  }

  static getEstimatedProcessingTime(documentWordCount: number): {
    estimatedChunks: number;
    estimatedTimeMinutes: number;
    description: string;
  } {
    const config = this.currentConfig;
    const wordsPerChunk = config.chunking.chunkSize / 5; // Rough words per chunk
    let estimatedChunks = Math.ceil(documentWordCount / wordsPerChunk);

    // Apply max chunks limit
    if (config.chunking.maxChunks) {
      estimatedChunks = Math.min(estimatedChunks, config.chunking.maxChunks);
    }

    // Base processing time per chunk (varies by mode)
    const baseTimePerChunk = config.enableFastMode ? 0.5 : 1.5; // minutes
    
    // Adjust for parallel processing
    const effectiveTime = config.enableParallelFactExtraction 
      ? estimatedChunks / config.chunking.batchSize * baseTimePerChunk
      : estimatedChunks * baseTimePerChunk;

    return {
      estimatedChunks,
      estimatedTimeMinutes: Math.max(0.5, effectiveTime),
      description: `Processing ${estimatedChunks} chunks with ${config.chunking.mode} mode`
    };
  }

  static getAvailablePresets(): Array<{
    key: string;
    name: string;
    description: string;
    chunkSize: number;
    estimatedSpeed: string;
  }> {
    return Object.entries(PROCESSING_PRESETS).map(([key, config]) => ({
      key,
      name: config.chunking.mode.charAt(0).toUpperCase() + config.chunking.mode.slice(1),
      description: config.chunking.description,
      chunkSize: config.chunking.chunkSize,
      estimatedSpeed: this.getSpeedDescription(config.chunking.mode)
    }));
  }

  private static getSpeedDescription(mode: string): string {
    switch (mode) {
      case 'ultra-fast': return '⚡ ~3-5x faster';
      case 'fast': return '🚀 ~2x faster';
      case 'balanced': return '⚖️ Standard speed';
      case 'quality': return '🎯 Slower, higher quality';
      default: return 'Standard speed';
    }
  }
}
