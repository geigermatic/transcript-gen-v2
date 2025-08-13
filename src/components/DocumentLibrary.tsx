/**
 * Simplified document library for single-view interface
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { SearchBar } from './SearchBar';
import { DocumentViewer } from './DocumentViewer';
import { logInfo } from '../lib/logger';
import type { Document } from '../types';

interface DocumentLibraryProps {
  onDocumentSelect: (doc: Document) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  onDocumentSelect
}) => {
  const { documents, removeDocument } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');

  const filteredDocuments = documents
    .filter(doc => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.metadata.filename?.toLowerCase().includes(query) ||
        doc.text?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.metadata.filename || '').localeCompare(b.metadata.filename || '');
        case 'size':
          return (b.metadata.wordCount || 0) - (a.metadata.wordCount || 0);
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

  const handleDeleteDocument = async (doc: Document) => {
    if (confirm(`Delete "${doc.metadata.filename}"? This cannot be undone.`)) {
      removeDocument(doc.id);
      logInfo('INGEST', `Document deleted: ${doc.metadata.filename}`, { documentId: doc.id });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-hierarchy-h1 mb-2">Document Library</h1>
            <p className="text-body">
              Manage and organize your uploaded documents
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl text-teal-400 font-bold">{documents.length}</div>
            <div className="text-sm text-gray-400">documents</div>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search documents by name or content..."
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
            className="glass-input w-auto"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid gap-4">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="glass-panel p-6 hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="text-3xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {doc.metadata.filename}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                      <span>📊 {doc.metadata.wordCount?.toLocaleString()} words</span>
                      <span>💾 {formatFileSize(doc.metadata.fileSize || 0)}</span>
                      <span>📅 {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewingDocument(doc)}
                    className="glass-button-secondary text-sm"
                    title="View document"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => onDocumentSelect(doc)}
                    className="glass-button-primary text-sm"
                    title="Analyze document"
                  >
                    ✨ Analyze
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    className="glass-button-secondary text-sm text-red-400 hover:text-red-300"
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-hierarchy-h2 mb-4">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h2>
          <p className="text-body mb-6">
            {searchQuery 
              ? `No documents match "${searchQuery}". Try a different search term.`
              : 'Upload your first document to get started with AI analysis.'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="glass-button-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};
