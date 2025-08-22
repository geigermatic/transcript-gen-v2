/**
 * CompactSummaryViewer - Compact summary display for sidebar use
 * Features tabs for stylized vs raw summaries and compact layout
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Clock, User } from 'lucide-react';
import type { Document, SummarizationResult } from '../types';

interface CompactSummaryViewerProps {
  document: Document;
  summary: SummarizationResult;
  activeTab: 'stylized' | 'raw';
  compact?: boolean;
}

export const CompactSummaryViewer: React.FC<CompactSummaryViewerProps> = ({
  document,
  summary,
  activeTab,

}) => {
  if (!summary) {
    return (
      <div className="text-center py-4">
        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No summary available</p>
        <p className="text-gray-400 text-xs">
          Process this document to generate a summary
        </p>
      </div>
    );
  }

  const renderSummaryContent = () => {
    if (activeTab === 'stylized') {
      return summary.styledSummary || 'No stylized summary available';
    } else {
      return summary.rawSummary || 'No raw summary available';
    }
  };

  const renderSourceCarousel = () => {
    // Mock source data - in real implementation this would come from the summary
    const mockSources = [
      { title: 'Document Analysis', type: 'transcript', confidence: 0.95 },
      { title: 'Style Guide Applied', type: 'processing', confidence: 0.92 },
      { title: 'Content Extraction', type: 'ai', confidence: 0.89 }
    ];

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Sources</h4>
        <div className="space-y-2">
          {mockSources.map((source, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {source.title}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {source.type} • {(source.confidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Document Info */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h4 className="font-medium text-gray-800 text-sm">
            {document.title || document.filename}
          </h4>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(document.uploadedAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {document.metadata?.wordCount || 'Unknown'} words
          </span>
        </div>
      </div>

      {/* Summary Content */}
      <div className="prose prose-sm max-w-none">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}

          >
            {renderSummaryContent()}
          </ReactMarkdown>
        </div>
      </div>

      {/* Source Carousel */}
      {renderSourceCarousel()}

      {/* Processing Info */}
      {summary.processingStats && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
          <p>Processed {summary.processingStats.totalChunks} chunks</p>
          <p>Success: {summary.processingStats.successfulChunks} • Failed: {summary.processingStats.failedChunks}</p>
        </div>
      )}
    </div>
  );
};
