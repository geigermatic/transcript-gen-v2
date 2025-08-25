import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ollama } from '../lib/ollama';
import { SemanticSearchTest } from '../components/SemanticSearchTest';
import { ChatTester } from '../components/ChatTester';
import { ABTestingDashboard } from '../components/ABTestingDashboard';
import { QATestRunner } from '../components/QATestRunner';
import { PromptEditor } from '../components/PromptEditor';
import { LeftNavigation } from '../components/LeftNavigation';

export function DevConsolePage() {
  const navigate = useNavigate();
  const { documents, logs, clearLogs, getAllEmbeddings } = useAppStore();
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Navigation state
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  
  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  useEffect(() => {
    checkOllamaConnection();
  }, []);

  const checkOllamaConnection = async () => {
    setOllamaStatus('checking');
    try {
      const isAvailable = await ollama.isAvailable();
      setOllamaStatus(isAvailable ? 'connected' : 'disconnected');
    } catch {
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
  const totalEmbeddings = Array.from(allEmbeddings.values()).flat().length;
  const documentsWithEmbeddings = allEmbeddings.size;

  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation Panel - Collapsible on Hover */}
      <LeftNavigation
        isNavExpanded={isNavExpanded}
        onNavMouseEnter={handleNavMouseEnter}
        onNavMouseLeave={handleNavMouseLeave}
        currentDocumentId={undefined}
        showNewChatButton={true}
        onNewChat={() => navigate('/')}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Developer Console</h1>
              <p className="text-gray-600">
                View detailed logs, status tracking, and debugging information for development builds.
              </p>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">System Status</h2>
                <button
                  onClick={checkOllamaConnection}
                  title="Refresh status"
                  disabled={ollamaStatus === 'checking'}
                  style={{ 
                    background: '#E5E7EB',
                    border: '1px solid #D1D5DB',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    color: '#111827',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="glass-panel p-4">
                  <h3 className="text-lg font-medium text-gray-900">Ollama Status</h3>
                  <p className={getStatusColor(ollamaStatus)}>{getStatusText(ollamaStatus)}</p>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                  <p className="text-gray-600">{documents.length}</p>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-lg font-medium text-gray-900">Total Words</h3>
                  <p className="text-gray-600">{totalWords.toLocaleString()}</p>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-lg font-medium text-gray-900">Storage Used</h3>
                  <p className="text-gray-600">
                    {totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'}
                  </p>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-lg font-medium text-gray-900">Embeddings</h3>
                  <p className="text-gray-600">{totalEmbeddings} chunks</p>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-lg font-medium text-gray-900">Indexed Docs</h3>
                  <p className="text-gray-600">{documentsWithEmbeddings}/{documents.length}</p>
                </div>
              </div>
            </div>

                         <div className="glass-panel p-6">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-2xl font-semibold text-gray-900">Application Logs</h2>
                 <div className="flex space-x-2">
                   <span className="text-sm text-gray-600">{logs.length} entries</span>
                                     <button
                    onClick={clearLogs}
                    title="Clear all logs"
                    style={{ 
                      background: '#E5E7EB',
                      border: '1px solid #D1D5DB',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      color: '#111827',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    🗑️ Clear
                  </button>
                 </div>
               </div>
              <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm border border-gray-200">
                {logs.length === 0 ? (
                  <div className="text-gray-600 italic">No logs yet. Upload a document to see ingestion logs.</div>
                ) : (
                  logs.slice().reverse().map((log) => (
                    <div key={log.id} className="mb-2">
                      <span className="text-gray-500">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={`ml-2 ${getLogColor(log.level)}`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="ml-2 text-purple-600">
                        [{log.category}]
                      </span>
                      <span className="ml-2 text-gray-700">
                        {log.message}
                      </span>
                      {log.details && (
                        <div className="ml-4 mt-1 text-gray-600 text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Prompt Editor */}
            <PromptEditor />

            {/* AI Features Testing */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SemanticSearchTest />
                <ChatTester />
              </div>
              <ABTestingDashboard />
              <QATestRunner />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
