/**
 * RecentDocsCard - Recent documents list with metadata
 */

import React, { useState } from 'react';
import { Calendar, FileText, Tag, ChevronDown, ChevronUp, FolderOpen, Trash2, Clock } from 'lucide-react';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
  metadata: {
    filename: string;
    wordCount?: number;
    fileSize?: number;
  };
  tags?: string[];
}

interface RecentDocsCardProps {
  onDocumentSelect?: (doc: Document) => void;
}

export const RecentDocsCard: React.FC<RecentDocsCardProps> = ({ onDocumentSelect }) => {
  const { documents, clearAllData, abSummaryPairs } = useAppStore();
  const [showAll, setShowAll] = useState(false);

  const handleClearAllData = () => {
    const confirmClear = window.confirm(
      `⚠️ Clear All Documents & Data?\n\nThis will permanently delete:\n• ${documents.length} uploaded documents\n• All summaries\n• Chat history\n• Embeddings\n• Processing logs\n\nThis action cannot be undone. Continue?`
    );
    
    if (confirmClear) {
      clearAllData();
      logInfo('UI', 'All data cleared from Recent Documents panel');
    }
  };

  // Helper function to format processing time
  const formatProcessingTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Helper function to get processing time for a document
  const getDocumentProcessingTime = (documentId: string): number | null => {
    const summaryPair = abSummaryPairs.find(pair => pair.documentId === documentId);
    if (summaryPair?.summaryA?.processingStats?.processingTime) {
      return summaryPair.summaryA.processingStats.processingTime;
    }
    return null;
  };

  // Use real documents only - sort by upload date (most recent first)
  const sortedDocuments = documents.sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  
  // Show 10 initially, or all if showAll is true
  const documentsToShow = showAll ? sortedDocuments : sortedDocuments.slice(0, 10);
  const hasMoreDocuments = documents.length > 10;
  
  const displayDocs = documentsToShow.map(doc => ({
    id: doc.id,
    filename: doc.metadata.filename || doc.filename, // Fallback to doc.filename
    tags: doc.tags || ['transcript'],
    date: new Date(doc.uploadedAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    wordCount: doc.metadata.wordCount || 0,
    processingTime: getDocumentProcessingTime(doc.id)
  }));

  const handleDocumentClick = (doc: any) => {
    logInfo('UI', `Recent document clicked: ${doc.filename}`, { docId: doc.id });
    onDocumentSelect?.(doc);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading">Recent Documents</h2>
        <div className="flex items-center gap-3">
          <span className="text-caption">
            {showAll ? `${documents.length} files` : `${Math.min(documents.length, 10)} of ${documents.length} files`}
          </span>
          {documents.length > 0 && (
            <button
              onClick={handleClearAllData}
              className="ghost-button p-2 hover:bg-red-500 hover:bg-opacity-20"
              title="Clear all documents and data"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {displayDocs.length > 0 ? displayDocs.map((doc) => (
          <div
            key={doc.id}
            className="group p-4 rounded-xl border border-white border-opacity-20 bg-white bg-opacity-10 hover:bg-white hover:bg-opacity-20 transition-all duration-200 cursor-pointer"
            onClick={() => handleDocumentClick(doc)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-gray-600 flex-shrink-0" />
                  <h3 className="text-gray-800 font-medium truncate">
                    {doc.filename}
                  </h3>
                </div>
                
                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.tags.map((tag, index) => (
                      <span key={index} className="tag-badge">
                        <Tag size={10} className="mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-gray-600 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{doc.date}</span>
                  </div>
                  {doc.wordCount && (
                    <span>{doc.wordCount.toLocaleString()} words</span>
                  )}
                  {doc.processingTime ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Clock size={12} />
                      {formatProcessingTime(doc.processingTime)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock size={12} />
                      No summary yet
                    </span>
                  )}
                </div>
              </div>

              {/* Action indicator */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-lg bg-blue-500 bg-opacity-20 flex items-center justify-center">
                  <FileText size={14} className="text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-white text-opacity-30 mb-3" />
            <p className="text-body mb-2">No documents uploaded yet</p>
            <p className="text-caption">
              Upload your first document to get started
            </p>
          </div>
        )}
      </div>

      {/* View All / Show Less button */}
      {hasMoreDocuments && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full glass-button flex items-center justify-center gap-2 py-3"
          >
            {showAll ? (
              <>
                <ChevronUp size={16} />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <FolderOpen size={16} />
                <span>View All ({documents.length} files)</span>
                <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
