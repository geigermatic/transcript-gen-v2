import { useState } from 'react';
import { useAppStore } from './store';
import { FileUpload } from './components/FileUpload';

function App() {
  const { isDarkMode, documents } = useAppStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'summarize' | 'chat' | 'library'>('upload');

  const tabs = [
    { id: 'upload', label: 'Upload', icon: '📄', description: 'Add documents to analyze' },
    { id: 'summarize', label: 'Summarize', icon: '✨', description: 'Generate AI summaries' },
    { id: 'chat', label: 'Chat', icon: '💬', description: 'Ask questions about content' },
    { id: 'library', label: 'Library', icon: '📚', description: 'Browse your documents' }
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="glass-panel-header sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-hierarchy-h3">Transcript Summarizer</h1>
            <div className="hidden md:flex items-center space-x-1 text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Local AI • Privacy First</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-container px-6">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`tab-button flex items-center space-x-2 ${
                  activeTab === tab.id ? 'active' : ''
                }`}
                title={tab.description}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="hidden lg:inline text-xs text-gray-400">
                  • {tab.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="tab-content">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-hierarchy-h1 mb-2">Upload Documents</h1>
              <p className="text-body text-lg">
                Start by uploading a document to analyze with AI
              </p>
            </div>
            <FileUpload onUploadComplete={(success, message) => {
              if (success) {
                console.log('File uploaded successfully:', message);
              }
            }} />
            
            {documents.length > 0 && (
              <div className="glass-panel p-6">
                <h2 className="text-hierarchy-h3 mb-4">Recent Documents</h2>
                <div className="grid gap-3">
                  {documents.slice(0, 3).map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-white font-medium">Document {doc.id.slice(0, 8)}</p>
                          <p className="text-gray-400 text-sm">
                            {doc.metadata?.wordCount?.toLocaleString() || 0} words
                          </p>
                        </div>
                      </div>
                      <button className="glass-button-primary text-sm">
                        Analyze →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summarize' && (
          <div className="glass-panel p-8 text-center">
            <h2 className="text-hierarchy-h2 mb-4">AI Summary</h2>
            <p className="text-body mb-6">
              Select a document from the library to generate AI summaries and insights.
            </p>
            <button className="glass-button-primary">
              ✨ Generate Summary
            </button>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="glass-panel p-8 text-center">
            <h2 className="text-hierarchy-h2 mb-4">AI Chat</h2>
            <p className="text-body mb-6">
              Ask questions about your document content with our AI assistant.
            </p>
            <div className="glass-input max-w-2xl mx-auto mb-4">
              <input 
                type="text" 
                placeholder="Ask a question about your documents..."
                className="w-full bg-transparent text-white placeholder-gray-400 border-0 outline-none"
              />
            </div>
            <button className="glass-button-primary">
              💬 Send Message
            </button>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="glass-panel p-8 text-center">
            <h2 className="text-hierarchy-h2 mb-4">Document Library</h2>
            <p className="text-body mb-6">
              Manage and organize your uploaded documents.
            </p>
            <div className="text-2xl text-teal-400 font-bold mb-2">{documents.length}</div>
            <div className="text-sm text-gray-400">documents uploaded</div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 glass-panel-header px-6 py-2 z-20">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>{documents.length} documents</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Local AI Ready</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;