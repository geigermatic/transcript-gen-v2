import React, { useState, useEffect } from 'react';
import { Edit3, Save, RotateCcw, Copy, FileText, MessageSquare, Search, Zap } from 'lucide-react';
import { useAppStore } from '../store';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'summarization' | 'chat' | 'style-guide' | 'extraction';
  template: string;
  variables: string[];
  icon: React.ReactNode;
}

// Default prompt templates - these will be the fallbacks
const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'fact-extraction',
    name: 'Fact Extraction',
    description: 'Extracts structured facts from transcript chunks',
    category: 'extraction',
    icon: <Search size={16} />,
    variables: ['styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'chunkIndex', 'chunkText'],
    template: `You are extracting structured facts from a teaching transcript chunk. Extract information according to this JSON schema and style guide.

STYLE GUIDE:
{{styleInstructions}}

Tone Settings:
- Formality: {{formalityLevel}}/100 (0=casual, 100=formal)
- Enthusiasm: {{enthusiasmLevel}}/100 (0=calm, 100=energetic) 
- Technical Level: {{technicalityLevel}}/100 (0=simple, 100=technical)

Keywords to emphasize: {{keywords}}

{{examplePhrasesSection}}

JSON SCHEMA:
{
  "class_title": "string (optional)",
  "date_or_series": "string (optional)", 
  "audience": "string (optional)",
  "learning_objectives": ["string array"],
  "key_takeaways": ["string array - REQUIRED"],
  "topics": ["string array - REQUIRED"], 
  "techniques": ["string array - REQUIRED"],
  "action_items": ["string array"],
  "notable_quotes": ["string array"],
  "open_questions": ["string array"],
  "timestamp_refs": ["string array"]
}

INSTRUCTIONS:
1. Extract facts ONLY from this chunk (chunk {{chunkIndex}})
2. Return ONLY valid JSON - no explanations or markdown
3. Include key_takeaways, topics, and techniques (required fields)
4. Use empty arrays for fields with no relevant content
5. Apply the style guide to your extracted content
6. NEVER include individual names - use generic terms like "the instructor", "the teacher", "the speaker", "a student", "a participant"

CHUNK TEXT:
{{chunkText}}

JSON RESPONSE:`
  },
  {
    id: 'summary-generation',
    name: 'Summary Generation',
    description: 'Creates markdown summaries from extracted facts',
    category: 'summarization',
    icon: <FileText size={16} />,
    variables: ['styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'documentTitle', 'extractedFacts'],
    template: `Generate a comprehensive markdown summary from the extracted facts below. Follow the style guide precisely.

STYLE GUIDE:
{{styleInstructions}}

Tone Settings:
- Formality: {{formalityLevel}}/100 (0=casual, 100=formal)
- Enthusiasm: {{enthusiasmLevel}}/100 (0=calm, 100=energetic)
- Technical Level: {{technicalityLevel}}/100 (0=simple, 100=technical)

Keywords to emphasize: {{keywords}}

{{examplePhrasesSection}}

DOCUMENT: {{documentTitle}}
EXTRACTED FACTS:
{{extractedFacts}}

INSTRUCTIONS:
1. Create a well-structured markdown summary
2. Use the extracted facts as your foundation
3. Apply the style guide consistently
4. Include relevant headings and formatting
5. Emphasize techniques and key takeaways
6. Make it engaging and useful for the target audience
7. NEVER include individual names - use generic terms like "the instructor", "the teacher", "the speaker", "a student", "a participant"
8. START with a "## Synopsis" section containing 4-6 sentences that provide a concise overview of the key content and outcomes

MARKDOWN SUMMARY:`
  },
  {
    id: 'chat-response',
    name: 'Chat Response',
    description: 'Generates chat responses based on document context',
    category: 'chat',
    icon: <MessageSquare size={16} />,
    variables: ['summarySection', 'formatRequirements', 'styleInstructions', 'formalityLevel', 'enthusiasmLevel', 'technicalityLevel', 'keywords', 'examplePhrasesSection', 'contextMessages', 'sourceChunks', 'userQuery'],
    template: `You are a helpful AI assistant answering questions about teaching transcripts. You must answer based on the provided source excerpts and any generated summary.

{{summarySection}}{{formatRequirements}}STYLE GUIDE:
{{styleInstructions}}

Tone Settings:
- Formality: {{formalityLevel}}/100 (0=casual, 100=formal)
- Enthusiasm: {{enthusiasmLevel}}/100 (0=calm, 100=energetic)
- Technical Level: {{technicalityLevel}}/100 (0=simple, 100=technical)

Keywords to emphasize: {{keywords}}

{{examplePhrasesSection}}

CONVERSATION CONTEXT:
{{contextMessages}}

SOURCE EXCERPTS:
{{sourceChunks}}

RULES:
1. Answer based on the provided source excerpts and generated summary
2. When users reference "the summary" or "the generated summary", use the GENERATED SUMMARY section above
3. You can work with the summary (rewrite it, extract from it, compare it to sources, etc.)
4. If the sources and summary don't contain relevant information, say "I don't have enough information to answer that question."
5. Reference specific sources when possible using their actual filenames (e.g., "According to [filename]...")
6. Apply the style guide to your response
7. Be helpful and direct
8. NEVER include individual names from the transcript - use generic terms like "the instructor", "the teacher", "the speaker", "a student", "a participant"
9. STRICTLY follow the CRITICAL FORMAT REQUIREMENTS above - count sentences, use exact formatting, respect word limits
10. Structure your response with clear paragraph breaks for better readability
11. Use logical grouping: introduction, main points, examples, and conclusion
12. Start new paragraphs when transitioning between different ideas or topics

HUMAN QUESTION: {{userQuery}}

REMINDER: Follow the format requirements exactly. Count your output before responding.

ASSISTANT RESPONSE:`
  },
  {
    id: 'style-guide-analysis',
    name: 'Style Guide Analysis',
    description: 'Analyzes content to create/refine style guides',
    category: 'style-guide',
    icon: <Zap size={16} />,
    variables: ['currentStyleGuide', 'contentSample'],
    template: `You are refining an existing writing style guide. Current style guide data:

CURRENT STYLE GUIDE:
{{currentStyleGuide}}

Analyze the following newsletter/content sample and CREATE A UNIFIED, COHESIVE style guide that synthesizes all previous learnings with this new sample. You should rewrite the entire guide to be comprehensive and non-repetitive.

For tone_settings: Adjust the existing values slightly toward what you observe in the new sample (don't make dramatic changes, just refine).

For keywords: Focus on VOICE MARKERS that make this author distinctive - transitional words ("however", "meanwhile", "in fact"), connective phrases ("that said", "here's the thing"), characteristic expressions, unique terminology, or signature words. Avoid generic topic words. Merge existing keywords with new ones, removing duplicates (maximum 15 total).

For instructions_md: REWRITE the entire instructions section to be one cohesive writing guide that synthesizes all insights from previous content AND this new sample. Create unified sections that consolidate patterns rather than separate sections. Make it read like a complete, professional style guide.

For example_phrases: Focus on the LINGUISTIC PATTERNS that make this author's voice recognizable:
- preferred_openings: How they uniquely start sentences/paragraphs
- preferred_transitions: Their specific connective style and transitional phrases  
- preferred_conclusions: Their signature way of wrapping up ideas
- avoid_phrases: Connectives/transitions that would sound unlike them

Generate a JSON response with this exact structure:

{
  "instructions_md": "## Writing Style Analysis\\n\\n[Detailed markdown analysis of the writing style, tone, and approach based on the sample]",
  "tone_settings": {
    "formality": [0-100 number based on how formal/professional vs casual the writing is],
    "enthusiasm": [0-100 number based on how energetic/excited vs neutral the writing is],
    "technicality": [0-100 number based on how technical/detailed vs simple the writing is]
  },
  "keywords": [array of 5-10 distinctive voice markers: transitional words, connective phrases, characteristic expressions, unique terminology, or signature words that make this author's voice recognizable],
  "example_phrases": {
    "preferred_openings": [3-5 typical ways this author starts sentences/paragraphs - look for distinctive patterns],
    "preferred_transitions": [3-5 specific transitional phrases, connectives, or linking words this author uses to connect ideas - focus on their unique connective style],
    "preferred_conclusions": [3-5 ways this author wraps up thoughts or concludes sections - look for signature closing patterns],
    "avoid_phrases": [3-5 transitional words, connectives, or stylistic patterns that would sound unlike this author]
  }
}

IMPORTANT: Respond ONLY with valid JSON, no other text.

Newsletter/Content Sample:
{{contentSample}}`
  }
];

export const PromptEditor: React.FC = () => {
  const { addLog } = useAppStore();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [editingPrompt, setEditingPrompt] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load prompts from localStorage or use defaults
  useEffect(() => {
    const savedPrompts = localStorage.getItem('ai-prompts');
    if (savedPrompts) {
      try {
        setPrompts(JSON.parse(savedPrompts));
      } catch (error) {
        console.error('Failed to load saved prompts:', error);
        setPrompts(DEFAULT_PROMPTS);
      }
    } else {
      setPrompts(DEFAULT_PROMPTS);
    }
  }, []);

  // Set initial editing prompt when prompts load or selection changes
  useEffect(() => {
    if (prompts.length > 0) {
      const prompt = prompts.find(p => p.id === selectedPrompt) || prompts[0];
      setEditingPrompt(prompt.template);
      if (!selectedPrompt) {
        setSelectedPrompt(prompt.id);
      }
    }
  }, [prompts, selectedPrompt]);

  const savePrompts = (newPrompts: PromptTemplate[]) => {
    localStorage.setItem('ai-prompts', JSON.stringify(newPrompts));
    setPrompts(newPrompts);
    
    addLog({
      level: 'info',
      category: 'prompt-editor',
      message: 'Prompts saved successfully',
      details: { promptCount: newPrompts.length }
    });
  };

  const handlePromptChange = (value: string) => {
    setEditingPrompt(value);
    const currentPrompt = prompts.find(p => p.id === selectedPrompt);
    setHasChanges(currentPrompt?.template !== value);
  };

  const saveCurrentPrompt = () => {
    const updatedPrompts = prompts.map(prompt => 
      prompt.id === selectedPrompt 
        ? { ...prompt, template: editingPrompt }
        : prompt
    );
    
    savePrompts(updatedPrompts);
    setHasChanges(false);
  };

  const resetCurrentPrompt = () => {
    const defaultPrompt = DEFAULT_PROMPTS.find(p => p.id === selectedPrompt);
    if (defaultPrompt) {
      setEditingPrompt(defaultPrompt.template);
      setHasChanges(true);
    }
  };

  const resetAllPrompts = () => {
    if (confirm('⚠️ Reset all prompts to defaults?\n\nThis will overwrite all your custom modifications. This action cannot be undone.\n\nClick OK to proceed.')) {
      savePrompts(DEFAULT_PROMPTS);
      setEditingPrompt(DEFAULT_PROMPTS.find(p => p.id === selectedPrompt)?.template || '');
      setHasChanges(false);
    }
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(editingPrompt);
    addLog({
      level: 'info',
      category: 'prompt-editor',
      message: 'Prompt copied to clipboard',
      details: { promptId: selectedPrompt }
    });
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const currentPrompt = prompts.find(p => p.id === selectedPrompt);
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
            onClick={resetAllPrompts}
            className="glass-button-secondary text-red-400 hover:bg-red-400 hover:bg-opacity-10"
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
