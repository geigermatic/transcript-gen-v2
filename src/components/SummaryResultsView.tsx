/**
 * SummaryResultsView - Dedicated view for displaying document summaries with tabs
 * Similar to Perplexity.ai's query results page layout
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../store';
import type { SummarizationResult, Document } from '../types';
import { SummarizationEngine } from '../lib/summarizationEngine';
import { LeftNavigation } from './LeftNavigation';

export const SummaryResultsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    documents, 
    styleGuide, 
    getDocumentSummary, 
    addSummaryVersion, 
    getSummaryHistory,
    getAllVersions,
    cleanupDuplicateVersions
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'stylized' | 'raw'>('stylized');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [document, setDocument] = useState<Document | null>(null);
  const [summary, setSummary] = useState<SummarizationResult | null>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRestoreButton, setShowRestoreButton] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ versionId: string; message: string } | null>(null);
  const [regenerationProgress, setRegenerationProgress] = useState<{ step: string; progress: number } | null>(null);
  const [scrollToVersion, setScrollToVersion] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });

  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  // Scroll to specific version
  const scrollToVersionElement = (versionId: string) => {
    setScrollToVersion(versionId);
    const element = window.document.getElementById(`version-${versionId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      // Clear the scroll target after animation
      setTimeout(() => setScrollToVersion(null), 1000);
    }
  };

  // Scroll to top when new version is created
  const scrollToTop = () => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  // Version comparison functions
  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    if (comparisonMode) {
      // Reset selections when exiting comparison mode
      setSelectedVersions({ left: null, right: null });
    }
  };

  const selectVersionForComparison = (versionId: string, side: 'left' | 'right') => {
    setSelectedVersions(prev => ({
      ...prev,
      [side]: prev[side] === versionId ? null : versionId
    }));
  };

  const canCompare = selectedVersions.left && selectedVersions.right && selectedVersions.left !== selectedVersions.right;

  // Export and sharing functions
  const exportVersion = useCallback(async (version: any, format: 'markdown' | 'text' | 'html') => {
    try {
      let content = '';
      let filename = '';
      
      switch (format) {
        case 'markdown':
          content = version.summary;
          filename = `summary-v${version.versionNumber}-${new Date(version.timestamp).toISOString().split('T')[0]}.md`;
          break;
        case 'text':
          content = version.summary.replace(/[#*`]/g, ''); // Remove markdown formatting
          filename = `summary-v${version.versionNumber}-${new Date(version.timestamp).toISOString().split('T')[0]}.txt`;
          break;
        case 'html':
          // Convert markdown to HTML (basic conversion)
          content = `<html><head><title>Summary v${version.versionNumber}</title></head><body>${version.summary.replace(/\n/g, '<br>')}</body></html>`;
          filename = `summary-v${version.versionNumber}-${new Date(version.timestamp).toISOString().split('T')[0]}.html`;
          break;
      }
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success feedback
      setCopyFeedback({ versionId: version.id, message: `Exported as ${format.toUpperCase()}` });
      setTimeout(() => setCopyFeedback(null), 2000);
      
    } catch (error) {
      console.error('Failed to export version:', error);
      setCopyFeedback({ versionId: version.id, message: 'Export failed' });
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, []);

  const shareVersion = useCallback(async (version: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Summary v${version.versionNumber}`,
          text: version.summary.substring(0, 100) + '...',
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(version.summary);
        setCopyFeedback({ versionId: version.id, message: 'Shared to clipboard' });
        setTimeout(() => setCopyFeedback(null), 2000);
      }
    } catch (error) {
      console.error('Failed to share version:', error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(version.summary);
        setCopyFeedback({ versionId: version.id, message: 'Shared to clipboard' });
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch (clipboardError) {
        setCopyFeedback({ versionId: version.id, message: 'Share failed' });
        setTimeout(() => setCopyFeedback(null), 2000);
      }
    }
  }, []);

  // Memoized values for performance
  const allVersions = useMemo(() => {
    return getAllVersions(document?.id || '') || [];
  }, [document?.id, summary?.regenerationCount]);

  const hasMultipleVersions = useMemo(() => allVersions.length > 1, [allVersions.length]);

  const currentVersion = useMemo(() => {
    return allVersions[0] || null;
  }, [allVersions]);

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

  const handleCopy = useCallback(async () => {
    const content = activeTab === 'stylized' 
      ? (summary?.styledSummary || 'No stylized summary available')
      : (summary?.rawSummary || 'No raw summary available');
    
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback({ versionId: 'current', message: 'Copied!' });
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (error) {
      console.error('Failed to copy summary:', error);
      // Fallback for older browsers or clipboard issues
      try {
        const textArea = window.document.createElement('textarea');
        textArea.value = content;
        window.document.body.appendChild(textArea);
        textArea.select();
        window.document.execCommand('copy');
        window.document.body.removeChild(textArea);
        setCopyFeedback({ versionId: 'current', message: 'Copied!' });
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
        setCopyFeedback({ versionId: 'current', message: 'Copy failed' });
        setTimeout(() => setCopyFeedback(null), 2000);
      }
    }
  }, [activeTab, summary?.styledSummary, summary?.rawSummary]);

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
        styleGuide
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
              const existingHistory = getSummaryHistory(location.state.document.id);
              if (!existingHistory || existingHistory.versions.length === 0) {
                addSummaryVersion(location.state.document.id, location.state.summary.styledSummary, true);
              } else {
                // Clean up any existing duplicates
                cleanupDuplicateVersions(location.state.document.id);
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
                const existingHistory = getSummaryHistory(location.state.document.id);
                if (!existingHistory || existingHistory.versions.length === 0) {
                  addSummaryVersion(location.state.document.id, existingSummary.styledSummary, true);
                } else {
                  // Clean up any existing duplicates
                  cleanupDuplicateVersions(location.state.document.id);
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
  }, [location.state, navigate, documents, getDocumentSummary, fetchDocumentSummary, addSummaryVersion]);

  // Effect to sync UI with store when versions change
  useEffect(() => {
    if (!document) return;
    
    // Get the latest version history from the store
    const history = getSummaryHistory(document.id);
    if (history && history.versions.length > 1) {
      setShowRestoreButton(true);
    }
  }, [document, getSummaryHistory]);

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
      
      // Save current version before regenerating
      if (summary.styledSummary) {
        setRegenerationProgress({ step: 'Saving current version...', progress: 25 });
        
        try {
          const currentModel = summary.processingStats.modelUsed || 'unknown';
          console.log('💾 Saving current version with model:', currentModel);
          
          // Add current version to history with proper metadata
          addSummaryVersion(
            document.id, 
            summary.styledSummary, 
            false, // Not original
            currentModel
          );
          setShowRestoreButton(true);
          
          console.log('✅ Current version saved to history');
          setRegenerationProgress({ step: 'Current version saved...', progress: 50 });
        } catch (error) {
          console.warn('Failed to save summary version:', error);
          // Continue with regeneration even if versioning fails
        }
      }
      
      setRegenerationProgress({ step: 'Generating new summary...', progress: 75 });
      
      // Use the existing chunked content to regenerate just the styled summary
      const regeneratedSummary = await SummarizationEngine.regenerateStyledSummary(
        document,
        summary.mergedFacts,
        styleGuide,
        summary.regenerationCount ? summary.regenerationCount + 1 : 1
      );
      
      console.log('🔄 New summary generated, length:', regeneratedSummary.length);
      setRegenerationProgress({ step: 'Finalizing...', progress: 90 });
      
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
      
      // Scroll to top to show the new version
      setTimeout(() => {
        scrollToTop();
      }, 100);
      
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

  const handleRestore = () => {
    if (!document || !summary) return;
    
    const history = getSummaryHistory(document.id);
    if (!history || history.versions.length === 0) return;
    
    // Get the previous version (second to last, since last is current)
    const previousVersion = history.versions[history.versions.length - 2];
    if (!previousVersion) return;
    
    // Restore the previous version
    const restoredSummary: SummarizationResult = {
      ...summary,
      styledSummary: previousVersion.summary,
      regenerationCount: (summary.regenerationCount || 1) - 1,
      currentVersionId: previousVersion.id
    };
    
    setSummary(restoredSummary);
    
    // Check if we should hide restore button (back to original)
    if (previousVersion.isOriginal) {
      setShowRestoreButton(false);
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

  const renderStackedVersions = () => {
    if (!summary || !document) return null;
    
    // Get all versions from the store
    const allVersions = getAllVersions(document.id);
    
    // If no versions or only one version, show the current summary
    if (allVersions.length <= 1) {
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
                : (summary.rawSummary || 'No raw summary available')
              }
            </ReactMarkdown>
          </div>
        </div>
      );
    }
    
    // Render stacked versions
    return (
      <div className="space-y-6">
        {/* Version Navigation */}
        {hasMultipleVersions && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Version Navigation</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {allVersions.length} versions • {currentVersion?.regenerationCount || 0} regenerations
                </span>
                {allVersions.length > 1 && (
                  <button
                    onClick={() => cleanupDuplicateVersions(document?.id || '')}
                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                    title="Remove duplicate versions"
                  >
                    🧹 Clean
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {allVersions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => scrollToVersionElement(version.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${scrollToVersion === version.id
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }
                    ${version.isOriginal ? 'ring-2 ring-green-200' : ''}
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    scrollToVersion === version.id ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></span>
                  <span>{version.isOriginal ? 'Original' : `v${version.versionNumber}`}</span>
                  {version.isOriginal && <span className="text-green-600">🌱</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Interface */}
        {comparisonMode && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-800">Version Comparison</h3>
              <span className="text-sm text-purple-600">
                Select two versions to compare
              </span>
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
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Version */}
                  <div className="bg-white border-2 border-purple-300 rounded-lg p-4">
                    <h5 className="font-semibold text-purple-800 mb-3">
                      {allVersions.find(v => v.id === selectedVersions.left)?.isOriginal ? '🌱 Original' : `🔵 v${allVersions.find(v => v.id === selectedVersions.left)?.versionNumber}`}
                    </h5>
                    <div className="prose prose-sm max-h-96 overflow-y-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {allVersions.find(v => v.id === selectedVersions.left)?.summary || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  {/* Right Version */}
                  <div className="bg-white border-2 border-purple-300 rounded-lg p-4">
                    <h5 className="font-semibold text-purple-800 mb-3">
                      {allVersions.find(v => v.id === selectedVersions.right)?.isOriginal ? '🌱 Original' : `🔵 v${allVersions.find(v => v.id === selectedVersions.right)?.versionNumber}`}
                    </h5>
                    <div className="prose prose-sm max-h-96 overflow-y-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                {/* Export Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-md transition-colors">
                    <span>📤</span>
                    <span>Export</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
                    <button
                      onClick={() => exportVersion(version, 'markdown')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      📄 Markdown (.md)
                    </button>
                    <button
                      onClick={() => exportVersion(version, 'text')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      📝 Plain Text (.txt)
                    </button>
                    <button
                      onClick={() => exportVersion(version, 'html')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    >
                      🌐 HTML (.html)
                    </button>
                  </div>
                </div>
                
                {/* Share Button */}
                <button
                  onClick={() => shareVersion(version)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded-md transition-colors"
                >
                  <span>📤</span>
                  <span>Share</span>
                </button>
                
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
                  {version.summary}
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
                    
                    {/* Restore Button - Only show when there are previous versions */}
                    {showRestoreButton && (
                      <button
                        onClick={handleRestore}
                        disabled={!summary}
                        className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span>Restore</span>
                      </button>
                    )}
                    
                    {/* Copy Button */}
                    <button
                      onClick={handleCopy}
                      disabled={!summary}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Copy size={16} />
                      <span>Copy Current</span>
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
