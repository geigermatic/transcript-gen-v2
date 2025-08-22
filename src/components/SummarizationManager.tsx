import { useState } from 'react';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import { SummaryViewer } from './SummaryViewer';
import { ollama } from '../lib/ollama';
import type { Document, SummarizationResult } from '../types';

interface SummarizationManagerProps {
  document: Document;
}

export function SummarizationManager({ document }: SummarizationManagerProps) {
  const { styleGuide } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [result, setResult] = useState<SummarizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [showViewer, setShowViewer] = useState(false);

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

  const generateSummary = async () => {
    setError(null);
    setIsGenerating(true);
    setProgress({ current: 0, total: 0 });

    try {
      // Check if Ollama is available
      const available = await checkOllamaStatus();
      if (!available) {
        throw new Error('Ollama is not available. Please ensure Ollama is running on http://127.0.0.1:11434');
      }

      // Generate summary with progress updates
      const summaryResult = await SummarizationEngine.summarizeDocument(
        document,
        styleGuide,
        (current: number, total: number, status?: string) => {
          setProgress({ current, total, status });
        }
      );

      setResult(summaryResult);
      setShowViewer(true);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const getSummaryStats = () => {
    if (!result) return null;
    
    return {
      chunksProcessed: result.processingStats.totalChunks,
      successRate: Math.round((result.processingStats.successfulChunks / result.processingStats.totalChunks) * 100),
      processingTime: result.processingStats.processingTime,
      summaryLength: result.markdownSummary.length,
      factCount: Object.keys(result.mergedFacts).filter(key => {
        const value = result.mergedFacts[key as keyof typeof result.mergedFacts];
        return value && (typeof value === 'string' ? value.length > 0 : value.length > 0);
      }).length
    };
  };

  const stats = getSummaryStats();

  return (
    <>
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Summarization</h3>
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
          {result ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-400">✅</span>
                <span className="text-white">Summary generated</span>
              </div>
              
              {stats && (
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                  <div>Chunks: {stats.chunksProcessed}</div>
                  <div>Success: {stats.successRate}%</div>
                  <div>Time: {stats.processingTime > 1000 ? `${(stats.processingTime / 1000).toFixed(1)}s` : `${stats.processingTime}ms`}</div>
                  <div>Facts: {stats.factCount}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">⚪</span>
              <span className="text-gray-300">No summary generated</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {isGenerating && progress.total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">{progress.status || 'Processing...'}</span>
              <span className="text-gray-300 text-sm">
                {Math.round(progress.current)}%
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.current}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {progress.status || `${Math.round(progress.current)}% complete`}
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
            onClick={generateSummary}
            disabled={isGenerating || ollamaAvailable === false}
            className="glass-button text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500 hover:bg-opacity-20"
          >
            {isGenerating ? '⏳ Generating...' : result ? '🔄 Regenerate' : '📝 Generate Summary'}
          </button>
          
          {result && (
            <button
              onClick={() => setShowViewer(true)}
              className="glass-button text-white text-sm hover:bg-blue-500 hover:bg-opacity-20"
            >
              👁️ View Summary
            </button>
          )}
          
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
          Generates structured facts and markdown summary using your style guide. Requires Ollama with llama3.1 model.
        </div>
      </div>

      {/* Summary Viewer Modal */}
      {result && showViewer && (
        <SummaryViewer
          result={result}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}
