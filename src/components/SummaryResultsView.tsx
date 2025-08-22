/**
 * SummaryResultsView - Dedicated view for displaying document summaries with tabs
 * Similar to Perplexity.ai's query results page layout
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Grid3X3, HelpCircle, Globe, Paperclip, Mic, Send, Settings, Plus, Trash2, Copy, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const SummaryResultsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { documents, styleGuide, getDocumentSummary, clearAllData } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'stylized' | 'raw'>('stylized');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [document, setDocument] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  // Fetch summary for a document
  const fetchDocumentSummary = async (doc: any) => {
    if (!doc) return;
    
    // First check if we already have a summary for this document
    const existingSummary = getDocumentSummary(doc.id);
    
    if (existingSummary) {
      setSummary(existingSummary);
      return;
    }
    
    // If no existing summary, generate a new one
    setIsLoading(true);
    try {
      const summaryResult = await SummarizationEngine.summarizeDocument(
        doc, 
        styleGuide,
        (current: number, total: number, status?: string) => {
          // Progress callback - could show progress bar here
        }
      );
      setSummary(summaryResult);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      // Could show error message here
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get document and summary data from navigation state
    if (location.state?.document) {
      setDocument(location.state.document);
      
      if (location.state?.summary) {
        // We have both document and summary
        setSummary(location.state.summary);
      } else {
        // We have document but no summary - check if we have it stored, otherwise fetch it
        const existingSummary = getDocumentSummary(location.state.document.id);
        if (existingSummary) {
          setSummary(existingSummary);
        } else {
          fetchDocumentSummary(location.state.document);
        }
      }
    } else {
      // Fallback: redirect back to chat if no document data
      navigate('/');
    }
  }, [location.state, navigate, documents, getDocumentSummary]);

  const handleBack = () => {
    navigate('/');
  };

  const handleCopy = async () => {
    const content = renderSummaryContent();
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy summary:', error);
    }
  };

  const renderSummaryContent = () => {
    if (activeTab === 'stylized') {
      return summary.styledSummary || 'No stylized summary available';
    } else {
      return summary.rawSummary || 'No raw summary available';
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuery.trim()) {
      // TODO: Handle follow-up query - could navigate back to chat or process here
      console.log('Follow-up query:', followUpQuery);
      setFollowUpQuery('');
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation Panel - Collapsible on Hover */}
      <div 
        className={`relative transition-all duration-300 ease-in-out ${
          isNavExpanded ? 'w-80' : 'w-16'
        } bg-gray-50 border-r border-gray-200`}
        onMouseEnter={handleNavMouseEnter}
        onMouseLeave={handleNavMouseLeave}
      >
        {/* Navigation Content */}
        <div className="h-full flex flex-col">
          {/* Top Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src={eliraIcon} 
                  alt="Elira" 
                  className="w-full h-full object-contain"
                />
              </div>
              {isNavExpanded && (
                <span className="text-lg font-semibold text-gray-800">Elira</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-600" />
              {isNavExpanded && <span className="text-gray-700">New Chat</span>}
            </button>
            
            <button 
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              {isNavExpanded && <span className="text-gray-700">Settings</span>}
            </button>
            
            {/* Clear All Documents Button */}
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
                  clearAllData();
                  // Navigate back to chat which will show the clean interface
                  navigate('/');
                }
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              {isNavExpanded && <span>Clear All Documents</span>}
            </button>
          </div>

          {/* Documents Section - Only show when expanded */}
          {isNavExpanded && (
            <div className="px-4 py-2 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Documents ({documents.length})
              </h3>

              {documents.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 mx-auto mb-2 text-gray-400">
                    📄
                  </div>
                  <p className="text-gray-500 text-sm">No documents yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Upload documents to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        doc.id === document?.id 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => {
                        if (doc.id !== document?.id) {
                          // Update current document and fetch its summary
                          setDocument(doc);
                          setSummary(null); // Clear current summary
                          fetchDocumentSummary(doc);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm truncate">
                          {doc.title || doc.filename}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Chat</span>
              </button>
            </div>
            
            {/* Document Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {document?.title || document?.filename || 'Document Summary'}
              </h1>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 text-gray-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span>Processing document...</span>
                </div>
              </div>
            )}

            {/* Summary Tabs and Content - Only show when not loading and summary exists */}
            {!isLoading && summary && (
              <>
                {/* Summary Tabs with Copy Button */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('stylized')}
                      className={`px-6 py-3 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'stylized'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Styled Summary
                    </button>
                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`px-6 py-3 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'raw'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Raw Summary
                    </button>
                  </div>
                  
                  {/* Copy Button */}
                  <button
                    onClick={handleCopy}
                    disabled={!summary}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Summary Content */}
                <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8 min-h-96">
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold text-gray-900 mb-3 mt-0">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold text-gray-900 mb-3 mt-0">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-medium text-gray-800 mb-1 mt-2">{children}</h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-sm font-medium text-gray-800 mb-1 mt-2">{children}</h4>
                        ),
                        p: ({ children }) => (
                          <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="text-gray-700 mb-3 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="text-gray-700 mb-3 space-y-1 list-decimal list-inside">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>{children}</span>
                          </li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-3 bg-blue-50 py-2">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => (
                          <strong className="text-gray-900 font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="text-gray-700 italic">{children}</em>
                        ),
                        code: ({ children }) => (
                          <code className="bg-gray-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 text-gray-800 p-3 rounded-lg overflow-x-auto mb-3 font-mono text-sm">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {renderSummaryContent()}
                    </ReactMarkdown>
                  </div>
                </div>
              </>
            )}

            {/* Follow-up Input */}
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleFollowUpSubmit} className="relative">
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3">
                  {/* Left Icons */}
                  <div className="flex items-center gap-3 mr-3">
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <Search size={18} />
                    </button>
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <Grid3X3 size={18} />
                    </button>
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <HelpCircle size={18} />
                    </button>
                  </div>

                  {/* Input Field */}
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Ask a follow-up..."
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
                  />

                  {/* Right Icons */}
                  <div className="flex items-center gap-3 ml-3">
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <Globe size={18} />
                    </button>
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <Mic size={18} />
                    </button>
                    <button
                      type="submit"
                      disabled={!followUpQuery.trim()}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
