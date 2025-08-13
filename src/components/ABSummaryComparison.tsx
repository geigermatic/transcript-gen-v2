import React, { useState } from 'react';
import { ABSummaryEngine } from '../lib/abSummaryEngine';
import { ExportOptions } from './ExportOptions';
import type { ABSummaryPair, SummarizationResult } from '../types';

interface ABSummaryComparisonProps {
  abPair: ABSummaryPair;
  onFeedbackSubmitted?: () => void;
}

export const ABSummaryComparison: React.FC<ABSummaryComparisonProps> = ({
  abPair,
  onFeedbackSubmitted,
}) => {
  const [selectedWinner, setSelectedWinner] = useState<'A' | 'B' | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [exportingSummary, setExportingSummary] = useState<SummarizationResult | null>(null);

  const handleSubmitFeedback = async () => {
    if (!selectedWinner) return;

    setIsSubmitting(true);
    try {
      ABSummaryEngine.recordFeedback(abPair.id, selectedWinner, reason.trim() || undefined);
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasFeedback = !!abPair.userFeedback;

  const renderSummaryCard = (
    summary: SummarizationResult,
    variant: 'A' | 'B',
    variantName: string,
    description: string
  ) => {
    const isSelected = selectedWinner === variant;
    const isWinner = abPair.userFeedback?.winner === variant;
    
    return (
      <div className={`
        glass-panel p-6 transition-all duration-200
        ${isSelected && !hasFeedback ? 'ring-2 ring-blue-400' : ''}
        ${isWinner ? 'ring-2 ring-green-400' : ''}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Summary {variant}: {variantName}
            </h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
          {!hasFeedback && (
            <button
              onClick={() => setSelectedWinner(isSelected ? null : variant)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all duration-200
                ${isSelected 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70'
                }
              `}
            >
              {isSelected ? 'Selected ✓' : 'Select This'}
            </button>
          )}
          {isWinner && (
            <div className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
              ✓ Winner
            </div>
          )}
        </div>

        {/* Summary Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          <div 
            className="text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: summary.markdownSummary
                .replace(/^### /gm, '<h3 class="text-white font-semibold mt-4 mb-2">')
                .replace(/^## /gm, '<h2 class="text-white font-semibold text-lg mt-4 mb-2">')
                .replace(/^# /gm, '<h1 class="text-white font-bold text-xl mt-4 mb-2">')
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- /gm, '• ')
                .split('\n').map(line => line.trim()).filter(Boolean).join('<br/>')
            }}
          />
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div className="text-center">
              <div className="text-blue-400 font-medium">
                {summary.processingStats.totalChunks}
              </div>
              <div className="text-gray-400">Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-medium">
                {summary.markdownSummary.length}
              </div>
              <div className="text-gray-400">Characters</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400 font-medium">
                {Math.round(summary.processingStats.processingTime / 1000)}s
              </div>
              <div className="text-gray-400">Time</div>
            </div>
          </div>
          <div className="text-center">
            <button
              onClick={() => setExportingSummary(summary)}
              className="glass-button text-sm text-blue-400 hover:text-blue-300"
            >
              📤 Export Summary {variant}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">A/B Summary Comparison</h2>
            <p className="text-gray-400">
              Compare two different summary styles for: <span className="text-white">{abPair.documentTitle}</span>
            </p>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="glass-button text-gray-400 hover:text-white"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {showDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
            <div>
              <h4 className="text-white font-medium mb-2">Variant A Details</h4>
              <p className="text-gray-400 text-sm mb-2">{abPair.variantDetails.variantA.description}</p>
              <div className="text-xs text-gray-500">
                <div>Formality: {abPair.summaryA.document.metadata.wordCount || 'N/A'}</div>
                <div>Strategy: {abPair.variantDetails.variantA.promptStrategy}</div>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Variant B Details</h4>
              <p className="text-gray-400 text-sm mb-2">{abPair.variantDetails.variantB.description}</p>
              <div className="text-xs text-gray-500">
                <div>Formality: {abPair.summaryB.document.metadata.wordCount || 'N/A'}</div>
                <div>Strategy: {abPair.variantDetails.variantB.promptStrategy}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSummaryCard(
          abPair.summaryA,
          'A',
          abPair.variantDetails.variantA.name,
          abPair.variantDetails.variantA.description
        )}
        {renderSummaryCard(
          abPair.summaryB,
          'B',
          abPair.variantDetails.variantB.name,
          abPair.variantDetails.variantB.description
        )}
      </div>

      {/* Feedback Section */}
      {!hasFeedback ? (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Feedback</h3>
          
          {selectedWinner && (
            <div className="mb-4">
              <p className="text-gray-300 mb-2">
                You selected <strong>Summary {selectedWinner}</strong>. 
                Why did you prefer this version? (Optional)
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., 'More engaging tone', 'Better structure', 'Clearer explanations'..."
                className="glass-input w-full h-24 resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {selectedWinner 
                ? 'Click submit to save your preference and help improve the AI.'
                : 'Please select your preferred summary above.'
              }
            </p>
            <button
              onClick={handleSubmitFeedback}
              disabled={!selectedWinner || isSubmitting}
              className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Feedback Submitted</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">
                You chose <strong>Summary {abPair.userFeedback?.winner}</strong>
              </p>
              {abPair.userFeedback?.reason && (
                <p className="text-gray-400 text-sm mt-1">
                  Reason: "{abPair.userFeedback.reason}"
                </p>
              )}
            </div>
            <div className="text-green-400 text-sm">
              ✓ Thank you for your feedback!
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {exportingSummary && (
        <ExportOptions
          summarizationResult={exportingSummary}
          isOpen={!!exportingSummary}
          onClose={() => setExportingSummary(null)}
        />
      )}
    </div>
  );
};
