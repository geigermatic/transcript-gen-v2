import { useEffect } from 'react';
import type { Document } from '../types';
import { DocumentProcessor } from '../lib/documentProcessor';
import { EmbeddingManager } from './EmbeddingManager';

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document: doc, isOpen, onClose }: DocumentViewerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(doc.text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-full max-h-[90vh] glass-panel flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {DocumentProcessor.getFileTypeIcon(doc.filename)}
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">{doc.title}</h2>
              <p className="text-gray-400 text-sm">{doc.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="glass-button text-white hover:bg-red-500 hover:bg-opacity-20"
          >
            ✕
          </button>
        </div>

        {/* Metadata */}
        <div className="px-6 py-4 border-b border-white/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Added:</span>
              <p className="text-white">{formatDate(doc.metadata.dateAdded)}</p>
            </div>
            <div>
              <span className="text-gray-400">Word Count:</span>
              <p className="text-white">{doc.metadata.wordCount?.toLocaleString() || 0}</p>
            </div>
            <div>
              <span className="text-gray-400">File Size:</span>
              <p className="text-white">{formatFileSize(doc.metadata.fileSize)}</p>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <p className="text-white">{doc.metadata.fileType || 'Unknown'}</p>
            </div>
          </div>
          
          {doc.tags.length > 0 && (
            <div className="mt-4">
              <span className="text-gray-400 text-sm">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-300 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <button className="glass-button text-white hover:bg-green-500 hover:bg-opacity-20">
              📝 Generate Summary
            </button>
            <button className="glass-button text-white hover:bg-blue-500 hover:bg-opacity-20">
              💬 Start Chat
            </button>
            <button 
              onClick={copyToClipboard}
              className="glass-button text-white hover:bg-purple-500 hover:bg-opacity-20"
            >
              📋 Copy Text
            </button>
          </div>
        </div>

        {/* Embedding Management */}
        <div className="px-6 py-4 border-b border-white/20">
          <EmbeddingManager document={doc} />
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-2 text-sm text-gray-400">
            Document Content ({doc.text.length.toLocaleString()} characters)
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="bg-black bg-opacity-30 rounded-lg p-4">
              <pre className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed font-mono">
                {doc.text}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
