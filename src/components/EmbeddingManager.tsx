import { useState } from 'react';
import { useAppStore } from '../store';
import { EmbeddingEngine } from '../lib/embeddingEngine';
import { ollama } from '../lib/ollama';
import type { Document, EmbeddingProgress } from '../types';

interface EmbeddingManagerProps {
  document: Document;
}

export function EmbeddingManager({ document }: EmbeddingManagerProps) {
  const { 
    embeddings, 
    addEmbeddings, 
    embeddingProgress, 
    setEmbeddingProgress, 
    clearEmbeddingProgress 
  } = useAppStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);

  const documentEmbeddings = embeddings.get(document.id);
  const progress = embeddingProgress.get(document.id);

  const checkOllamaStatus = async () => {
    try {
      const available = await ollama.isAvailable();
      setOllamaAvailable(available);
      return available;
    } catch {
      setOllamaAvailable(false);
      return false;
    }
  };

  const generateEmbeddings = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      // Check if Ollama is available
      const available = await checkOllamaStatus();
      if (!available) {
        throw new Error('Ollama is not available. Please ensure Ollama is running on http://127.0.0.1:11434');
      }

      // Generate embeddings with progress callback
      const embeddedChunks = await EmbeddingEngine.generateDocumentEmbeddings(
        document.id,
        document.text,
        (progressUpdate: EmbeddingProgress) => {
          setEmbeddingProgress(document.id, progressUpdate);
        }
      );

      // Store embeddings
      addEmbeddings(document.id, embeddedChunks);
      clearEmbeddingProgress(document.id);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate embeddings');
      clearEmbeddingProgress(document.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const getEmbeddingStats = () => {
    if (!documentEmbeddings) return null;
    
    const totalChunks = documentEmbeddings.length;
    const totalCharacters = documentEmbeddings.reduce((sum, chunk) => sum + chunk.text.length, 0);
    const averageChunkSize = Math.round(totalCharacters / totalChunks);
    const embeddingDimensions = documentEmbeddings[0]?.embedding?.length || 0;
    
    return {
      totalChunks,
      totalCharacters,
      averageChunkSize,
      embeddingDimensions,
      lastGenerated: documentEmbeddings[0]?.embeddingTimestamp
    };
  };

  const stats = getEmbeddingStats();

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Embeddings</h3>
        <div className="flex items-center space-x-2">
          {ollamaAvailable === null ? (
            <span className="text-gray-400 text-sm">⏳ Checking...</span>
          ) : ollamaAvailable ? (
            <span className="text-green-400 text-sm">✅ Ollama Ready</span>
          ) : (
            <span className="text-red-400 text-sm">❌ Ollama Unavailable</span>
          )}
        </div>
      </div>

      {/* Status and Stats */}
      <div className="mb-4">
        {documentEmbeddings ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✅</span>
              <span className="text-white">Embeddings generated</span>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div>Chunks: {stats.totalChunks}</div>
                <div>Dimensions: {stats.embeddingDimensions}</div>
                <div>Avg Size: {stats.averageChunkSize} chars</div>
                <div>
                  Generated: {new Date(stats.lastGenerated).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">⚪</span>
            <span className="text-gray-300">No embeddings generated</span>
          </div>
        )}
      </div>

      {/* Progress */}
      {isGenerating && progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">Generating embeddings...</span>
            <span className="text-gray-300 text-sm">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Processing chunk {progress.current} of {progress.total}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={generateEmbeddings}
          disabled={isGenerating || ollamaAvailable === false}
          className="glass-button text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 hover:bg-opacity-20"
        >
          {isGenerating ? '⏳ Generating...' : documentEmbeddings ? '🔄 Regenerate' : '🚀 Generate Embeddings'}
        </button>
        
        {!ollamaAvailable && (
          <button
            onClick={checkOllamaStatus}
            className="glass-button text-white text-sm hover:bg-green-500 hover:bg-opacity-20"
          >
            🔍 Check Ollama
          </button>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-3 text-xs text-gray-400">
        Embeddings enable semantic search and Q&A features. Requires Ollama with nomic-embed-text model.
      </div>
    </div>
  );
}
