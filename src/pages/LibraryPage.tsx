import { FileUpload } from '../components/FileUpload';
import { useToast, ToastContainer } from '../components/Toast';
import { useAppStore } from '../store';
import { DocumentProcessor } from '../lib/documentProcessor';

export function LibraryPage() {
  const { documents } = useAppStore();
  const toast = useToast();

  const handleUploadComplete = (success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
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
          <h2 className="text-xl font-semibold text-white mb-4">Your Documents</h2>
          {documents.length === 0 ? (
            <p className="text-gray-400 italic">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <div key={document.id} className="glass-panel p-4 hover:bg-white hover:bg-opacity-10 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl">
                        {DocumentProcessor.getFileTypeIcon(document.filename)}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-lg">{document.title}</h3>
                        <p className="text-gray-400 text-sm mb-2">{document.filename}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 {formatDate(document.metadata.dateAdded)}</span>
                          <span>📄 {document.metadata.wordCount?.toLocaleString() || 0} words</span>
                          <span>💾 {formatFileSize(document.metadata.fileSize)}</span>
                        </div>
                        {document.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
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
                    <div className="flex items-center space-x-2">
                      <button className="glass-button text-white text-sm">
                        📝 Summarize
                      </button>
                      <button className="glass-button text-white text-sm">
                        💬 Chat
                      </button>
                      <button className="glass-button text-red-300 text-sm hover:bg-red-500 hover:bg-opacity-20">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ToastContainer messages={toast.messages} onRemove={toast.removeToast} />
    </>
  );
}
