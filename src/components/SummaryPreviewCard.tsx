/**
 * SummaryPreviewCard - Summary preview with copy functionality
 */

import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { logInfo } from '../lib/logger';

interface SummaryPreviewCardProps {
  summary?: string;
  isLoading?: boolean;
}

export const SummaryPreviewCard: React.FC<SummaryPreviewCardProps> = ({ 
  summary, 
  isLoading = false 
}) => {
  const [copied, setCopied] = useState(false);

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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading">Summary Preview</h2>
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-4/5" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-3/4" />
            <div className="h-4 bg-white bg-opacity-10 rounded-lg animate-pulse w-5/6" />
          </div>
        ) : summary ? (
          <div className="prose prose-invert max-w-none">
            <div className="text-body leading-relaxed whitespace-pre-line">
              {summary}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-white text-opacity-30 mb-3" />
            <p className="text-body mb-2">No summary yet</p>
            <p className="text-caption">
              Upload and process a document to generate a summary
            </p>
          </div>
        )}
      </div>

      {summary && !isLoading && (
        <div className="mt-6 pt-4 border-t border-white border-opacity-10">
          <div className="flex items-center justify-between text-caption">
            <span>Summary generated from transcript analysis</span>
            <span>{summary.split(' ').length} words</span>
          </div>
        </div>
      )}
    </div>
  );
};
