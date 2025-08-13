import React, { useState } from 'react';
import { ABSummaryEngine } from '../lib/abSummaryEngine';
import { ABSummaryComparison } from './ABSummaryComparison';
import { useAppStore } from '../store';
import type { Document, ABSummaryPair } from '../types';

interface ABSummaryManagerProps {
  document: Document;
}

export const ABSummaryManager: React.FC<ABSummaryManagerProps> = ({ document }) => {
  const { styleGuide, abSummaryPairs } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPair, setCurrentPair] = useState<ABSummaryPair | null>(null);
  const [progress, setProgress] = useState({ stage: '', current: 0, total: 0 });
  const [showComparison, setShowComparison] = useState(false);

  // Check if there's an existing A/B pair for this document
  const existingPair = abSummaryPairs.find(pair => pair.documentId === document.id);

  const handleGenerateABSummary = async () => {
    setIsGenerating(true);
    setProgress({ stage: 'Initializing...', current: 0, total: 3 });

    try {
      const abPair = await ABSummaryEngine.generateABSummaryPair(
        document,
        styleGuide,
        (stage, current, total) => {
          setProgress({ stage, current, total });
        }
      );

      setCurrentPair(abPair);
      setShowComparison(true);
    } catch (error) {
      console.error('Failed to generate A/B summary:', error);
    } finally {
      setIsGenerating(false);
      setProgress({ stage: '', current: 0, total: 0 });
    }
  };

  const handleViewExisting = () => {
    if (existingPair) {
      setCurrentPair(existingPair);
      setShowComparison(true);
    }
  };

  const handleFeedbackSubmitted = () => {
    // Refresh the view to show the updated feedback
    if (currentPair) {
      const updatedPair = abSummaryPairs.find(pair => pair.id === currentPair.id);
      if (updatedPair) {
        setCurrentPair(updatedPair);
      }
    }
  };

  if (showComparison && currentPair) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowComparison(false)}
            className="glass-button text-gray-400 hover:text-white"
          >
            ← Back to A/B Manager
          </button>
        </div>
        <ABSummaryComparison 
          abPair={currentPair} 
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">A/B Summary Testing</h3>
          <p className="text-gray-400">
            Generate two different summary styles and choose your preference
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl">🧪</div>
        </div>
      </div>

      {/* Existing A/B Test */}
      {existingPair && (
        <div className="mb-6 p-4 glass-panel">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Existing A/B Test</h4>
              <p className="text-gray-400 text-sm">
                Created: {new Date(existingPair.createdAt).toLocaleDateString()}
                {existingPair.userFeedback && (
                  <span className="ml-2 text-green-400">
                    ✓ Feedback submitted (Winner: {existingPair.userFeedback.winner})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleViewExisting}
              className="glass-button text-blue-400 hover:text-blue-300"
            >
              View Comparison
            </button>
          </div>
        </div>
      )}

      {/* Generation Status */}
      {isGenerating && (
        <div className="mb-6 p-4 glass-panel">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">Generating A/B Summaries</h4>
            <div className="text-blue-400 text-sm">
              {progress.current}/{progress.total}
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300 text-sm">{progress.stage}</span>
                <span className="text-gray-400 text-xs">
                  {Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
            
            <div className="text-gray-400 text-xs">
              This process generates two different summary styles using variant approaches.
              It may take 1-2 minutes depending on document length.
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="mb-6 p-4 glass-panel">
        <h4 className="text-white font-medium mb-3">How A/B Testing Works</h4>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">A.</span>
            <span><strong className="text-white">Professional & Structured:</strong> More formal tone with clear organization and bullet points</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-400 font-bold">B.</span>
            <span><strong className="text-white">Conversational & Engaging:</strong> More casual tone with storytelling elements</span>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Your feedback helps improve the AI's understanding of your preferences and writing style.
          </div>
        </div>
      </div>

      {/* Style Guide Preview */}
      <div className="mb-6 p-4 glass-panel">
        <h4 className="text-white font-medium mb-3">Current Style Guide</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-blue-400 font-medium">
              {styleGuide.tone_settings.formality}
            </div>
            <div className="text-gray-400">Formality</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-medium">
              {styleGuide.tone_settings.enthusiasm}
            </div>
            <div className="text-gray-400">Enthusiasm</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-medium">
              {styleGuide.tone_settings.technicality}
            </div>
            <div className="text-gray-400">Technical Level</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Both summary variants will be based on your current style guide settings, with variations applied.
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-gray-400 text-sm">
          {existingPair 
            ? 'Generate a new A/B test or view the existing one above.'
            : 'Ready to generate two summary variants for comparison.'
          }
        </div>
        <button
          onClick={handleGenerateABSummary}
          disabled={isGenerating}
          className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate A/B Summaries'}
        </button>
      </div>
    </div>
  );
};
