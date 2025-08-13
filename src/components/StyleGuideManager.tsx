import React, { useState } from 'react';
import { useAppStore } from '../store';
import { StyleGuideEditor } from './StyleGuideEditor';

export const StyleGuideManager: React.FC = () => {
  const { styleGuide, addLog } = useAppStore();
  const [showEditor, setShowEditor] = useState(false);

  const getToneLabel = (value: number) => {
    if (value < 25) return 'Low';
    if (value < 50) return 'Moderate';
    if (value < 75) return 'High';
    return 'Very High';
  };

  const exportStyleGuide = () => {
    const dataStr = JSON.stringify(styleGuide, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'style-guide.json';
    link.click();
    URL.revokeObjectURL(url);

    addLog({
      level: 'info',
      category: 'style-guide',
      message: 'Style guide exported as JSON',
      details: { filename: 'style-guide.json' }
    });
  };

  const totalExamplePhrases = Object.values(styleGuide.example_phrases).flat().length;
  const hasCustomInstructions = styleGuide.instructions_md.trim().length > 0;

  return (
    <>
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Voice & Style Guide</h2>
          <div className="flex gap-3">
            <button
              onClick={exportStyleGuide}
              className="glass-button text-gray-400 hover:text-white"
              title="Export style guide as JSON"
            >
              📤 Export
            </button>
            <button
              onClick={() => setShowEditor(true)}
              className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
            >
              ✏️ Edit Style Guide
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{styleGuide.keywords.length}</div>
              <div className="text-gray-400 text-sm">Keywords</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{totalExamplePhrases}</div>
              <div className="text-gray-400 text-sm">Example Phrases</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {hasCustomInstructions ? '✓' : '○'}
              </div>
              <div className="text-gray-400 text-sm">Custom Instructions</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">
                {Math.round((styleGuide.tone_settings.formality + styleGuide.tone_settings.enthusiasm + styleGuide.tone_settings.technicality) / 3)}
              </div>
              <div className="text-gray-400 text-sm">Avg Tone Level</div>
            </div>
          </div>

          {/* Current Tone Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Current Tone Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(styleGuide.tone_settings).map(([key, value]) => (
                <div key={key} className="glass-panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">{key}</span>
                    <span className="text-blue-400 font-medium">{getToneLabel(value)}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="text-right text-gray-400 text-sm mt-1">{value}/100</div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords Preview */}
          {styleGuide.keywords.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Active Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {styleGuide.keywords.slice(0, 10).map((keyword, index) => (
                  <span
                    key={index}
                    className="glass-panel px-3 py-1 text-sm text-white"
                  >
                    {keyword}
                  </span>
                ))}
                {styleGuide.keywords.length > 10 && (
                  <span className="glass-panel px-3 py-1 text-sm text-gray-400">
                    +{styleGuide.keywords.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Custom Instructions Preview */}
          {hasCustomInstructions && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Custom Instructions</h3>
              <div className="glass-panel p-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {styleGuide.instructions_md.length > 200
                    ? `${styleGuide.instructions_md.substring(0, 200)}...`
                    : styleGuide.instructions_md
                  }
                </p>
                {styleGuide.instructions_md.length > 200 && (
                  <button
                    onClick={() => setShowEditor(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    Read full instructions →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Getting Started */}
          {!hasCustomInstructions && styleGuide.keywords.length === 0 && totalExamplePhrases === 0 && (
            <div className="glass-panel p-6 text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-lg font-semibold text-white mb-2">Customize Your AI's Voice</h3>
              <p className="text-gray-400 mb-4">
                Set up your style guide to make the AI write summaries and answer questions in your preferred tone and style.
              </p>
              <button
                onClick={() => setShowEditor(true)}
                className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      <StyleGuideEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
      />
    </>
  );
};
