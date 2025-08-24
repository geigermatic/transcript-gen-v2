/**
 * SummaryResultsView - Dedicated view for displaying document summaries with tabs
 * Similar to Perplexity.ai's query results page layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Copy, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LeftNavigation } from './LeftNavigation';
import type { Document, SummarizationResult } from '../types';

export const SummaryResultsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { documents, styleGuide, getDocumentSummary } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'stylized' | 'raw'>('stylized');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [document, setDocument] = useState<Document | null>(null);
  const [summary, setSummary] = useState<SummarizationResult | null>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  // Fetch summary for a document
  const fetchDocumentSummary = useCallback(async (doc: Document) => {
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

      );
      setSummary(summaryResult);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      // Could show error message here
    } finally {
      setIsLoading(false);
    }
  }, [getDocumentSummary, styleGuide]);

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
  }, [location.state, navigate, documents, getDocumentSummary, fetchDocumentSummary]);

  const handleBack = () => {
    // Navigate back to chat with document info to preserve upload completion state
    navigate('/', { 
      state: { 
        returnFromSummary: true,
        document: document,
        summary: summary
      } 
    });
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
    if (!summary) return 'No summary available';
    
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
      {/* Left Navigation Panel - Collapsible on Hover */}
      <LeftNavigation
        isNavExpanded={isNavExpanded}
        onNavMouseEnter={handleNavMouseEnter}
        onNavMouseLeave={handleNavMouseLeave}
        currentDocumentId={document?.id}
        showNewChatButton={false}
      />
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

                {/* Compact Processing Metadata - Single line below tabs */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
                  <div className="flex items-center gap-4">
                    <span>Model: <span className="text-gray-700 font-mono">{summary.processingStats.modelUsed || 'Unknown'}</span></span>
                    <span>Time: <span className="text-gray-700">{summary.processingStats.processingTime ? `${Math.floor(summary.processingStats.processingTime / 1000)}s` : 'Unknown'}</span></span>
                    <span>Chunks: <span className="text-gray-700">{summary.processingStats.totalChunks || 0}</span></span>
                    <span>Date: <span className="text-gray-700">{document?.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : 'Unknown'}</span></span>
                  </div>
                  
                  {/* Fast Path Indicator - Subtle badge */}
                  {summary.processingStats.totalChunks === 1 && 
                   summary.processingStats.modelUsed && 
                   ['gemma3:4b', 'gemma3:12b', 'gemma3:1b', 'mixtral:8x7b'].includes(summary.processingStats.modelUsed) && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      🚀 Fast Path
                    </span>
                  )}
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
                  {/* Input Field */}
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Ask a follow-up..."
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!followUpQuery.trim()}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
