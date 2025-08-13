/**
 * Focused summary generation workspace
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import { ABSummaryEngine } from '../lib/abSummaryEngine';
import { ExportOptions } from './ExportOptions';
import { EmbeddingManager } from './EmbeddingManager';
import { logInfo, logTime } from '../lib/logger';
import type { Document, SummarizationResult } from '../types';

interface SummaryWorkspaceProps {
  selectedDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  onSummaryGenerated?: () => void;
}

export const SummaryWorkspace: React.FC<SummaryWorkspaceProps> = ({
  selectedDocument,
  onDocumentSelect,
  onSummaryGenerated
}) => {
  const { documents, styleGuide, getAllEmbeddings } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummarizationResult | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'facts' | 'details'>('summary');

  const summarizationEngine = new SummarizationEngine();
  const abSummaryEngine = new ABSummaryEngine();

  // Clear summary when document changes
  useEffect(() => {
    setSummaryResult(null);
  }, [selectedDocument?.id]);

  const handleGenerateSummary = async () => {
    if (!selectedDocument) return;

    setIsGenerating(true);
    const stopTimer = logTime('SUMMARIZE', 'Summary generation');

    try {
      const result = await summarizationEngine.summarizeDocument(selectedDocument, styleGuide);
      setSummaryResult(result);
      onSummaryGenerated?.();
      
      stopTimer();
      logInfo('SUMMARIZE', 'Summary generated successfully', {
        documentId: selectedDocument.id,
        processingTime: result.processingTime,
        chunkCount: result.chunkCount
      });
    } catch (error) {
      console.error('Summary generation failed:', error);
      logInfo('SUMMARIZE', 'Summary generation failed', { error });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateABSummary = async () => {
    if (!selectedDocument) return;
    
    setIsGenerating(true);
    try {
      await abSummaryEngine.generateABSummaryPair(selectedDocument, styleGuide);
      logInfo('AB_TEST', 'A/B summary pair generated', { documentId: selectedDocument.id });
    } catch (error) {
      console.error('A/B summary generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-white mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-white mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
      .replace(/\n\n/g, '</p><p class="text-body mb-4">')
      .replace(/^/, '<p class="text-body mb-4">')
      .replace(/$/, '</p>');
  };

  if (!selectedDocument) {
    return (
      <div className="text-center py-16">
        <div className="glass-panel p-8 max-w-2xl mx-auto">
          <h2 className="text-hierarchy-h2 mb-4">No Document Selected</h2>
          <p className="text-body mb-6">
            Choose a document to generate AI summaries and insights.
          </p>
          
          {documents.length === 0 ? (
            <p className="text-gray-400">
              Upload your first document in the Upload tab to get started.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-400 mb-4">Select a document:</p>
              {documents.slice(0, 3).map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentSelect(doc)}
                  className="w-full glass-button text-left p-4"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-white font-medium">{doc.metadata.filename}</p>
                      <p className="text-gray-400 text-sm">
                        {doc.metadata.wordCount?.toLocaleString()} words
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-hierarchy-h1 mb-2">AI Summary</h1>
            <p className="text-body">
              Generate structured summaries with key insights and techniques
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <EmbeddingManager document={selectedDocument} compact />
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="glass-button-primary flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Document info */}
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-400">
          <span>📄 {selectedDocument.metadata.filename}</span>
          <span>📊 {selectedDocument.metadata.wordCount?.toLocaleString()} words</span>
          <span>📅 {new Date(selectedDocument.uploadedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Summary Result */}
      {summaryResult && (
        <div className="glass-panel">
          {/* Summary tabs */}
          <div className="border-b border-gray-700">
            <div className="flex px-6">
              {[
                { id: 'summary', label: '📝 Summary', count: null },
                { id: 'facts', label: '🎯 Key Facts', count: summaryResult.facts.key_takeaways?.length || 0 },
                { id: 'details', label: '📊 Details', count: null }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    selectedTab === tab.id
                      ? 'text-teal-400 border-teal-400'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className="ml-2 px-2 py-1 bg-gray-700 text-xs rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
              
              <div className="ml-auto flex items-center space-x-2 py-3">
                <button
                  onClick={() => setShowExportOptions(true)}
                  className="glass-button-secondary text-sm"
                >
                  📤 Export
                </button>
                <button
                  onClick={handleGenerateABSummary}
                  disabled={isGenerating}
                  className="glass-button-secondary text-sm"
                >
                  🧪 A/B Test
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {selectedTab === 'summary' && (
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryResult.summary) }}
              />
            )}

            {selectedTab === 'facts' && (
              <div className="space-y-6">
                {summaryResult.facts.key_takeaways && summaryResult.facts.key_takeaways.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">🎯 Key Takeaways</h3>
                    <ul className="space-y-2">
                      {summaryResult.facts.key_takeaways.map((item, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="text-teal-400 mt-1">•</span>
                          <span className="text-body">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryResult.facts.techniques && summaryResult.facts.techniques.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">🛠️ Techniques</h3>
                    <ul className="space-y-2">
                      {summaryResult.facts.techniques.map((item, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="text-teal-400 mt-1">•</span>
                          <span className="text-body">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryResult.facts.action_items && summaryResult.facts.action_items.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">✅ Action Items</h3>
                    <ul className="space-y-2">
                      {summaryResult.facts.action_items.map((item, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="text-teal-400 mt-1">•</span>
                          <span className="text-body">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-4">
                  <h4 className="text-white font-medium mb-2">Processing Time</h4>
                  <p className="text-2xl text-teal-400">{(summaryResult.processingTime / 1000).toFixed(1)}s</p>
                </div>
                <div className="glass-panel p-4">
                  <h4 className="text-white font-medium mb-2">Chunks Processed</h4>
                  <p className="text-2xl text-teal-400">{summaryResult.chunkCount}</p>
                </div>
                <div className="glass-panel p-4">
                  <h4 className="text-white font-medium mb-2">Model Used</h4>
                  <p className="text-sm text-gray-300">{summaryResult.model}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Getting Started */}
      {!summaryResult && !isGenerating && (
        <div className="glass-panel p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-hierarchy-h2 mb-4">Generate Your First Summary</h2>
            <p className="text-body mb-6">
              Use AI to extract key insights, techniques, and action items from your document. 
              The summary will be customized based on your style guide preferences.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-sm text-gray-300">Key Takeaways</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🛠️</div>
                <p className="text-sm text-gray-300">Techniques & Methods</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm text-gray-300">Action Items</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportOptions && summaryResult && (
        <ExportOptions
          summarizationResult={summaryResult}
          isOpen={showExportOptions}
          onClose={() => setShowExportOptions(false)}
        />
      )}
    </div>
  );
};
