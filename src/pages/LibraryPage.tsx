import { useState, useEffect, useMemo } from 'react';
import { FileUpload } from '../components/FileUpload';
import { SearchBar } from '../components/SearchBar';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentViewer } from '../components/DocumentViewer';
import { useToast, ToastContainer } from '../components/Toast';
import { useAppStore } from '../store';
import type { Document } from '../types';

export function LibraryPage() {
  const { documents, removeDocument, addLog } = useAppStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Log library loaded when component mounts
  useEffect(() => {
    addLog({
      level: 'info',
      category: 'library-management',
      message: 'Library loaded',
      details: { documentCount: documents.length }
    });
  }, [addLog, documents.length]);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      (doc.title?.toLowerCase() || doc.filename.toLowerCase()).includes(query) ||
      doc.filename.toLowerCase().includes(query) ||
      doc.text.toLowerCase().includes(query) ||
      (doc.tags || []).some(tag => tag.toLowerCase().includes(query))
    );
  }, [documents, searchQuery]);

  const handleUploadComplete = (success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleOpenDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedDocument(null);
  };

  const handleDeleteDocument = (document: Document) => {
    removeDocument(document.id);
    toast.success(`Deleted: ${document.title}`);
  };

  const handleSummarize = (document: Document) => {
    toast.info(`Summarization feature coming soon for: ${document.title}`);
  };

  const handleChat = (document: Document) => {
    toast.info(`Chat feature coming soon for: ${document.title}`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="space-y-6">
        <div className="glass-panel p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Document Library</h1>
          <p className="text-gray-300">
            Manage your uploaded documents, view metadata, and organize into collections.
          </p>
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-400">
            <span>📊 {documents.length} documents</span>
            <span>💾 {documents.reduce((total, doc) => total + doc.metadata.fileSize, 0) > 0 
              ? formatFileSize(documents.reduce((total, doc) => total + doc.metadata.fileSize, 0))
              : '0 Bytes'} total
            </span>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Upload Documents</h2>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Your Documents</h2>
            <div className="text-sm text-gray-400">
              {filteredDocuments.length !== documents.length && (
                <span>{filteredDocuments.length} of {documents.length} documents</span>
              )}
            </div>
          </div>
          
          {documents.length > 0 && (
            <div className="mb-6">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search by title, filename, content, or tags..."
              />
            </div>
          )}

          {documents.length === 0 ? (
            <p className="text-gray-400 italic">No documents uploaded yet.</p>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-2">No documents match your search</p>
              <p className="text-gray-500 text-sm">Try different keywords or clear the search filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onOpenDocument={handleOpenDocument}
                  onSummarize={handleSummarize}
                  onChat={handleChat}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Document Viewer Modal */}
      <DocumentViewer
        document={selectedDocument}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
      
      <ToastContainer messages={toast.messages} onRemove={toast.removeToast} />
    </>
  );
}
