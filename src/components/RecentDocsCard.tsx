/**
 * RecentDocsCard - Recent documents list with metadata
 */

import React from 'react';
import { Calendar, FileText, Tag } from 'lucide-react';
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
  const { documents } = useAppStore();

  // Use real documents only
  const displayDocs = documents.slice(0, 3).map(doc => ({
    id: doc.id,
    filename: doc.metadata.filename || doc.filename, // Fallback to doc.filename
    tags: doc.tags || ['transcript'],
    date: new Date(doc.uploadedAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    wordCount: doc.metadata.wordCount || 0
  }));

  const handleDocumentClick = (doc: any) => {
    logInfo('UI', `Recent document clicked: ${doc.filename}`, { docId: doc.id });
    onDocumentSelect?.(doc);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading">Recent Documents</h2>
        <span className="text-caption">{displayDocs.length} files</span>
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
    </div>
  );
};
