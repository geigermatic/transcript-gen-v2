/**
 * SummaryPreviewCard - Summary preview with copy functionality
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, FileText, Database, Clock, RefreshCw } from 'lucide-react';
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
  onRegenerateStyled?: () => void;
  regenerationSuccess?: boolean;
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
  progressStatus = '',
  onRegenerateStyled,
  regenerationSuccess
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'styled'>('styled');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showRegenerationSuccess, setShowRegenerationSuccess] = useState(false);

  // Debug logging for regeneration
  useEffect(() => {
    console.log('🔄 SummaryPreviewCard props changed:', {
      isLoading,
      totalChunks,
      chunksProcessed,
      progressStatus,
      hasSummary: !!summary,
      hasRawSummary: !!rawSummary,
      hasStyledSummary: !!styledSummary
    });
  }, [isLoading, totalChunks, chunksProcessed, progressStatus, summary, rawSummary, styledSummary]);

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

  // Show success message when loading stops (regeneration completes)
  useEffect(() => {
    if (!isLoading && (showRegenerationSuccess || regenerationSuccess)) {
      const timer = setTimeout(() => setShowRegenerationSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, showRegenerationSuccess, regenerationSuccess]);

  // Track when regeneration starts
  useEffect(() => {
    if (isLoading && onRegenerateStyled) {
      setShowRegenerationSuccess(false);
    }
  }, [isLoading, onRegenerateStyled]);

  // Set success state when prop changes
  useEffect(() => {
    if (regenerationSuccess) {
      setShowRegenerationSuccess(true);
    }
  }, [regenerationSuccess]);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine which summaries are available and what to display
  const hasRawSummary = !!rawSummary;
  const hasStyledSummary = !!(styledSummary || summary); // backward compatibility
  const hasBothSummaries = hasRawSummary && hasStyledSummary;
  const currentSummary = activeTab === 'raw' ? rawSummary : (styledSummary || summary);

  // Show regenerate button if we have a styled summary and the callback is provided
  const canRegenerate = hasStyledSummary && !!onRegenerateStyled;

  // Simple loading state detection - show loading if any of these conditions are true
  const showRegenerationLoading = isLoading || (progressStatus && progressStatus.includes('Regenerating')) || (progressStatus && progressStatus.includes('Calling AI'));

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
        <div className="flex items-center gap-2">
          {/* Regenerate button - show whenever we have a styled summary */}
          {canRegenerate && (
            <button
              onClick={onRegenerateStyled}
              disabled={showRegenerationLoading || progressStatus?.includes('Calling AI') || progressStatus?.includes('Processing AI')}
              className={`glass-button flex items-center gap-2 focus-visible transition-all ${
                (showRegenerationLoading || progressStatus?.includes('Calling AI') || progressStatus?.includes('Processing AI'))
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-500 hover:bg-opacity-20'
              }`}
              title={(showRegenerationLoading || progressStatus?.includes('Calling AI') || progressStatus?.includes('Processing AI')) ? 'Regeneration in progress...' : 'Regenerate stylized summary with style guide'}
            >
              <RefreshCw size={16} className={(showRegenerationLoading || progressStatus?.includes('Calling AI') || progressStatus?.includes('Processing AI')) ? 'animate-spin' : ''} />
              <span>{(showRegenerationLoading || progressStatus?.includes('Calling AI') || progressStatus?.includes('Processing AI')) ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
          )}
          
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

          {/* Elapsed time indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-white text-opacity-60">
            <Clock size={14} />
            <span>Elapsed: {formatTime(elapsedTime)}</span>
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
                : 'text-gray-800 hover:text-gray-700 hover:bg-white hover:bg-opacity-10'
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
                : 'text-gray-800 hover:text-gray-700 hover:bg-white hover:bg-opacity-10'
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
            {/* Show regeneration message if we have a previous summary */}
            {currentSummary && (
              <div className="flex items-center justify-center gap-3 py-8 text-blue-300">
                <RefreshCw size={20} className="animate-spin" />
                <span className="text-lg font-medium">Regenerating summary...</span>
              </div>
            )}
            
            {/* Loading skeleton */}
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-4/5" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-3/4" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-5/6" />
          </div>
        ) : currentSummary ? (
          <div className={`content-area transition-opacity duration-300 ${
            (showRegenerationLoading || progressStatus?.includes('Calling AI') || progressStatus?.includes('Processing AI')) 
              ? 'opacity-40' 
              : 'opacity-100'
          } relative`}>
            
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
                    <h3 className="text-base font-medium text-gray-800 mb-1 mt-2">{children}</h3>
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

      {/* Success message when regeneration completes */}
      {showRegenerationSuccess && !isLoading && (
        <div className="mt-4 p-3 bg-green-500 bg-opacity-20 border border-green-400 rounded-lg">
          <div className="flex items-center gap-2 text-green-300">
            <Check size={16} />
            <span className="text-sm font-medium">Summary regenerated successfully!</span>
          </div>
        </div>
      )}

      {/* Regeneration info */}
      {canRegenerate && !isLoading && (
        <div className="mt-4 p-3 bg-blue-500 bg-opacity-10 border border-blue-400 rounded-lg">
          <div className="flex items-center gap-2 text-blue-300 text-sm">
            <RefreshCw size={14} />
            <span>Ready to regenerate with enhanced variation prompts</span>
          </div>
        </div>
      )}

      {currentSummary && !isLoading && (
        <div className="mt-6 pt-4 border-t border-white border-opacity-20">
          <div className="flex items-center justify-between text-white text-opacity-70 text-sm">
            <span>
              Summary generated from transcript analysis
              {hasBothSummaries && (
                <span className="ml-2 text-blue-300">
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
