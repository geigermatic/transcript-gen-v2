import { useState } from 'react';
import { useAppStore } from '../store';
import { EmbeddingEngine } from '../lib/embeddingEngine';
import type { SearchResult } from '../types';

export function SemanticSearchTest() {
  const { getAllEmbeddings } = useAppStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'semantic' | 'hybrid'>('semantic');

  const allEmbeddings = getAllEmbeddings();

  const performSearch = async () => {
    if (!query.trim() || allEmbeddings.size === 0) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      let searchResults;
      
      if (searchType === 'semantic') {
        searchResults = await EmbeddingEngine.performSemanticSearch(query, Array.from(allEmbeddings.values()).flat(), 5);
      } else {
        searchResults = await EmbeddingEngine.performHybridSearch(query, Array.from(allEmbeddings.values()).flat(), 5);
      }
      
      setResults(searchResults);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Semantic Search Test</h3>
      
      {allEmbeddings.size === 0 ? (
        <div className="text-gray-600 text-center py-8">
          <p className="mb-2">No embeddings available for search.</p>
          <p className="text-sm">Upload documents and generate embeddings first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search Controls */}
          <div className="space-y-3">
            <div className="flex space-x-2">
              <button
                onClick={() => setSearchType('semantic')}
                style={{
                  background: searchType === 'semantic' ? '#DBEAFE' : '#E5E7EB',
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
                Semantic
              </button>
              <button
                onClick={() => setSearchType('hybrid')}
                style={{
                  background: searchType === 'hybrid' ? '#DBEAFE' : '#E5E7EB',
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
                Hybrid
              </button>
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter search query..."
                className="flex-1"
                style={{
                  borderRadius: '0.75rem',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  padding: '0.75rem 1rem',
                  color: '#111827',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                disabled={isSearching}
              />
              <button
                onClick={performSearch}
                disabled={!query.trim() || isSearching}
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
                  opacity: (!query.trim() || isSearching) ? 0.5 : 1
                }}
              >
                {isSearching ? '⏳' : '🔍'}
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              Available chunks: {Array.from(allEmbeddings.values()).flat().length} from {allEmbeddings.size} documents
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-gray-900 font-medium">
                Search Results ({results.length} found)
              </h4>
              
              {results.map((result) => (
                <div key={result.chunk.id} className="glass-panel p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 font-bold">#{result.rank}</span>
                      <span className="text-gray-900 font-medium">
                        Chunk {result.chunk.chunkIndex + 1}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className={`${
                        result.similarity >= 0.8 ? 'text-green-600' :
                        result.similarity >= 0.6 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {(result.similarity * 100).toFixed(1)}% match
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-gray-600 text-sm mb-2">
                    Document ID: {result.chunk.documentId}
                  </div>
                  
                  <div className="text-gray-700 text-sm leading-relaxed">
                    {result.chunk.text.length > 200 
                      ? result.chunk.text.substring(0, 200) + '...'
                      : result.chunk.text
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {query && results.length === 0 && !isSearching && !error && (
            <div className="text-gray-600 text-center py-4">
              No results found for "{query}". Try different keywords or check similarity threshold.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
