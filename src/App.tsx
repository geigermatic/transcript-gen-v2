import { useState } from 'react';
import { useAppStore } from './store';
import { FileUpload } from './components/FileUpload';

function App() {
  const { isDarkMode, documents, toggleDarkMode } = useAppStore();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Single Pane Header */}
      <div className="glass-panel-header sticky top-0 z-30 border-b border-teal-500/20">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-hierarchy-h2">Transcript Summarizer</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Local AI Ready</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">{documents.length} documents</span>
            <button
              onClick={toggleDarkMode}
              className="glass-button-secondary text-sm"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Single Pane Grid Layout */}
      <div className="p-4 h-[calc(100vh-100px)]">
        <div className="grid grid-cols-3 gap-4 h-full">
        
          {/* Column 1: Upload & Documents */}
          <div className="glass-pane p-4 flex flex-col">
            {/* Compact Upload Section */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-teal-300 mb-3 flex items-center">
                <span className="mr-2">📄</span>
                Upload
              </h3>
              <FileUpload onUploadComplete={(success, message) => {
                if (success) {
                  console.log('File uploaded successfully:', message);
                }
              }} />
            </div>

            {/* Compact Document Library */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-lg font-semibold text-teal-300 mb-3 flex items-center">
                <span className="mr-2">📚</span>
                Documents ({documents.length})
              </h3>
              
              {documents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm">
                  <div className="text-3xl mb-2 opacity-50">📁</div>
                  <p>No documents</p>
                </div>
              ) : (
                <div className="flex-1 space-y-1 overflow-y-auto">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className={`p-2 rounded border cursor-pointer transition-all text-sm ${
                        selectedDocument?.id === doc.id
                          ? 'bg-teal-500/20 border-teal-500/50 shadow-sm'
                          : 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-700/40'
                      }`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate text-xs">
                            Doc {doc.id.slice(0, 6)}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {(doc.metadata?.wordCount || 0).toLocaleString()} words
                          </p>
                        </div>
                        {selectedDocument?.id === doc.id && (
                          <div className="w-1.5 h-1.5 bg-teal-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Summary & Analysis */}
          <div className="glass-pane p-4 flex flex-col">
            <h3 className="text-lg font-semibold text-teal-300 mb-3 flex items-center">
              <span className="mr-2">✨</span>
              AI Summary
            </h3>
            
            {!selectedDocument ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="text-4xl mb-3 opacity-50">🎯</div>
                <p className="text-sm">Select a document to analyze</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-3 min-h-0">
                {/* Document Header */}
                <div className="bg-gray-800/40 p-3 rounded-lg border border-teal-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">Doc {selectedDocument.id.slice(0, 6)}</span>
                    <button className="glass-button-primary text-xs px-3 py-1">
                      Generate
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    {(selectedDocument.metadata?.wordCount || 0).toLocaleString()} words
                  </div>
                </div>
                
                {/* Summary Content Area */}
                <div className="flex-1 bg-gray-800/20 p-3 rounded-lg border border-gray-700/30 overflow-y-auto min-h-0">
                  <div className="space-y-3">
                    <div className="border-l-2 border-teal-500 pl-3">
                      <h4 className="text-white font-medium mb-1 text-sm text-teal-300">Key Takeaways</h4>
                      <div className="text-gray-400 text-xs space-y-1">
                        <p>• Generate summary for insights</p>
                        <p>• Techniques will appear here</p>
                        <p>• Action items extracted</p>
                      </div>
                    </div>

                    <div className="border-l-2 border-purple-400 pl-3">
                      <h4 className="text-white font-medium mb-1 text-sm text-purple-300">Techniques</h4>
                      <div className="text-gray-400 text-xs">
                        <p>Methods and strategies identified</p>
                      </div>
                    </div>

                    <div className="border-l-2 border-orange-400 pl-3">
                      <h4 className="text-white font-medium mb-1 text-sm text-orange-300">Action Items</h4>
                      <div className="text-gray-400 text-xs">
                        <p>Actionable tasks extracted</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-1">
                  <button className="glass-button-secondary text-xs flex-1 py-1">Export</button>
                  <button className="glass-button-secondary text-xs flex-1 py-1">Copy</button>
                  <button className="glass-button-secondary text-xs flex-1 py-1">A/B</button>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Chat Interface */}
          <div className="glass-pane p-4 flex flex-col">
            <h3 className="text-lg font-semibold text-teal-300 mb-3 flex items-center">
              <span className="mr-2">💬</span>
              AI Chat
            </h3>
            
            {!selectedDocument ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="text-4xl mb-3 opacity-50">🤖</div>
                <p className="text-sm">Select a document to chat</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Chat Messages */}
                <div className="flex-1 bg-gray-800/20 rounded-lg p-3 mb-3 overflow-y-auto border border-gray-700/30 min-h-0">
                  <div className="space-y-2">
                    <div className="bg-teal-500/20 p-2 rounded border border-teal-500/30">
                      <div className="text-xs text-teal-400 mb-1">AI Assistant</div>
                      <div className="text-white text-xs">
                        Ready to answer questions about Doc {selectedDocument.id.slice(0, 6)}. What would you like to know?
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about this document..."
                      className="flex-1 glass-input text-xs py-2"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && chatInput.trim()) {
                          setChatInput('');
                        }
                      }}
                    />
                    <button 
                      className="glass-button-primary text-xs px-3"
                      disabled={!chatInput.trim()}
                    >
                      Send
                    </button>
                  </div>
                  
                  {/* Quick Questions */}
                  <div className="flex flex-wrap gap-1">
                    {['Key points?', 'Techniques?', 'Actions?'].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setChatInput(q)}
                        className="glass-button-secondary text-xs py-1 px-2 hover:bg-teal-500/20"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;