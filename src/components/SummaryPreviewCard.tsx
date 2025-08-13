/**
 * SummaryPreviewCard - Summary preview with copy functionality
 */

import React, { useState, useEffect } from 'react';
import { Copy, Check, FileText, Clock, Database } from 'lucide-react';
import { logInfo } from '../lib/logger';

interface SummaryPreviewCardProps {
  summary?: string;
  isLoading?: boolean;
  chunksProcessed?: number;
  totalChunks?: number;
  processingStartTime?: Date;
}

export const SummaryPreviewCard: React.FC<SummaryPreviewCardProps> = ({ 
  summary, 
  isLoading = false,
  chunksProcessed = 0,
  totalChunks = 0,
  processingStartTime
}) => {
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect for processing
  useEffect(() => {
    if (isLoading && processingStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - processingStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoading, processingStartTime]);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate estimated time remaining
  const getEstimatedTimeRemaining = (): string => {
    if (!chunksProcessed || chunksProcessed === 0 || !totalChunks) return 'Calculating...';
    
    const avgTimePerChunk = elapsedTime / chunksProcessed;
    const remainingChunks = totalChunks - chunksProcessed;
    const estimatedSeconds = Math.round(avgTimePerChunk * remainingChunks);
    
    return formatTime(estimatedSeconds);
  };

  const handleCopy = async () => {
    if (!summary) return;
    
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      logInfo('UI', 'Summary copied to clipboard');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logInfo('UI', 'Failed to copy summary', { error });
    }
  };

  return (
    <div className="glass-content-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading">Summary</h2>
        <button
          onClick={handleCopy}
          disabled={isLoading || !summary}
          className="glass-button flex items-center gap-2 focus-visible"
        >
          {copied ? (
            <>
              <Check size={16} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Progress indicators when processing */}
      {isLoading && totalChunks > 0 && (
        <div className="mb-6 space-y-3">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white text-opacity-70">
              <span>Processing chunks</span>
              <span>{chunksProcessed}/{totalChunks}</span>
            </div>
            <div className="w-full bg-white bg-opacity-10 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${totalChunks > 0 ? (chunksProcessed / totalChunks) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Time indicators */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-white text-opacity-60">
              <Clock size={14} />
              <span>Elapsed: {formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-white text-opacity-60">
              <Database size={14} />
              <span>ETA: {getEstimatedTimeRemaining()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-4/5" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-3/4" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-5/6" />
          </div>
        ) : summary ? (
          <div className="content-area">
            <div className="prose prose-gray max-w-none">
              <div className="text-gray-800 leading-relaxed whitespace-pre-line">
                {summary}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-white text-opacity-40 mb-3" />
            <p className="text-white text-opacity-90 mb-2 font-medium">No summary yet</p>
            <p className="text-white text-opacity-70">
              Upload and process a document to generate a summary
            </p>
          </div>
        )}
      </div>

      {summary && !isLoading && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-gray-600 text-sm">
            <span>Summary generated from transcript analysis</span>
            <span>{summary.split(' ').length} words</span>
          </div>
        </div>
      )}
    </div>
  );
};
