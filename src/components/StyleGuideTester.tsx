import React, { useState } from 'react';
import { TestTube, Eye, Copy, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { PromptService } from '../lib/promptService';
import { ollama } from '../lib/ollama';

export const StyleGuideTester: React.FC = () => {
  const { styleGuide } = useAppStore();
  const [testText, setTestText] = useState('This is a sample text to test the style guide.');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const testStyleGuide = async () => {
    if (!testText.trim()) return;
    
    setIsTesting(true);
    try {
      // Generate a test prompt using the current style guide
      const prompt = PromptService.buildPrompt('fact-extraction', {
        styleInstructions: styleGuide.instructions_md || 'No style guide set',
        formalityLevel: styleGuide.tone_settings.formality.toString(),
        enthusiasmLevel: styleGuide.tone_settings.enthusiasm.toString(),
        technicalityLevel: styleGuide.tone_settings.technicality.toString(),
        keywords: styleGuide.keywords.join(', ') || 'None specified',
        examplePhrasesSection: buildExamplePhrasesSection(),
        chunkIndex: '1',
        chunkText: testText
      });

      setGeneratedPrompt(prompt);

      // Test with Ollama to see the actual response
      if (await ollama.isAvailable()) {
        const response = await ollama.chat([{
          role: 'user',
          content: prompt
        }]);
        setAiResponse(response);
      } else {
        setAiResponse('Ollama not available - cannot test AI response');
      }
    } catch (error) {
      setAiResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const buildExamplePhrasesSection = () => {
    const { example_phrases } = styleGuide;
    return `
Example Phrases:
- Preferred Openings: ${example_phrases.preferred_openings.join(', ') || 'None specified'}
- Preferred Transitions: ${example_phrases.preferred_transitions.join(', ') || 'None specified'}
- Preferred Conclusions: ${example_phrases.preferred_conclusions.join(', ') || 'None specified'}
- Avoid Phrases: ${example_phrases.avoid_phrases.join(', ') || 'None specified'}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const hasStyleGuide = styleGuide.instructions_md.trim().length > 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="w-6 h-6 text-blue-400" />
        <h3 className="text-hierarchy-h3">Style Guide Tester</h3>
      </div>

      {!hasStyleGuide ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-400 mb-2">No style guide configured</p>
          <p className="text-sm text-gray-500">
            Add custom instructions in Settings → Voice & Style Guide to test them here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Test Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Test Text
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to test how the style guide affects AI processing..."
              className="glass-input w-full h-24 text-white resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This text will be processed using your current style guide
            </p>
          </div>

          {/* Test Button */}
          <button
            onClick={testStyleGuide}
            disabled={isTesting || !testText.trim()}
            className="glass-button-primary w-full disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Testing...
              </>
            ) : (
              <>
                <TestTube size={16} className="mr-2" />
                Test Style Guide
              </>
            )}
          </button>

          {/* Results */}
          {generatedPrompt && (
            <>
              {/* Generated Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Generated Prompt (Sent to AI)
                  </label>
                  <button
                    onClick={() => copyToClipboard(generatedPrompt)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-black bg-opacity-30 border border-gray-600 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {generatedPrompt}
                  </pre>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This shows exactly what's being sent to the AI, including your style guide
                </p>
              </div>

              {/* AI Response */}
              {aiResponse && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      AI Response (Using Your Style Guide)
                    </label>
                    <button
                      onClick={() => copyToClipboard(aiResponse)}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-black bg-opacity-30 border border-gray-600 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {aiResponse}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This shows how the AI actually applied your style guide
                  </p>
                </div>
              )}
            </>
          )}

          {/* Verification Tips */}
          <div className="bg-blue-500 bg-opacity-10 border border-blue-400 border-opacity-30 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">How to Verify Your Style Guide is Working:</h4>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• <strong>Check the prompt:</strong> Your instructions should appear in the "Generated Prompt" above</li>
              <li>• <strong>Compare responses:</strong> Test with and without style guide to see differences</li>
              <li>• <strong>Look for keywords:</strong> Your specified keywords should appear in AI responses</li>
              <li>• <strong>Check tone:</strong> Responses should match your formality/enthusiasm settings</li>
              <li>• <strong>Verify phrases:</strong> Your preferred phrases should be used by the AI</li>
            </ul>
          </div>

          {/* Sample Prompts */}
          <div className="bg-green-500 bg-opacity-10 border border-green-400 border-opacity-30 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-3">Your Style Guide is Applied to:</h4>
            <div className="grid gap-3 text-sm">
              <div>
                <strong className="text-green-300">📝 Fact Extraction:</strong>
                <p className="text-green-200 mt-1">
                  When processing transcript chunks, your style guide influences how facts are extracted and categorized
                </p>
              </div>
              <div>
                <strong className="text-green-300">📋 Summary Generation:</strong>
                <p className="text-green-200 mt-1">
                  All summaries (raw and styled) use your tone settings, keywords, and preferred phrases
                </p>
              </div>
              <div>
                <strong className="text-green-300">💬 Chat Responses:</strong>
                <p className="text-green-200 mt-1">
                  AI chat responses follow your writing style, tone, and preferred language patterns
                </p>
              </div>
              <div>
                <strong className="text-green-300">🔄 Summary Regeneration:</strong>
                <p className="text-green-200 mt-1">
                  When regenerating summaries, your style guide ensures consistent voice and tone
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
