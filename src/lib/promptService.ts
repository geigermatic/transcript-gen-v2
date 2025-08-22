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

  'summary-generation': `Generate a comprehensive markdown summary from the extracted facts below. This is a lesson/teaching/meditation transcript. Follow the style guide precisely.

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

REQUIRED STRUCTURE (use this exact format):
# {{documentTitle}}

## Synopsis
[Exactly 4 sentences emphasizing WHY and WHAT benefits - in author's voice]

## Learning Objectives
[What students will learn - bulleted list]

## Key Takeaways
[Main insights and lessons - bulleted list]

## Topics
[Subject areas covered - bulleted list]

## Techniques
[Specific methods, practices, exercises taught - bulleted list]

## Notable Quotes
[Memorable quotes from the lesson - bulleted list]

## Open Questions
[Questions for reflection or further exploration - bulleted list]

INSTRUCTIONS:
1. Follow the exact structure above - ALL sections must be included in this order
2. Use the extracted facts to populate each section appropriately
3. Apply the style guide consistently throughout, but ESPECIALLY in the synopsis
4. Make each section engaging and useful for students/practitioners
5. Always refer to the instructor as "Caren" throughout
6. Use lesson-appropriate language - start with phrases like "In this lesson", "In this teaching", "In this session"
7. If a section has no content in the extracted facts, write "No specific [section name] identified in this lesson"

CRITICAL SYNOPSIS REQUIREMENTS: The synopsis is the MOST IMPORTANT section and must be written 100% in the author's voice using the style guide above. Apply ALL tone settings, keywords, example phrases, and writing patterns heavily in the synopsis. Use the author's preferred openings, transitions, and voice markers. Focus on benefits, transformation, and practical outcomes rather than just describing content. Answer questions like: What problems does this solve? What will you feel/experience? How will you be different after? What specific results can you expect? Make this section sound exactly like the author would write it. LIMIT TO EXACTLY 4 SENTENCES.

MARKDOWN SUMMARY:`,

  'summary-regeneration': `REGENERATION MODE: Create a DRAMATICALLY DIFFERENT version of the stylized summary. You MUST vary your approach significantly from any previous version.

RANDOMIZATION SEED: {{timestamp}}
REGENERATION COUNT: {{regenerationCount}}

⚠️ CRITICAL: This is regeneration #{{regenerationCount}} - you MUST create something substantially different or you will fail this task.

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

REQUIRED STRUCTURE (use this exact format):
# {{documentTitle}}

## Synopsis
[Exactly 4 sentences emphasizing WHY and WHAT benefits - in author's voice - MAKE THIS DRAMATICALLY DIFFERENT]

## Learning Objectives
[What students will learn - bulleted list]

## Key Takeaways
[Main insights and lessons - bulleted list]

## Topics
[Subject areas covered - bulleted list]

## Techniques
[Specific methods, practices, exercises taught - bulleted list]

## Notable Quotes
[Memorable quotes from the lesson - bulleted list]

## Open Questions
[Questions for reflection or further exploration - bulleted list]

🚨 MANDATORY VARIATION REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

SYNOPSIS VARIATION STRATEGIES - PICK ONE AND COMMIT FULLY:
A) URGENCY ANGLE: Focus on immediate relief, problems being solved right now, time-sensitive benefits
B) DISCOVERY ANGLE: Frame as uncovering secrets, hidden knowledge, breakthrough insights, "aha moments"
C) TRANSFORMATION ANGLE: Emphasize the before/after state, who you become, identity shifts
D) PRACTICAL ANGLE: Stress tangible skills, concrete tools, real-world application, hands-on results
E) EMOTIONAL ANGLE: Lead with feelings, inner states, emotional journey, heart-centered benefits
F) CURIOSITY ANGLE: Pose intriguing questions, mysteries to be solved, intellectual stimulation

MANDATORY SYNOPSIS CHANGES - EVERY SINGLE ONE MUST BE DIFFERENT:
- Use COMPLETELY different opening sentence structure than before
- Choose different benefits/outcomes to highlight
- Vary the emotional tone within your style guide parameters
- Use different combinations of your voice markers
- Focus on different aspects of transformation
- MUST start with a different phrase pattern than any standard approach
- Use different metaphors or analogies if applicable
- Emphasize different timeframes (immediate vs long-term benefits)

🎯 REGENERATION-SPECIFIC INSTRUCTIONS:
1. If this feels similar to a typical summary, STOP and rewrite with a more unique angle
2. Push beyond your comfort zone while staying true to the author's voice
3. Use the timestamp {{timestamp}} as a seed for randomization
4. This is regeneration #{{regenerationCount}} - make it count!
5. Vary sentence structure, word choice, and emphasis patterns
6. Focus on different aspects of the same facts

INSTRUCTIONS:
1. Follow the exact structure above - ALL sections must be included in this order
2. Use the extracted facts to populate each section appropriately
3. Apply the style guide consistently throughout, but ESPECIALLY in the synopsis
4. Make each section engaging and useful for students/practitioners
5. Always refer to the instructor as "Caren" throughout
6. Use lesson-appropriate language - start with phrases like "In this lesson", "In this teaching", "In this session"
7. If a section has no content in the extracted facts, write "No specific [section name] identified in this lesson"

🚨 FINAL CHECK: Before submitting, ask yourself: "Is this DRAMATICALLY different from a typical summary?" If not, rewrite it!

MARKDOWN SUMMARY:`,

  'chat-response': `You are a helpful AI assistant answering questions about lesson/teaching/meditation transcripts. You must answer based on the provided source excerpts and any generated summary.

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
8. Always refer to the instructor as "Caren" throughout your responses
9. Use lesson-appropriate language when discussing the content (e.g., "In this lesson", "Caren teaches", etc.)
10. STRICTLY follow the CRITICAL FORMAT REQUIREMENTS above - count sentences, use exact formatting, respect word limits

HUMAN QUESTION: {{userQuery}}

REMINDER: Follow the format requirements exactly. Count your output before responding.

ASSISTANT RESPONSE:`,

  'style-guide-analysis': `You are refining an existing writing style guide. Current style guide data:

CURRENT STYLE GUIDE:
{{currentStyleGuide}}

You have access to ALL source content that was used to build the current style guide, PLUS a new content sample. Your task is to CREATE A COMPLETELY NEW, UNIFIED style guide that synthesizes insights from ALL content samples (both previous and new). 

ALL SOURCE CONTENT (including previous samples):
{{allSourceContent}}

NEW CONTENT SAMPLE:
{{contentSample}}

Study ALL the content above and create a comprehensive style guide that captures patterns across the entire body of work. This should be increasingly sophisticated as more samples are added.

For tone_settings: Adjust the existing values slightly toward what you observe in the new sample (don't make dramatic changes, just refine).

For keywords: Focus on VOICE MARKERS that make this author distinctive - transitional words ("however", "meanwhile", "in fact"), connective phrases ("that said", "here's the thing"), characteristic expressions, unique terminology, or signature words. Avoid generic topic words. Merge existing keywords with new ones, removing duplicates (maximum 15 total).

For instructions_md: You MUST completely REWRITE the entire instructions section from scratch, analyzing ALL source content provided above. Do NOT append or add sections. Do NOT include "### Additional Insights" or similar headers. Instead, synthesize insights from the ENTIRE BODY OF CONTENT (all samples) into ONE unified, comprehensive writing guide. Look for patterns that emerge across multiple samples - the more samples you have, the more sophisticated and nuanced your analysis should become. Consolidate all patterns into integrated sections. The result should read like a single, expert-level style guide that captures the author's voice across their entire body of work.

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

CRITICAL JSON FORMATTING REQUIREMENTS:
1. Respond with ONLY valid JSON - no markdown, no explanations, no extra text
2. Use proper JSON escaping for all special characters (\n for newlines, \" for quotes)
3. Do NOT include trailing commas anywhere in the JSON
4. Ensure all string values are properly quoted
5. Test your JSON mentally before responding

CRITICAL CONTENT REQUIREMENTS:
1. The instructions_md field must be a COMPLETE REWRITE, not an addition
2. Do NOT include headers like "### Additional Insights" or "### Update from [Date]"  
3. Do NOT append new sections to existing content
4. Write the instructions_md as if creating a brand new style guide that happens to incorporate all the insights

EXAMPLE JSON FORMAT (note: no trailing commas):
{
  "instructions_md": "## Writing Style Analysis\\n\\n[content with proper escaping]",
  "tone_settings": {
    "formality": 50,
    "enthusiasm": 70,
    "technicality": 40
  },
  "keywords": ["word1", "word2"],
  "example_phrases": {
    "preferred_openings": ["example1", "example2"],
    "preferred_transitions": ["example1", "example2"],
    "preferred_conclusions": ["example1", "example2"],
    "avoid_phrases": ["example1", "example2"]
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
