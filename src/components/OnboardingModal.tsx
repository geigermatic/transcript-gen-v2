/**
 * First-time user onboarding sequence
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

interface OnboardingStep {
  title: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const OnboardingModal: React.FC = () => {
  const { 
    hasCompletedOnboarding, 
    setOnboardingComplete, 
    documents,
    isUserTestingMode 
  } = useAppStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Show onboarding for first-time users or when explicitly requested
  useEffect(() => {
    if (!hasCompletedOnboarding && documents.length === 0) {
      setIsVisible(true);
      logInfo('UI', 'First-time onboarding started');
    }
  }, [hasCompletedOnboarding, documents.length]);

  const onboardingSteps: OnboardingStep[] = [
    {
      title: 'Welcome to Transcript Summarizer!',
      content: (
        <div className="space-y-4">
          <p className="text-body">
            A privacy-focused tool for summarizing teaching transcripts and engaging in 
            conversational Q&A using your local AI models.
          </p>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-2">🔒 Privacy First</h3>
            <p className="text-sm text-gray-300">
              All processing happens locally on your machine. Your documents never leave your computer.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 1: Upload Your First Document',
      content: (
        <div className="space-y-4">
          <p className="text-body">
            Start by uploading a document. We support:
          </p>
          <ul className="text-body text-sm space-y-1 ml-4">
            <li>📄 <strong>.docx</strong> - Microsoft Word documents</li>
            <li>📝 <strong>.txt</strong> - Plain text files</li>
            <li>📋 <strong>.md</strong> - Markdown documents</li>
            <li>🎬 <strong>.srt/.vtt</strong> - Subtitle/transcript files</li>
          </ul>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              💡 <strong>Tip:</strong> Files should be between 100KB and 50MB for best results
            </p>
          </div>
        </div>
      ),
      action: {
        label: 'Go to Library →',
        onClick: () => {
          setIsVisible(false);
          window.location.href = '/library';
        },
      },
    },
    {
      title: 'Step 2: Customize Your Style Guide',
      content: (
        <div className="space-y-4">
          <p className="text-body">
            Customize how the AI writes summaries by setting up your style guide:
          </p>
          <ul className="text-body text-sm space-y-2 ml-4">
            <li>🎯 <strong>Tone Settings:</strong> Formal ↔ Casual, Enthusiastic ↔ Reserved</li>
            <li>🔑 <strong>Keywords:</strong> Important terms to emphasize</li>
            <li>💬 <strong>Example Phrases:</strong> Preferred openings, transitions, conclusions</li>
          </ul>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-400 text-sm">
              ✨ <strong>Smart AI:</strong> Your preferences improve the AI's output quality
            </p>
          </div>
        </div>
      ),
      action: {
        label: 'Go to Settings →',
        onClick: () => {
          setIsVisible(false);
          window.location.href = '/settings';
        },
      },
    },
    {
      title: 'Step 3: Generate & Export Summaries',
      content: (
        <div className="space-y-4">
          <p className="text-body">
            Once you've uploaded a document, you can:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <h4 className="text-orange-400 font-medium mb-1">📝 Summarize</h4>
              <p className="text-sm text-gray-300">
                Extract key points, techniques, and action items
              </p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              <h4 className="text-cyan-400 font-medium mb-1">💬 Chat</h4>
              <p className="text-sm text-gray-300">
                Ask questions about your document content
              </p>
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-green-400 text-sm">
              📤 <strong>Export:</strong> Download summaries as Markdown, HTML, or JSON
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set!",
      content: (
        <div className="space-y-4">
          <p className="text-body">
            🎉 You're ready to start using Transcript Summarizer!
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-blue-400">💡</span>
              <span className="text-body">Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+`</kbd> to open Developer Console</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-green-400">🔧</span>
              <span className="text-body">Toggle User Testing Mode in Settings for extra guidance</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-purple-400">🧪</span>
              <span className="text-body">Try A/B testing to compare different summary styles</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      logInfo('UI', `Onboarding step ${currentStep + 2} viewed`);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    logInfo('UI', 'Onboarding skipped');
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setOnboardingComplete(true);
    setIsVisible(false);
    logInfo('UI', 'Onboarding completed');
  };

  if (!isVisible) {
    return null;
  }

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-hierarchy-h2">{currentStepData.title}</h1>
            <p className="text-gray-400 text-sm">
              Step {currentStep + 1} of {onboardingSteps.length}
            </p>
          </div>
          <button
            onClick={skipOnboarding}
            className="text-gray-400 hover:text-white text-sm"
          >
            Skip Tour
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex space-x-2 mb-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {currentStepData.content}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="glass-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex space-x-3">
            {currentStepData.action && (
              <button
                onClick={currentStepData.action.onClick}
                className="glass-button-primary"
              >
                {currentStepData.action.label}
              </button>
            )}
            
            <button
              onClick={nextStep}
              className="glass-button-primary"
            >
              {currentStep === onboardingSteps.length - 1 ? 'Get Started!' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Testing Mode Notice */}
        {isUserTestingMode && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              🧪 <strong>User Testing Mode:</strong> You'll see extra tooltips and guidance throughout the app
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
