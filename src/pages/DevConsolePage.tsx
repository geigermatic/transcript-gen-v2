import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { ollama } from '../lib/ollama';
import { SemanticSearchTest } from '../components/SemanticSearchTest';
import { ChatTester } from '../components/ChatTester';
import { ABTestingDashboard } from '../components/ABTestingDashboard';

export function DevConsolePage() {
  const { documents, logs, clearLogs, getAllEmbeddings } = useAppStore();
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    checkOllamaConnection();
  }, []);

  const checkOllamaConnection = async () => {
    setOllamaStatus('checking');
    try {
      const isAvailable = await ollama.isAvailable();
      setOllamaStatus(isAvailable ? 'connected' : 'disconnected');
    } catch (error) {
      setOllamaStatus('disconnected');
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'disconnected': return 'text-red-400';
      case 'checking': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '✅ Connected';
      case 'disconnected': return '❌ Disconnected';
      case 'checking': return '⏳ Checking...';
      default: return 'Unknown';
    }
  };

  const totalWords = documents.reduce((total, doc) => total + (doc.metadata.wordCount || 0), 0);
  const totalSize = documents.reduce((total, doc) => total + doc.metadata.fileSize, 0);
  const allEmbeddings = getAllEmbeddings();
  const totalEmbeddings = allEmbeddings.length;
  const documentsWithEmbeddings = new Set(allEmbeddings.map(e => e.documentId)).size;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Developer Console</h1>
        <p className="text-gray-300">
          View detailed logs, status tracking, and debugging information for development builds.
        </p>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">System Status</h2>
          <button
            onClick={checkOllamaConnection}
            className="glass-button text-white text-sm"
            disabled={ollamaStatus === 'checking'}
          >
            🔄 Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Ollama Status</h3>
            <p className={getStatusColor(ollamaStatus)}>{getStatusText(ollamaStatus)}</p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Documents</h3>
            <p className="text-gray-400">{documents.length}</p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Total Words</h3>
            <p className="text-gray-400">{totalWords.toLocaleString()}</p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Storage Used</h3>
            <p className="text-gray-400">
              {totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'}
            </p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Embeddings</h3>
            <p className="text-gray-400">{totalEmbeddings} chunks</p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Indexed Docs</h3>
            <p className="text-gray-400">{documentsWithEmbeddings}/{documents.length}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Application Logs</h2>
          <div className="flex space-x-2">
            <span className="text-sm text-gray-400">{logs.length} entries</span>
            <button
              onClick={clearLogs}
              className="glass-button text-white text-sm"
            >
              🗑️ Clear
            </button>
          </div>
        </div>
        <div className="bg-black bg-opacity-50 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">No logs yet. Upload a document to see ingestion logs.</div>
          ) : (
            logs.slice().reverse().map((log) => (
              <div key={log.id} className="mb-2">
                <span className="text-gray-500">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className={`ml-2 ${getLogColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="ml-2 text-purple-400">
                  [{log.category}]
                </span>
                <span className="ml-2 text-gray-300">
                  {log.message}
                </span>
                {log.details && (
                  <div className="ml-4 mt-1 text-gray-500 text-xs">
                    {JSON.stringify(log.details, null, 2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Features Testing */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SemanticSearchTest />
          <ChatTester />
        </div>
        <ABTestingDashboard />
      </div>
    </div>
  );
}
