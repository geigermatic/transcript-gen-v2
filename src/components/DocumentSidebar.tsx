/**
 * DocumentSidebar - Right sidebar for document management and summary viewing
 * Features document list, summary tabs, and source carousel
 */

import React, { useState } from 'react';
import { FileText, Clock, Tag, Download, Share2, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '../store';
import { CompactSummaryViewer } from './CompactSummaryViewer';
import type { Document } from '../types';

interface DocumentSidebarProps {
  className?: string;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({ className = '' }) => {
  const { documents, abSummaryPairs } = useAppStore();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<'stylized' | 'raw'>('stylized');

  // Get summary for selected document
  const getSelectedDocumentSummary = () => {
    if (!selectedDocument) return null;
    
    const recentSummary = abSummaryPairs
      .filter(pair => pair.documentId === selectedDocument.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
    return recentSummary || null;
  };

  // Handle document selection
  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
        <p className="text-sm text-gray-500 mt-1">
          {documents.length} document{documents.length !== 1 ? 's' : ''} loaded
        </p>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No documents uploaded yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Upload a document to get started
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDocumentSelect(doc)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDocument?.id === doc.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <h3 className="font-medium text-gray-800 truncate text-sm">
                        {doc.title || doc.filename}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.uploadedAt)}
                      </span>
                      <span>{formatFileSize(doc.metadata.fileSize)}</span>
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{doc.tags.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Section */}
      {selectedDocument && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            <h3 className="font-medium text-gray-800 mb-3">Summary</h3>
            
            {/* Summary Tabs */}
            <div className="flex border-b border-gray-200 mb-3">
              <button
                onClick={() => setActiveTab('stylized')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'stylized'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Stylized
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'raw'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Raw
              </button>
            </div>

            {/* Summary Content */}
            <div className="max-h-64 overflow-y-auto">
              <CompactSummaryViewer
                document={selectedDocument}
                summary={getSelectedDocumentSummary()}
                activeTab={activeTab}
                compact={true}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
