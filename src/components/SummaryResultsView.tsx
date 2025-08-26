/**
 * SummaryResultsView - Dedicated view for displaying document summaries with tabs
 * Similar to Perplexity.ai's query results page layout
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Copy, Check, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LeftNavigation } from './LeftNavigation';
import type { Document, SummarizationResult } from '../types';

export const SummaryResultsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    documents, 
    styleGuide, 
    settings,
    getDocumentSummary, 
    addSummaryVersion, 
    getSummaryHistory,
    getAllVersions,
    deleteSummaryVersion
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'stylized' | 'raw'>('stylized');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [document, setDocument] = useState<Document | null>(null);
  const [summary, setSummary] = useState<SummarizationResult | null>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ versionId: string; message: string } | null>(null);
  const [regenerationProgress, setRegenerationProgress] = useState<{ step: string; progress: number } | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });
  const [fullWidthComparison, setFullWidthComparison] = useState(false);

  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  // Version comparison functions
  const toggleComparisonMode = () => {
    if (!comparisonMode) {
      // Entering comparison mode - automatically enable full-width
      setComparisonMode(true);
      setFullWidthComparison(true);
    } else {
      // Exiting comparison mode - automatically restore normal layout
      setComparisonMode(false);
      setSelectedVersions({ left: null, right: null });
      setFullWidthComparison(false);
    }
  };

  const selectVersionForComparison = (versionId: string, side: 'left' | 'right') => {
    setSelectedVersions(prev => ({
      ...prev,
      [side]: prev[side] === versionId ? null : versionId
    }));
  };

  const canCompare = selectedVersions.left && selectedVersions.right && selectedVersions.left !== selectedVersions.right;

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
        undefined,
        undefined,
        settings.rawSummaryEnabled
      );
      setSummary(summaryResult);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      // Could show error message here
    } finally {
      setIsLoading(false);
    }
  }, [getDocumentSummary, styleGuide]);

  // Memoized values for performance
  const allVersions = useMemo(() => {
    return getAllVersions(document?.id || '') || [];
  }, [document?.id, summary?.regenerationCount]);

  // Optimized functions
  const handleCopyVersion = useCallback(async (versionSummary: string, versionId: string) => {
    try {
      await navigator.clipboard.writeText(versionSummary);
      setCopyFeedback({ versionId, message: 'Copied!' });
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (error) {
      console.error('Failed to copy version summary:', error);
      // Fallback for older browsers or clipboard issues
      try {
        const textArea = window.document.createElement('textarea');
        textArea.value = versionSummary;
        window.document.body.appendChild(textArea);
        textArea.select();
        window.document.execCommand('copy');
        window.document.body.removeChild(textArea);
        setCopyFeedback({ versionId, message: 'Copied!' });
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
        setCopyFeedback({ versionId, message: 'Copy failed' });
        setTimeout(() => setCopyFeedback(null), 2000);
      }
    }
  }, []);

  // Initialize document and summary data
  useEffect(() => {
    try {
      // Get document and summary data from navigation state
      if (location.state?.document) {
        setDocument(location.state.document);
        
        if (location.state?.summary) {
          // We have both document and summary
          setSummary(location.state.summary);
          
          // Initialize version history with the original summary (only if not already exists)
          if (location.state.summary.styledSummary) {
            try {
              // Check if we already have a version history for this document
              const existingHistory = getSummaryHistory(location.state.document.id);
              if (!existingHistory || existingHistory.versions.length === 0) {
                console.log('🆕 Initializing version history for document:', location.state.document.id);
                addSummaryVersion(location.state.document.id, location.state.summary.styledSummary, true);
              } else {
                console.log('📋 Version history already exists for document:', location.state.document.id, 'versions:', existingHistory.versions.length);
              }
            } catch (error) {
              console.warn('Failed to add summary version:', error);
            }
          }
        } else {
          // We have document but no summary - check if we have it stored, otherwise fetch it
          const existingSummary = getDocumentSummary(location.state.document.id);
          if (existingSummary) {
            setSummary(existingSummary);
            
            // Initialize version history with the existing summary (only if not already exists)
            if (existingSummary.styledSummary) {
              try {
                // Check if we already have a version history for this document
                const existingHistory = getSummaryHistory(location.state.document.id);
                if (!existingHistory || existingHistory.versions.length === 0) {
                  console.log('🆕 Initializing version history for existing summary:', location.state.document.id);
                  addSummaryVersion(location.state.document.id, existingSummary.styledSummary, true);
                } else {
                  console.log('📋 Version history already exists for existing summary:', location.state.document.id, 'versions:', existingHistory.versions.length);
                }
              } catch (error) {
                console.warn('Failed to add summary version:', error);
              }
            }
          } else {
            fetchDocumentSummary(location.state.document);
          }
        }
      } else {
        // Fallback: redirect back to chat if no document data
        navigate('/');
      }
    } catch (error) {
      console.error('Error in SummaryResultsView useEffect:', error);
      // Fallback to home page on error
      navigate('/');
    }
  }, [location.state, navigate, documents, getDocumentSummary, fetchDocumentSummary]); // Removed addSummaryVersion from dependencies

  // Effect to sync UI with store when versions change
  useEffect(() => {
    if (!document) return;
    
    // Get the latest version history from the store
    const history = getSummaryHistory(document.id);
    if (history && history.versions.length > 1) {
      // setShowRestoreButton(true); // Removed showRestoreButton state
    }
    
    // Force a re-render when versions change
    console.log('🔄 Store versions changed, forcing UI update:', {
      documentId: document.id,
      versionsCount: history?.versions.length || 0,
      versions: history?.versions.map(v => ({ id: v.id, versionNumber: v.versionNumber, isOriginal: v.isOriginal }))
    });
  }, [document, getSummaryHistory, summary?.regenerationCount]); // Added regenerationCount dependency

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

  const handleRegenerate = async () => {
    if (!document || !summary) return;
    
    setIsRegenerating(true);
    setRegenerationProgress({ step: 'Preparing regeneration...', progress: 10 });
    
    try {
      console.log('🔄 Starting regeneration for document:', document.id);
      
      setRegenerationProgress({ step: 'Generating new summary...', progress: 50 });
      
      // Use the existing chunked content to regenerate just the styled summary
      const regeneratedSummary = await SummarizationEngine.regenerateStyledSummary(
        document,
        summary.mergedFacts,
        styleGuide,
        summary.regenerationCount ? summary.regenerationCount + 1 : 1
      );
      
      console.log('🔄 New summary generated, length:', regeneratedSummary.length);
      setRegenerationProgress({ step: 'Finalizing...', progress: 90 });
      
      // Add the new regenerated summary to the store's version history
      try {
        const currentModel = summary.processingStats.modelUsed || 'unknown';
        console.log('💾 Adding new regenerated version to store:', { documentId: document.id, contentLength: regeneratedSummary.length });
        
        addSummaryVersion(
          document.id,
          regeneratedSummary,
          false, // Not original
          currentModel
        );
        
        console.log('✅ New regenerated version added to store');
      } catch (error) {
        console.warn('Failed to add regenerated version to store:', error);
        // Continue even if versioning fails
      }
      
      // Update the summary with the new styled version
      const updatedSummary: SummarizationResult = {
        ...summary,
        styledSummary: regeneratedSummary,
        regenerationCount: (summary.regenerationCount || 0) + 1,
        currentVersionId: crypto.randomUUID(),
        versions: summary.versions || [],
        currentVersionIndex: 0
      };
      
      setSummary(updatedSummary);
      
      // Switch to stylized tab to show the new summary
      setActiveTab('stylized');
      
      // Force a re-render to show the new version
      // This ensures the UI updates with the new version from the store
      console.log('✅ Summary updated, UI should refresh');
      setRegenerationProgress({ step: 'Complete!', progress: 100 });
      
      // Clear progress after a brief delay
      setTimeout(() => setRegenerationProgress(null), 1500);
      
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
      setRegenerationProgress({ step: 'Error occurred', progress: 0 });
      // Could show error message here
    } finally {
      setIsRegenerating(false);
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

  const handleDeleteVersion = useCallback(async (versionId: string) => {
    if (!document) return;
    try {
      await deleteSummaryVersion(document.id, versionId);
      console.log('Version deleted:', versionId);
      // Optionally, refetch the summary to update the UI
      const updatedSummary = getDocumentSummary(document.id);
      if (updatedSummary) {
        setSummary(updatedSummary);
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      // Could show error message here
    }
  }, [document, deleteSummaryVersion, getDocumentSummary]);

  const renderStackedVersions = () => {
    if (!summary || !document) return null;
    
    // Use the memoized allVersions for consistency
    console.log('🔍 renderStackedVersions debug:', {
      documentId: document.id,
      allVersionsLength: allVersions.length,
      allVersions: allVersions.map(v => ({ id: v.id, versionNumber: v.versionNumber, isOriginal: v.isOriginal, contentLength: v.summary.length })),
      summaryStyledLength: summary.styledSummary?.length || 0,
      regenerationCount: summary.regenerationCount || 0
    });
    
    // If no versions or only one version, show the current summary
    if (allVersions.length <= 1) {
      console.log('📝 Showing single summary view (no versions in store)');
      return (
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
              {activeTab === 'stylized' 
                ? (summary.styledSummary || 'No stylized summary available')
                : !settings.rawSummaryEnabled
                  ? 'Raw summary generation is disabled to make processing faster. To enable, go to the Settings view and turn on "Raw Summary Generation".'
                  : (summary.rawSummary || 'No raw summary available')
              }
            </ReactMarkdown>
          </div>
        </div>
      );
    }
    
    console.log('📚 Showing stacked versions view:', allVersions.length, 'versions');
    
    // Render stacked versions
    return (
      <div className="space-y-6">
        {/* Comparison Interface */}
        {comparisonMode && (
          <div className={`bg-purple-50 border-2 border-purple-200 rounded-lg p-6 ${fullWidthComparison ? 'mx-0' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-800">Version Comparison</h3>
              <div className="flex items-center gap-3">
                {fullWidthComparison && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    🖥️ Full Width Mode
                  </span>
                )}
                <span className="text-sm text-purple-600">
                  Select two versions to compare
                </span>
              </div>
            </div>
            
            {/* Version Selection */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Left Version Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-purple-700">Left Version</h4>
                <div className="space-y-2">
                  {allVersions.map((version) => (
                    <button
                      key={`left-${version.id}`}
                      onClick={() => selectVersionForComparison(version.id, 'left')}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedVersions.left === version.id
                          ? 'border-purple-400 bg-purple-100 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {version.isOriginal ? '🌱 Original' : `🔵 v${version.versionNumber}`}
                        </span>
                        {selectedVersions.left === version.id && (
                          <span className="text-purple-600">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(version.timestamp).toLocaleString()} • {version.characterCount} chars
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Version Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-purple-700">Right Version</h4>
                <div className="space-y-2">
                  {allVersions.map((version) => (
                    <button
                      key={`right-${version.id}`}
                      onClick={() => selectVersionForComparison(version.id, 'right')}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedVersions.right === version.id
                          ? 'border-purple-400 bg-purple-100 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {version.isOriginal ? '🌱 Original' : `🔵 v${version.versionNumber}`}
                        </span>
                        {selectedVersions.right === version.id && (
                          <span className="text-purple-600">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(version.timestamp).toLocaleString()} • {version.characterCount} chars
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Comparison Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setSelectedVersions({ left: null, right: null })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
              <button
                onClick={toggleComparisonMode}
                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-800"
              >
                Exit Comparison
              </button>
            </div>

            {/* Side-by-Side Comparison View */}
            {canCompare && (
              <div className="mt-6 border-t border-purple-200 pt-6">
                <h4 className="text-lg font-semibold text-purple-800 mb-4 text-center">
                  Side-by-Side Comparison
                </h4>
                <div className={`grid gap-6 ${fullWidthComparison ? 'grid-cols-2 gap-8' : 'grid-cols-2 gap-6'}`}>
                  {/* Left Version */}
                  <div className={`bg-white border-2 border-purple-300 rounded-lg p-4 ${fullWidthComparison ? 'p-6' : 'p-4'}`}>
                    <h5 className="font-semibold text-purple-800 mb-3">
                      {allVersions.find(v => v.id === selectedVersions.left)?.isOriginal ? '🌱 Original' : `🔵 v${allVersions.find(v => v.id === selectedVersions.left)?.versionNumber}`}
                    </h5>
                    <div className={`prose max-h-96 overflow-y-auto text-gray-800 ${fullWidthComparison ? 'prose-base' : 'prose-sm'}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className={`font-bold text-gray-900 mb-2 mt-0 ${fullWidthComparison ? 'text-xl' : 'text-lg'}`}>{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className={`font-bold text-gray-900 mb-2 mt-0 ${fullWidthComparison ? 'text-lg' : 'text-base'}`}>{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className={`font-medium text-gray-800 mb-1 mt-2 ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className={`font-medium text-gray-800 mb-1 mt-2 ${fullWidthComparison ? 'text-sm' : 'text-xs'}`}>{children}</h4>
                          ),
                          p: ({ children }) => (
                            <p className={`text-gray-700 mb-2 leading-relaxed ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="text-gray-700 mb-2 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="text-gray-700 mb-2 space-y-1 list-decimal list-inside">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className={`text-gray-700 flex items-start ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>
                              <span className="text-blue-500 mr-2">•</span>
                              <span>{children}</span>
                            </li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className={`border-l-4 border-blue-400 pl-3 italic text-gray-600 my-2 bg-blue-50 py-2 ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>
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
                            <code className={`bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded font-mono ${fullWidthComparison ? 'text-sm' : 'text-xs'}`}>
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className={`bg-gray-100 text-gray-800 p-2 rounded overflow-x-auto mb-2 font-mono ${fullWidthComparison ? 'text-sm' : 'text-xs'}`}>
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {allVersions.find(v => v.id === selectedVersions.left)?.summary || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  {/* Right Version */}
                  <div className={`bg-white border-2 border-purple-300 rounded-lg p-4 ${fullWidthComparison ? 'p-6' : 'p-4'}`}>
                    <h5 className="font-semibold text-purple-800 mb-3">
                      {allVersions.find(v => v.id === selectedVersions.right)?.isOriginal ? '🌱 Original' : `🔵 v${allVersions.find(v => v.id === selectedVersions.right)?.versionNumber}`}
                    </h5>
                    <div className={`prose max-h-96 overflow-y-auto text-gray-800 ${fullWidthComparison ? 'prose-base' : 'prose-sm'}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className={`font-bold text-gray-900 mb-2 mt-0 ${fullWidthComparison ? 'text-xl' : 'text-lg'}`}>{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className={`font-bold text-gray-900 mb-2 mt-0 ${fullWidthComparison ? 'text-lg' : 'text-base'}`}>{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className={`font-medium text-gray-800 mb-1 mt-2 ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className={`font-medium text-gray-800 mb-1 mt-2 ${fullWidthComparison ? 'text-sm' : 'text-xs'}`}>{children}</h4>
                          ),
                          p: ({ children }) => (
                            <p className={`text-gray-700 mb-2 leading-relaxed ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="text-gray-700 mb-2 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="text-gray-700 mb-2 space-y-1 list-decimal list-inside">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className={`text-gray-700 flex items-start ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>
                              <span className="text-blue-500 mr-2">•</span>
                              <span>{children}</span>
                            </li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className={`border-l-4 border-blue-400 pl-3 italic text-gray-600 my-2 bg-blue-50 py-2 ${fullWidthComparison ? 'text-base' : 'text-sm'}`}>
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
                            <code className={`bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded font-mono ${fullWidthComparison ? 'text-sm' : 'text-xs'}`}>
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className={`bg-gray-100 text-gray-800 p-2 rounded overflow-x-auto mb-2 font-mono ${fullWidthComparison ? 'text-sm' : 'text-xs'}`}>
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {allVersions.find(v => v.id === selectedVersions.right)?.summary || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {allVersions.map((version) => (
          <div key={version.id} id={`version-${version.id}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Version Header */}
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {version.isOriginal ? '🌱' : '🔵'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {version.isOriginal ? 'Original Version' : `Version ${version.versionNumber}`}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{new Date(version.timestamp).toLocaleString()}</span>
                      <span>{version.characterCount.toLocaleString()} characters</span>
                      {version.modelUsed && <span>Model: {version.modelUsed}</span>}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Version Actions */}
              <div className="flex items-center gap-2">
                  {/* Inline Copy Button */}
                  <button
                    onClick={() => handleCopyVersion(version.summary, version.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-md transition-colors"
                  >
                    {copyFeedback?.versionId === version.id ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        <span className="text-green-600 text-xs">{copyFeedback.message}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteVersion(version.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
            </div>
            
            {/* Version Content */}
            <div className="p-6">
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
                  {activeTab === 'stylized' 
                    ? version.summary
                    : !settings.rawSummaryEnabled
                      ? 'Raw summary generation is disabled to make processing faster. To enable, go to the Settings view and turn on "Raw Summary Generation".'
                      : (summary.rawSummary || version.summary)
                  }
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation Panel - Collapsible on Hover */}
      {/* Left Navigation Panel - Collapsible on Hover */}
      <LeftNavigation
        isNavExpanded={fullWidthComparison ? false : isNavExpanded}
        onNavMouseEnter={fullWidthComparison ? () => {} : handleNavMouseEnter}
        onNavMouseLeave={fullWidthComparison ? () => {} : handleNavMouseLeave}
        currentDocumentId={document?.id}
        showNewChatButton={false}
      />
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${fullWidthComparison ? 'w-full' : ''}`}>
        {/* Main Content */}
        <div className={`flex-1 px-6 py-8 overflow-y-auto ${fullWidthComparison ? 'px-2' : ''}`}>
          <div className={`${fullWidthComparison ? 'w-full max-w-none' : 'max-w-4xl mx-auto'}`}>
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
                  
                  {/* Regeneration Progress Display */}
                  {regenerationProgress && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm text-blue-700 font-medium">
                          {regenerationProgress.step}
                        </span>
                      </div>
                      <div className="w-24 bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${regenerationProgress.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Comparison Mode Toggle */}
                    {allVersions.length > 1 && (
                      <button
                        onClick={toggleComparisonMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          comparisonMode
                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="text-sm">🔍</span>
                        <span className="text-sm font-medium">
                          {comparisonMode ? 'Exit Compare' : 'Compare Versions'}
                        </span>
                      </button>
                    )}
                    
                    {/* Regenerate Button */}
                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating || !document || !summary}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRegenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          <span>Regenerate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Compact Processing Metadata - Single line below tabs */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
                  <div className="flex items-center gap-4">
                    <span>Model: <span className="text-gray-700 font-mono">{summary.processingStats.modelUsed || 'Unknown'}</span></span>
                    <span>Time: <span className="text-gray-700">{summary.processingStats.processingTime ? `${Math.floor(summary.processingStats.processingTime / 1000)}s` : 'Unknown'}</span></span>
                    <span>Chunks: <span className="text-gray-700">{summary.processingStats.totalChunks || 0}</span></span>
                    <span>Date: <span className="text-gray-700">{document?.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : 'Unknown'}</span></span>
                    {summary.regenerationCount && summary.regenerationCount > 0 && (
                      <span>Regenerated: <span className="text-gray-700">{summary.regenerationCount}x</span></span>
                    )}
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
                {renderStackedVersions()}
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
