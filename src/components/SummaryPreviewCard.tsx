/**
 * SummaryPreviewCard - Summary preview with copy functionality
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, FileText, Clock, Database } from 'lucide-react';
import { logInfo } from '../lib/logger';

interface SummaryPreviewCardProps {
  summary?: string; // Backward compatibility - defaults to styled summary
  rawSummary?: string;
  styledSummary?: string;
  isLoading?: boolean;
  chunksProcessed?: number;
  totalChunks?: number;
  processingStartTime?: Date;
  progressPercent?: number;
  progressStatus?: string;
}

export const SummaryPreviewCard: React.FC<SummaryPreviewCardProps> = ({ 
  summary, 
  rawSummary,
  styledSummary,
  isLoading = false,
  chunksProcessed = 0,
  totalChunks = 0,
  processingStartTime,
  progressPercent = 0,
  progressStatus = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'styled'>('styled');
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

  // Determine which summaries are available and what to display
  const hasRawSummary = !!rawSummary;
  const hasStyledSummary = !!(styledSummary || summary); // backward compatibility
  const hasBothSummaries = hasRawSummary && hasStyledSummary;
  const currentSummary = activeTab === 'raw' ? rawSummary : (styledSummary || summary);

  const handleCopy = async () => {
    if (!currentSummary) return;
    
    try {
      await navigator.clipboard.writeText(currentSummary);
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
          disabled={isLoading || !currentSummary}
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
              <span>{progressStatus || 'Processing chunks'}</span>
              <span>{progressPercent > 0 ? `${Math.round(progressPercent)}%` : `${chunksProcessed}/${totalChunks}`}</span>
            </div>
            <div className="w-full bg-white bg-opacity-10 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent > 0 ? progressPercent : (totalChunks > 0 ? (chunksProcessed / totalChunks) * 100 : 0)}%` }}
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

      {/* Tabs for dual summaries */}
      {hasBothSummaries && !isLoading && (
        <div className="flex bg-white bg-opacity-5 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('styled')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'styled'
                ? 'bg-blue-500 bg-opacity-20 text-blue-200 shadow-sm'
                : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-5'
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Stylized Summary
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'raw'
                ? 'bg-blue-500 bg-opacity-20 text-blue-200 shadow-sm'
                : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-5'
            }`}
          >
            <Database size={16} className="inline mr-2" />
            Raw Summary
          </button>
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
        ) : currentSummary ? (
          <div className="content-area">
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-gray-900 mb-3 mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-4 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-medium text-gray-800 mb-2 mt-3">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-medium text-gray-800 mb-1 mt-2">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-gray-700 mb-3 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-gray-700 mb-3 space-y-1 list-decimal list-inside">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-3 bg-blue-50 py-2">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-gray-900 font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-gray-700 italic">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 text-gray-800 p-3 rounded-lg overflow-x-auto mb-3 font-mono text-sm">
                      {children}
                    </pre>
                  ),
                }}
              >
                {currentSummary}
              </ReactMarkdown>
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

      {currentSummary && !isLoading && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-gray-600 text-sm">
            <span>
              Summary generated from transcript analysis
              {hasBothSummaries && (
                <span className="ml-2 text-blue-600">
                  ({activeTab === 'raw' ? 'Raw version' : 'Stylized version'})
                </span>
              )}
            </span>
            <span>{currentSummary.split(' ').length} words</span>
          </div>
        </div>
      )}
    </div>
  );
};
