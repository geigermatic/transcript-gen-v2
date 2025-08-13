import React, { useState } from 'react';
import { ExportEngine, type ExportFormat } from '../lib/exportEngine';
import type { SummarizationResult } from '../types';

interface ExportOptionsProps {
  summarizationResult: SummarizationResult;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  summarizationResult,
  isOpen,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    {
      value: 'markdown' as ExportFormat,
      label: 'Markdown (.md)',
      description: 'Plain text with formatting - perfect for GitHub, notes, and documentation',
      icon: '📝',
    },
    {
      value: 'html' as ExportFormat,
      label: 'HTML (.html)',
      description: 'Web page format - can be opened in any browser with styled formatting',
      icon: '🌐',
    },
    {
      value: 'json' as ExportFormat,
      label: 'JSON (.json)',
      description: 'Structured data format - matches PRD schema for integration and analysis',
      icon: '📊',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportResult = ExportEngine.exportSummary(summarizationResult, selectedFormat);
      ExportEngine.downloadExport(exportResult);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      // Could add toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  const getPreview = () => {
    const { document, mergedFacts } = summarizationResult;
    
    switch (selectedFormat) {
      case 'markdown':
        return `# ${document.title}

**Key Takeaways:**
${mergedFacts.key_takeaways?.slice(0, 3).map(item => `- ${item}`).join('\n') || '- No takeaways extracted'}

**Topics:**
${mergedFacts.topics?.slice(0, 3).map(item => `- ${item}`).join('\n') || '- No topics extracted'}

**Techniques:**
${mergedFacts.techniques?.slice(0, 3).map(item => `- ${item}`).join('\n') || '- No techniques extracted'}

*...and more*`;

      case 'html':
        return `<!DOCTYPE html>
<html>
<head>
    <title>${document.title} - Summary</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: auto; }
        h1 { color: #2c3e50; }
        .facts { background: #f8f9fa; padding: 20px; }
    </style>
</head>
<body>
    <h1>${document.title}</h1>
    <div class="facts">
        <h3>Key Takeaways</h3>
        <ul>
            ${mergedFacts.key_takeaways?.slice(0, 2).map(item => `<li>${item}</li>`).join('') || '<li>No takeaways extracted</li>'}
        </ul>
    </div>
    <!-- ...styled content continues... -->
</body>
</html>`;

      case 'json':
        return JSON.stringify({
          document_info: {
            title: document.title,
            filename: document.filename,
          },
          extracted_facts: {
            class_title: mergedFacts.class_title || null,
            learning_objectives: mergedFacts.learning_objectives || [],
            key_takeaways: mergedFacts.key_takeaways || [],
            topics: mergedFacts.topics || [],
            techniques: mergedFacts.techniques || [],
            action_items: mergedFacts.action_items || [],
            notable_quotes: mergedFacts.notable_quotes || [],
            open_questions: mergedFacts.open_questions || [],
            timestamp_refs: mergedFacts.timestamp_refs || [],
          },
          export_info: {
            timestamp: new Date().toISOString(),
            format_version: "1.0",
          }
        }, null, 2);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Export Summary</h2>
              <p className="text-gray-400">
                Export "{summarizationResult.document.title}" in your preferred format
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Format Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Choose Export Format</h3>
              <div className="space-y-3">
                {formatOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`
                      glass-panel p-4 cursor-pointer transition-all duration-200
                      ${selectedFormat === option.value 
                        ? 'ring-2 ring-blue-400 bg-blue-600/10' 
                        : 'hover:bg-white/5'
                      }
                    `}
                    onClick={() => setSelectedFormat(option.value)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{option.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{option.label}</span>
                          {selectedFormat === option.value && (
                            <span className="text-blue-400 text-sm">✓ Selected</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="mt-6 glass-panel p-4">
                <h4 className="text-white font-medium mb-3">Summary Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-blue-400 font-medium">
                      {summarizationResult.processingStats.totalChunks}
                    </div>
                    <div className="text-gray-400">Chunks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-medium">
                      {summarizationResult.markdownSummary.length}
                    </div>
                    <div className="text-gray-400">Characters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-medium">
                      {Object.values(summarizationResult.mergedFacts).flat().length}
                    </div>
                    <div className="text-gray-400">Facts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-400 font-medium">
                      {Math.round(summarizationResult.processingStats.processingTime / 1000)}s
                    </div>
                    <div className="text-gray-400">Time</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="glass-panel p-4 h-96 overflow-y-auto">
                <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                  {getPreview()}
                </pre>
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                <div className="flex items-center justify-between">
                  <span>This is a preview - the full export contains more content</span>
                  <span>{selectedFormat.toUpperCase()} format</span>
                </div>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/20">
            <div className="text-gray-400 text-sm">
              File will be downloaded as: <code className="bg-black/20 px-1 rounded">
                {summarizationResult.document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.{selectedFormat === 'markdown' ? 'md' : selectedFormat}
              </code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="glass-button text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
