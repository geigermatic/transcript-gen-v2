import React, { useState, useEffect } from 'react';
import { Search, FileText, MessageSquare, Copy, Save, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store';
import { getPrompts, savePrompt, resetPromptToDefault } from '../lib/promptService';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string[];
  icon: React.ReactNode;
}

// Get the actual templates from promptService
const getActualTemplates = (): PromptTemplate[] => {
  const servicePrompts = getPrompts();
  
  return [
    {
      id: 'fact-extraction',
      name: 'Fact Extraction',
      description: 'Extracts structured facts from transcript chunks',
      category: 'extraction',
      icon: <Search size={16} />,
      variables: ['styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'chunkIndex', 'chunkText'],
      template: servicePrompts['fact-extraction'] || ''
    },
    {
      id: 'summary-generation',
      name: 'Summary Generation',
      description: 'Creates markdown summaries from extracted facts',
      category: 'summarization',
      icon: <FileText size={16} />,
      variables: ['styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'documentTitle', 'extractedFacts'],
      template: servicePrompts['summary-generation'] || ''
    },
    {
      id: 'chat-response',
      name: 'Chat Response',
      description: 'Generates chat responses based on document context',
      category: 'chat',
      icon: <MessageSquare size={16} />,
      variables: ['summarySection', 'formatRequirements', 'styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'contextMessages', 'sourceChunks', 'userQuery'],
      template: servicePrompts['chat-response'] || ''
    },
    {
      id: 'summary-regeneration',
      name: 'Summary Regeneration',
      description: 'Creates dramatically different versions of summaries',
      category: 'summarization',
      icon: <RotateCcw size={16} />,
      variables: ['styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'documentTitle', 'extractedFacts', 'timestamp', 'regenerationCount'],
      template: servicePrompts['summary-regeneration'] || ''
    }
  ];
};

export const PromptEditor: React.FC = () => {
  const { addLog } = useAppStore();
  const [prompts, setPrompts] = useState<PromptTemplate[]>(getActualTemplates());
  const [selectedPrompt, setSelectedPrompt] = useState<string>('summary-generation');
  const [editingPrompt, setEditingPrompt] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const currentPrompt = prompts.find(p => p.id === selectedPrompt);

  useEffect(() => {
    if (currentPrompt) {
      setEditingPrompt(currentPrompt.template);
      setHasChanges(false);
    }
  }, [selectedPrompt, currentPrompt]);

  useEffect(() => {
    if (currentPrompt && editingPrompt !== currentPrompt.template) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [editingPrompt, currentPrompt]);

  const handlePromptChange = (newTemplate: string) => {
    setEditingPrompt(newTemplate);
  };

  const saveCurrentPrompt = () => {
    if (!currentPrompt) return;

    try {
      // Save to promptService
      savePrompt(currentPrompt.id, editingPrompt);
      
      // Update local state
      setPrompts(prompts.map(p => 
        p.id === currentPrompt.id 
          ? { ...p, template: editingPrompt }
          : p
      ));

      setHasChanges(false);
      addLog({
        level: 'info',
        category: 'PROMPT',
        message: `Saved template: ${currentPrompt.name}`,
        details: { templateId: currentPrompt.id }
      });
    } catch (error) {
      console.error('Failed to save prompt:', error);
      addLog({
        level: 'error',
        category: 'PROMPT',
        message: 'Failed to save prompt template',
        details: { error, templateId: currentPrompt.id }
      });
    }
  };

  const resetCurrentPrompt = () => {
    if (!currentPrompt) return;

    if (confirm(`Reset "${currentPrompt.name}" to default? This will discard all custom changes.`)) {
      try {
        // Reset in promptService
        resetPromptToDefault(currentPrompt.id);
        
        // Reload templates from service
        setPrompts(getActualTemplates());
        
        addLog({
          level: 'info',
          category: 'PROMPT',
          message: `Reset template to default: ${currentPrompt.name}`,
          details: { templateId: currentPrompt.id }
        });
      } catch (error) {
        console.error('Failed to reset prompt:', error);
        addLog({
          level: 'error',
          category: 'PROMPT',
          message: 'Failed to reset prompt template',
          details: { error, templateId: currentPrompt.id }
        });
      }
    }
  };

  const copyPromptToClipboard = () => {
    if (!currentPrompt) return;

    navigator.clipboard.writeText(editingPrompt).then(() => {
      addLog({
        level: 'info',
        category: 'PROMPT',
        message: 'Copied template to clipboard',
        details: { templateId: currentPrompt.id }
      });
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'extraction', 'summarization', 'chat', 'style-guide'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <h2 className="text-hierarchy-h2 mb-4">AI Prompt Editor</h2>
        <p className="text-gray-300 mb-6">
          View and edit the internal AI prompts used for fact extraction, summarization, chat responses, and style guide analysis.
        </p>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompts..."
              className="glass-input w-full"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="glass-input w-auto"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Global Actions */}
        <div className="flex gap-2">
                      <button
              onClick={resetCurrentPrompt}
              className="glass-button-secondary text-red-400 hover:bg-red-400 hover:bg-opacity-10"
              title="Reset to default"
            >
            <RotateCcw size={16} />
            Reset All to Defaults
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt List */}
        <div className="glass-panel p-6">
          <h3 className="text-hierarchy-h3 mb-4">Prompts</h3>
          <div className="space-y-3">
            {filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedPrompt(prompt.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedPrompt === prompt.id
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-400 shadow-lg shadow-blue-500/20'
                    : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 hover:from-gray-700 hover:to-gray-800 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={selectedPrompt === prompt.id ? 'text-blue-200' : 'text-gray-300'}>
                    {prompt.icon}
                  </span>
                  <span className="font-semibold text-white">{prompt.name}</span>
                </div>
                <p className="text-sm text-gray-200 mb-2 leading-relaxed">{prompt.description}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                  selectedPrompt === prompt.id 
                    ? 'bg-blue-800 bg-opacity-50 text-blue-100' 
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {prompt.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Editor */}
        <div className="lg:col-span-2 glass-panel p-6">
          {currentPrompt && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-hierarchy-h3 flex items-center gap-2">
                    {currentPrompt.icon}
                    {currentPrompt.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{currentPrompt.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyPromptToClipboard}
                    className="glass-button-secondary"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={resetCurrentPrompt}
                    className="glass-button-secondary text-yellow-400"
                    title="Reset to default"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={saveCurrentPrompt}
                    disabled={!hasChanges}
                    className="glass-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save changes"
                  >
                    <Save size={16} />
                    {hasChanges ? 'Save' : 'Saved'}
                  </button>
                </div>
              </div>

              {/* Variables Info */}
              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">Available Variables:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentPrompt.variables.map(variable => (
                    <code key={variable} className="px-2 py-1 bg-black bg-opacity-30 rounded text-green-400 text-sm">
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-2">
                <label className="block text-white font-medium">
                  Prompt Template:
                </label>
                <textarea
                  value={editingPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="glass-input w-full font-mono text-sm resize-none"
                  rows={20}
                  placeholder="Enter your prompt template here..."
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{editingPrompt.length} characters</span>
                  {hasChanges && <span className="text-yellow-400">• Unsaved changes</span>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
