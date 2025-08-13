import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import type { StyleGuide, ToneSettings } from '../types';

interface StyleGuideEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StyleGuideEditor: React.FC<StyleGuideEditorProps> = ({ isOpen, onClose }) => {
  const { styleGuide, updateStyleGuide, addLog } = useAppStore();
  
  // Local state for form
  const [localStyleGuide, setLocalStyleGuide] = useState<StyleGuide>(styleGuide);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sync with store when opened
  useEffect(() => {
    if (isOpen) {
      setLocalStyleGuide(styleGuide);
      setHasChanges(false);
    }
  }, [isOpen, styleGuide]);

  // Track changes
  useEffect(() => {
    const hasChangesNow = JSON.stringify(localStyleGuide) !== JSON.stringify(styleGuide);
    setHasChanges(hasChangesNow);
  }, [localStyleGuide, styleGuide]);

  const handleSave = () => {
    updateStyleGuide(localStyleGuide);
    addLog({
      level: 'info',
      category: 'style-guide',
      message: 'Style guide updated',
      details: {
        tone_settings: localStyleGuide.tone_settings,
        keywords_count: localStyleGuide.keywords.length,
        example_phrases_count: Object.values(localStyleGuide.example_phrases).flat().length,
        instructions_length: localStyleGuide.instructions_md.length
      }
    });
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setLocalStyleGuide(styleGuide);
    setHasChanges(false);
  };

  const updateToneSetting = (key: keyof ToneSettings, value: number) => {
    setLocalStyleGuide(prev => ({
      ...prev,
      tone_settings: {
        ...prev.tone_settings,
        [key]: value
      }
    }));
  };

  const updateKeywords = (keywords: string[]) => {
    setLocalStyleGuide(prev => ({
      ...prev,
      keywords
    }));
  };

  const updateExamplePhrases = (category: string, phrases: string[]) => {
    setLocalStyleGuide(prev => ({
      ...prev,
      example_phrases: {
        ...prev.example_phrases,
        [category]: phrases
      }
    }));
  };

  const addKeyword = () => {
    const newKeyword = prompt('Enter a keyword or phrase:');
    if (newKeyword?.trim()) {
      updateKeywords([...localStyleGuide.keywords, newKeyword.trim()]);
    }
  };

  const removeKeyword = (index: number) => {
    updateKeywords(localStyleGuide.keywords.filter((_, i) => i !== index));
  };

  const addExamplePhrase = (category: string) => {
    const newPhrase = prompt(`Enter a ${category.replace('_', ' ')}:`);
    if (newPhrase?.trim()) {
      const currentPhrases = localStyleGuide.example_phrases[category as keyof typeof localStyleGuide.example_phrases] || [];
      updateExamplePhrases(category, [...currentPhrases, newPhrase.trim()]);
    }
  };

  const removeExamplePhrase = (category: string, index: number) => {
    const currentPhrases = localStyleGuide.example_phrases[category as keyof typeof localStyleGuide.example_phrases] || [];
    updateExamplePhrases(category, currentPhrases.filter((_, i) => i !== index));
  };

  const getToneLabel = (value: number) => {
    if (value < 25) return 'Low';
    if (value < 50) return 'Moderate';
    if (value < 75) return 'High';
    return 'Very High';
  };

  const getToneDescription = (key: keyof ToneSettings, value: number) => {
    const descriptions = {
      formality: {
        low: 'Casual, conversational tone',
        moderate: 'Semi-formal, balanced tone',
        high: 'Professional, structured tone',
        'very high': 'Academic, highly formal tone'
      },
      enthusiasm: {
        low: 'Calm, measured delivery',
        moderate: 'Engaged, interested tone',
        high: 'Energetic, excited tone',
        'very high': 'Highly enthusiastic, passionate tone'
      },
      technicality: {
        low: 'Simple, accessible language',
        moderate: 'Some technical terms with explanations',
        high: 'Technical language for experts',
        'very high': 'Highly technical, domain-specific'
      }
    };
    
    const level = getToneLabel(value).toLowerCase() as keyof typeof descriptions.formality;
    return descriptions[key][level];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Voice & Style Guide Editor</h2>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-yellow-400 text-sm">Unsaved changes</span>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Instructions */}
            <div>
              <label className="block text-white font-medium mb-2">
                Custom Instructions
              </label>
              <textarea
                value={localStyleGuide.instructions_md}
                onChange={(e) => setLocalStyleGuide(prev => ({ ...prev, instructions_md: e.target.value }))}
                placeholder="Enter specific instructions for how the AI should write summaries and respond to questions..."
                className="glass-input w-full h-32 text-white resize-none"
              />
              <p className="text-gray-400 text-sm mt-1">
                These instructions will be included in all AI prompts to guide the writing style.
              </p>
            </div>

            {/* Tone Settings */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Tone Settings</h3>
              <div className="space-y-6">
                {(Object.keys(localStyleGuide.tone_settings) as Array<keyof ToneSettings>).map((key) => {
                  const value = localStyleGuide.tone_settings[key];
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-white font-medium capitalize">
                          {key}
                        </label>
                        <span className="text-blue-400 font-medium">
                          {getToneLabel(value)} ({value})
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => updateToneSetting(key, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none slider"
                      />
                      <p className="text-gray-400 text-sm">
                        {getToneDescription(key, value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-white">Keywords & Phrases</h3>
                <button
                  onClick={addKeyword}
                  className="glass-button text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Keyword
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {localStyleGuide.keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="glass-panel px-3 py-1 flex items-center gap-2 group"
                  >
                    <span className="text-white text-sm">{keyword}</span>
                    <button
                      onClick={() => removeKeyword(index)}
                      className="text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm">
                Keywords and phrases that should be emphasized or included in summaries.
              </p>
            </div>

            {/* Example Phrases */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Example Phrases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(localStyleGuide.example_phrases).map(([category, phrases]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium capitalize">
                        {category.replace('_', ' ')}
                      </h4>
                      <button
                        onClick={() => addExamplePhrase(category)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-1 mb-2">
                      {phrases.map((phrase: string, index: number) => (
                        <div
                          key={index}
                          className="glass-panel px-3 py-2 flex items-center justify-between group"
                        >
                          <span className="text-white text-sm">{phrase}</span>
                          <button
                            onClick={() => removeExamplePhrase(category, index)}
                            className="text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    {phrases.length === 0 && (
                      <p className="text-gray-500 text-sm italic">No phrases added yet</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/20">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="glass-button text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Changes
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="glass-button text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Style Guide
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};
