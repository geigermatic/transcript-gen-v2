import { useState } from 'react';
import { useAppStore } from '../store';
import { ChatEngine } from '../lib/chatEngine';
import type { ChatContext, ChatResponse } from '../types';

export function ChatTester() {
  const { getAllEmbeddings } = useAppStore();
  const [query, setQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allEmbeddings = getAllEmbeddings();

  const runTest = async () => {
    if (!query.trim() || allEmbeddings.size === 0) return;

    setIsTesting(true);
    setError(null);
    setResult(null);

    try {
      const context: ChatContext = {
        messages: [],
        maxContextLength: 4000,
      };

      const response = await ChatEngine.processQuery(query, context);
      setResult(response);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      runTest();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Chat System Test</h3>
      
      {allEmbeddings.size === 0 ? (
        <div className="text-gray-600 text-center py-8">
          <p className="mb-2">No embeddings available for chat testing.</p>
          <p className="text-sm">Upload documents and generate embeddings first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Test Controls */}
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter test question..."
                className="flex-1"
                style={{
                  borderRadius: '0.75rem',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  padding: '0.75rem 1rem',
                  color: '#111827',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                disabled={isTesting}
              />
              <button
                onClick={runTest}
                disabled={!query.trim() || isTesting}
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
                  gap: '8px',
                  opacity: (!query.trim() || isTesting) ? 0.5 : 1
                }}
              >
                {isTesting ? '⏳' : '🧪'}
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              Available embeddings: {Array.from(allEmbeddings.values()).flat().length} chunks from {allEmbeddings.size} documents
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <h4 className="text-gray-900 font-medium">Test Results</h4>
              
              {/* Metrics */}
              <div className="glass-panel p-4">
                <h5 className="text-gray-900 font-medium mb-2">Metrics</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Sources Found:</span>
                    <p className="text-gray-900">{result.responseMetrics.retrievalCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Top Similarity:</span>
                    <p className="text-gray-900">{(result.responseMetrics.topSimilarity * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Response Length:</span>
                    <p className="text-gray-900">{result.responseMetrics.responseLength} chars</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Processing Time:</span>
                    <p className="text-gray-900">{result.responseMetrics.processingTime}ms</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-600">Has Grounding:</span>
                  <span className={`ml-2 ${result.hasGrounding ? 'text-green-600' : 'text-red-600'}`}>
                    {result.hasGrounding ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>

              {/* Response */}
              <div className="glass-panel p-4">
                <h5 className="text-gray-900 font-medium mb-2">Generated Response</h5>
                <div className="text-gray-700 whitespace-pre-wrap bg-gray-100 rounded-lg p-3 border border-gray-200">
                  {result.message.content}
                </div>
              </div>

              {/* Sources */}
              {result.sources.length > 0 && (
                <div className="glass-panel p-4">
                  <h5 className="text-gray-900 font-medium mb-2">
                    Retrieved Sources ({result.sources.length})
                  </h5>
                  <div className="space-y-2">
                    {result.sources.map((source, index) => (
                      <div key={source.chunk.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-600 font-medium">
                            Source {index + 1}
                          </span>
                          <span className="text-sm text-gray-600">
                            {(source.similarity * 100).toFixed(1)}% similarity
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          {source.chunk.text.length > 200 
                            ? source.chunk.text.substring(0, 200) + '...'
                            : source.chunk.text
                          }
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          Document: {source.chunk.documentId} | Chunk: {source.chunk.chunkIndex + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {query && !result && !isTesting && !error && (
            <div className="text-gray-600 text-center py-4">
              Click the test button to run the query.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
