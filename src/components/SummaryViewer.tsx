import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportOptions } from './ExportOptions';
import type { SummarizationResult, ExtractedFacts } from '../types';

interface SummaryViewerProps {
  result: SummarizationResult;
  onClose: () => void;
}

export function SummaryViewer({ result, onClose }: SummaryViewerProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'facts' | 'details'>('summary');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [showExportOptions, setShowExportOptions] = useState(false);

  const copyToClipboard = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
      console.error(`Failed to copy ${type}:`, error);
    }
  };

  const getCopyButtonText = () => {
    switch (copyStatus) {
      case 'copied': return '✅ Copied!';
      case 'error': return '❌ Failed';
      default: return '📋 Copy';
    }
  };

  const formatProcessingTime = (ms: number) => {
    return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  };

  const renderFactsAsJson = (facts: ExtractedFacts) => {
    return JSON.stringify(facts, null, 2);
  };

  const renderFactsTable = (facts: ExtractedFacts) => {
    const fields = [
      { key: 'class_title', label: 'Class Title', value: facts.class_title },
      { key: 'date_or_series', label: 'Date/Series', value: facts.date_or_series },
      { key: 'audience', label: 'Audience', value: facts.audience },
      { key: 'learning_objectives', label: 'Learning Objectives', value: facts.learning_objectives },
      { key: 'key_takeaways', label: 'Key Takeaways', value: facts.key_takeaways },
      { key: 'topics', label: 'Topics', value: facts.topics },
      { key: 'techniques', label: 'Techniques', value: facts.techniques },
      { key: 'action_items', label: 'Action Items', value: facts.action_items },
      { key: 'notable_quotes', label: 'Notable Quotes', value: facts.notable_quotes },
      { key: 'open_questions', label: 'Open Questions', value: facts.open_questions },
      { key: 'timestamp_refs', label: 'Timestamp References', value: facts.timestamp_refs },
    ];

    return (
      <div className="space-y-4">
        {fields.map(field => {
          if (!field.value || (Array.isArray(field.value) && field.value.length === 0)) {
            return null;
          }

          return (
            <div key={field.key} className="glass-panel p-4">
              <h4 className="text-white font-medium mb-2">{field.label}</h4>
              {Array.isArray(field.value) ? (
                <ul className="text-gray-300 space-y-1">
                  {field.value.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300">{field.value}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] glass-panel flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div>
            <h2 className="text-2xl font-bold text-white">Summary: {result.document.title}</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
              <span>📊 {result.processingStats.totalChunks} chunks processed</span>
              <span>✅ {result.processingStats.successfulChunks} successful</span>
              <span>⏱️ {formatProcessingTime(result.processingStats.processingTime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExportOptions(true)}
              className="glass-button text-white hover:bg-blue-500 hover:bg-opacity-20"
            >
              📤 Export
            </button>
            <button
              onClick={onClose}
              className="glass-button text-white hover:bg-red-500 hover:bg-opacity-20"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/20">
          {[
            { id: 'summary', label: '📝 Summary', icon: '📝' },
            { id: 'facts', label: '📋 Facts', icon: '📋' },
            { id: 'details', label: '🔍 Details', icon: '🔍' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-white transition-colors ${
                activeTab === tab.id 
                  ? 'bg-white bg-opacity-20 border-b-2 border-blue-400' 
                  : 'hover:bg-white hover:bg-opacity-10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'summary' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Markdown Summary</h3>
                <button
                  onClick={() => copyToClipboard(result.markdownSummary, 'summary')}
                  className="glass-button text-white hover:bg-blue-500 hover:bg-opacity-20"
                >
                  {getCopyButtonText()}
                </button>
              </div>
              
              <div className="glass-panel p-6">
                <div className="text-gray-200 prose prose-invert max-w-none markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-white mb-4 mt-0">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-white mb-3 mt-6 first:mt-0">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-medium text-white mb-2 mt-4">{children}</h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-base font-medium text-white mb-2 mt-3">{children}</h4>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="text-gray-300 mb-4 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="text-gray-300 mb-4 space-y-1 list-decimal list-inside">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-300 flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-300 my-4 bg-blue-500 bg-opacity-10 py-2">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-white font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="text-gray-200 italic">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-800 text-blue-300 px-2 py-1 rounded text-sm font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-sm">
                        {children}
                      </pre>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full border border-gray-600 rounded-lg overflow-hidden">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-800">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="bg-gray-900">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-b border-gray-600">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="text-white font-semibold p-3 text-left">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="text-gray-300 p-3">{children}</td>
                    ),
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                  >
                    {result.markdownSummary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facts' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Extracted Facts</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(renderFactsAsJson(result.mergedFacts), 'facts JSON')}
                    className="glass-button text-white text-sm hover:bg-blue-500 hover:bg-opacity-20"
                  >
                    📋 Copy JSON
                  </button>
                </div>
              </div>
              
              {renderFactsTable(result.mergedFacts)}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Processing Details</h3>
              
              <div className="space-y-4">
                <div className="glass-panel p-4">
                  <h4 className="text-white font-medium mb-2">Processing Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Total Chunks:</span>
                      <p className="text-white">{result.processingStats.totalChunks}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Successful:</span>
                      <p className="text-green-400">{result.processingStats.successfulChunks}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Failed:</span>
                      <p className="text-red-400">{result.processingStats.failedChunks}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Processing Time:</span>
                      <p className="text-white">{formatProcessingTime(result.processingStats.processingTime)}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <h4 className="text-white font-medium mb-2">Chunk Processing Results</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.chunkFacts.map(chunkFact => (
                      <div 
                        key={chunkFact.chunkId}
                        className={`p-3 rounded-lg border ${
                          chunkFact.parseSuccess 
                            ? 'bg-green-500 bg-opacity-20 border-green-400' 
                            : 'bg-red-500 bg-opacity-20 border-red-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            Chunk {chunkFact.chunkIndex + 1}
                          </span>
                          <span className={chunkFact.parseSuccess ? 'text-green-400' : 'text-red-400'}>
                            {chunkFact.parseSuccess ? '✅ Success' : '❌ Failed'}
                          </span>
                        </div>
                        {chunkFact.error && (
                          <p className="text-red-300 text-sm mt-1">{chunkFact.error}</p>
                        )}
                        {chunkFact.parseSuccess && (
                          <p className="text-gray-300 text-sm mt-1">
                            Extracted: {Object.keys(chunkFact.facts).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Options Modal */}
      <ExportOptions
        summarizationResult={result}
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
      />
    </div>
  );
}
