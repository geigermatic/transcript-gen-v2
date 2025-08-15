/**
 * Prompt Service - Manages AI prompts from localStorage
 * Allows dynamic prompt editing through the UI
 */

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'summarization' | 'chat' | 'style-guide' | 'extraction';
  template: string;
  variables: string[];
}

// Default prompts - fallback if none saved
const DEFAULT_PROMPTS: Record<string, string> = {
  'fact-extraction': `You are extracting structured facts from a teaching transcript chunk. Extract information according to this JSON schema and style guide.

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

JSON RESPONSE:`,

  'summary-generation': `Generate a comprehensive markdown summary from the extracted facts below. Follow the style guide precisely.

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

MARKDOWN SUMMARY:`,

  'chat-response': `You are a helpful AI assistant answering questions about teaching transcripts. You must answer based on the provided source excerpts and any generated summary.

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
5. Reference specific sources when possible (e.g., "According to Source 1...")
6. Apply the style guide to your response
7. Be helpful and direct
8. NEVER include individual names from the transcript - use generic terms like "the instructor", "the teacher", "the speaker", "a student", "a participant"
9. STRICTLY follow the CRITICAL FORMAT REQUIREMENTS above - count sentences, use exact formatting, respect word limits

HUMAN QUESTION: {{userQuery}}

REMINDER: Follow the format requirements exactly. Count your output before responding.

ASSISTANT RESPONSE:`,

  'style-guide-analysis': `You are refining an existing writing style guide. Current style guide data:

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
};

export class PromptService {
  /**
   * Get a prompt template by ID
   */
  static getPrompt(promptId: string): string {
    try {
      const savedPrompts = localStorage.getItem('ai-prompts');
      if (savedPrompts) {
        const prompts: PromptTemplate[] = JSON.parse(savedPrompts);
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) {
          return prompt.template;
        }
      }
    } catch (error) {
      console.error('Failed to load saved prompt:', error);
    }
    
    // Fallback to default
    return DEFAULT_PROMPTS[promptId] || '';
  }

  /**
   * Replace variables in a prompt template
   */
  static buildPrompt(promptId: string, variables: Record<string, string>): string {
    let template = this.getPrompt(promptId);
    
    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, value || '');
    });
    
    return template;
  }

  /**
   * Get all available prompt IDs
   */
  static getPromptIds(): string[] {
    return Object.keys(DEFAULT_PROMPTS);
  }

  /**
   * Check if prompts are customized (different from defaults)
   */
  static arePromptsCustomized(): boolean {
    try {
      const savedPrompts = localStorage.getItem('ai-prompts');
      if (!savedPrompts) return false;
      
      const prompts: PromptTemplate[] = JSON.parse(savedPrompts);
      return prompts.some(prompt => 
        DEFAULT_PROMPTS[prompt.id] && 
        DEFAULT_PROMPTS[prompt.id] !== prompt.template
      );
    } catch (error) {
      return false;
    }
  }
}
