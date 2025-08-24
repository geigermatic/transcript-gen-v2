import type { Document } from '../types';
import { DocumentProcessor } from '../lib/documentProcessor';
import { useAppStore } from '../store';
import { Clock, Cpu } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onOpenDocument?: (document: Document) => void;
  onSummarize?: (document: Document) => void;
  onChat?: (document: Document) => void;
  onDelete?: (document: Document) => void;
}

export function DocumentCard({ 
  document, 
  onOpenDocument, 
  onSummarize, 
  onChat, 
  onDelete 
}: DocumentCardProps) {
  const { addLog, abSummaryPairs } = useAppStore();

  // Helper function to format processing time
  const formatProcessingTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
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

  // Helper function to get model used for a document
  const getDocumentModel = (documentId: string): string | null => {
    const summaryPair = abSummaryPairs.find(pair => pair.documentId === documentId);
    if (summaryPair?.summaryA?.processingStats?.modelUsed) {
      return summaryPair.summaryA.processingStats.modelUsed;
    }
    return null;
  };

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenDocument = () => {
    addLog({
      level: 'info',
      category: 'library-management',
      message: `Opening document: ${document.title}`,
      details: { documentId: document.id, filename: document.filename }
    });
    onOpenDocument?.(document);
  };

  const handleSummarize = (e: React.MouseEvent) => {
    e.stopPropagation();
    addLog({
      level: 'info',
      category: 'library-management',
      message: `Summarize requested for: ${document.title}`,
      details: { documentId: document.id, wordCount: document.metadata.wordCount }
    });
    onSummarize?.(document);
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    addLog({
      level: 'info',
      category: 'library-management',
      message: `Chat requested for: ${document.title}`,
      details: { documentId: document.id }
    });
    onChat?.(document);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
      addLog({
        level: 'warn',
        category: 'library-management',
        message: `Document deleted: ${document.title}`,
        details: { documentId: document.id, filename: document.filename }
      });
      onDelete?.(document);
    }
  };

  const getTextPreview = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div 
      className="glass-panel p-4 hover:bg-white hover:bg-opacity-10 transition-all cursor-pointer"
      onClick={handleOpenDocument}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-2xl flex-shrink-0">
            {DocumentProcessor.getFileTypeIcon(document.filename)}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-lg mb-1 truncate">
              {document.title}
            </h3>
            <p className="text-gray-400 text-sm mb-2 truncate">
              {document.filename}
            </p>
            
            {/* Document preview */}
            <div className="mb-3">
              <p className="text-gray-300 text-sm leading-relaxed">
                {getTextPreview(document.text)}
              </p>
            </div>
            
            {/* Metadata */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
              <span className="flex items-center">
                📅 {formatDate(document.metadata.dateAdded)}
              </span>
              <span className="flex items-center">
                📄 {document.metadata.wordCount?.toLocaleString() || 0} words
              </span>
              <span className="flex items-center">
                💾 {formatFileSize(document.metadata.fileSize)}
              </span>
              {/* Processing Time */}
              {getDocumentProcessingTime(document.id) && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatProcessingTime(getDocumentProcessingTime(document.id)!)}
                </span>
              )}
              {/* Model Used */}
              {getDocumentModel(document.id) && (
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {getDocumentModel(document.id)}
                </span>
              )}
            </div>
            
            {/* Tags */}
            {document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {document.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-300 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
          <button 
            onClick={handleSummarize}
            className="glass-button text-white text-sm hover:bg-green-500 hover:bg-opacity-20"
            title="Generate Summary"
          >
            📝
          </button>
          <button 
            onClick={handleChat}
            className="glass-button text-white text-sm hover:bg-blue-500 hover:bg-opacity-20"
            title="Start Chat"
          >
            💬
          </button>
          <button 
            onClick={handleDelete}
            className="glass-button text-red-300 text-sm hover:bg-red-500 hover:bg-opacity-20"
            title="Delete Document"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
