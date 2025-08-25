import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Upload, Edit3, Save, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { PromptService } from '../lib/promptService';
import type { ToneSettings, StyleGuide } from '../types';
import { StyleGuideTester } from './StyleGuideTester';

export const StyleGuideManager: React.FC = () => {
  const { styleGuide, updateStyleGuide, resetStyleGuide, addLog } = useAppStore();
  const [showTextInput, setShowTextInput] = useState(false);
  const [newsletterText, setNewsletterText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedStyleGuide, setAnalyzedStyleGuide] = useState<StyleGuide | null>(null);
  
  // Local editing state
  const [localStyleGuide, setLocalStyleGuide] = useState(styleGuide);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Ollama status
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  


  // Sync with store when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalStyleGuide(styleGuide);
      setHasChanges(false);
    }
  }, [styleGuide, isEditing]);

  // Track changes
  useEffect(() => {
    if (isEditing) {
      const hasChangesNow = JSON.stringify(localStyleGuide) !== JSON.stringify(styleGuide);
      setHasChanges(hasChangesNow);
    }
  }, [localStyleGuide, styleGuide, isEditing]);

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setOllamaStatus('checking');
    try {
      const { ollama } = await import('../lib/ollama');
      
      // Check if Ollama is available with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const isAvailable = await ollama.isAvailable();
        clearTimeout(timeoutId);
        
        if (isAvailable) {
          // Get available models with timeout
          const modelResponse = await fetch('http://127.0.0.1:11434/api/tags', {
            signal: controller.signal
          });
          
          if (modelResponse.ok) {
            const data = await modelResponse.json();
            const modelNames = data.models?.map((model: { name: string }) => model.name) || [];
            setOllamaModels(modelNames);
            setOllamaStatus('available');
          } else {
            setOllamaModels([]);
            setOllamaStatus('available'); // Still available, just couldn't get models
          }
        } else {
          setOllamaStatus('unavailable');
          setOllamaModels([]);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setOllamaStatus('unavailable');
          setOllamaModels([]);
          console.warn('Ollama status check timed out after 5 seconds');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      setOllamaStatus('unavailable');
      setOllamaModels([]);
      console.error('Failed to check Ollama status:', error);
    }
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
    setIsEditing(false);
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
    const newKeywords = localStyleGuide.keywords.filter((_, i) => i !== index);
    updateKeywords(newKeywords);
    
    // Immediately save the change to the store
    updateStyleGuide({
      ...styleGuide,
      keywords: newKeywords
    });
    
    addLog({
      level: 'info',
      category: 'style-guide',
      message: 'Keyword removed',
      details: { 
        removed: localStyleGuide.keywords[index],
        remaining_count: newKeywords.length 
      }
    });
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
    const newPhrases = currentPhrases.filter((_, i) => i !== index);
    updateExamplePhrases(category, newPhrases);
    
    // Immediately save the change to the store
    updateStyleGuide({
      ...styleGuide,
      example_phrases: {
        ...styleGuide.example_phrases,
        [category]: newPhrases
      }
    });
    
    addLog({
      level: 'info',
      category: 'style-guide',
      message: 'Example phrase removed',
      details: { 
        category,
        removed: currentPhrases[index],
        remaining_count: newPhrases.length 
      }
    });
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

  const analyzeNewsletterText = async () => {
    if (!newsletterText.trim()) {
      addLog({
        level: 'error',
        category: 'style-guide',
        message: 'No text provided for analysis',
        details: {}
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const { ollama } = await import('../lib/ollama');
      
      // Accumulate all source content for comprehensive analysis
      const allSourceContent = [
        ...(styleGuide.source_content || []),
        newsletterText
      ];
      
      // Limit total content length to prevent prompt truncation (keep under 3000 chars for safety)
      const maxContentLength = 3000;
      let combinedContent = allSourceContent.map((content, index) => 
        `--- SAMPLE ${index + 1} ---\n${content}`
      ).join('\n\n');
      
      if (combinedContent.length > maxContentLength) {
        // If too long, prioritize recent content and trim older content
        const recentContent = allSourceContent.slice(-2); // Keep last 2 samples
        combinedContent = recentContent.map((content, index) => 
          `--- SAMPLE ${index + 1} (Recent) ---\n${content.substring(0, 1200)}`
        ).join('\n\n');
        
        addLog({
          level: 'warn',
          category: 'style-guide',
          message: 'Source content too long, using recent samples only',
          details: { totalSamples: allSourceContent.length, usedSamples: recentContent.length }
        });
      }
      
      const analysisPrompt = PromptService.buildPrompt('style-guide-analysis', {
        currentStyleGuide: JSON.stringify(styleGuide, null, 2),
        contentSample: newsletterText,
        allSourceContent: combinedContent
      });

      const response = await ollama.chat([
        {
          role: 'user',
          content: analysisPrompt
        }
      ]);
      
      // Clean and parse the JSON response
      const cleanResponse = response.trim();
      let parsedStyleGuide;
      
      // Function to sanitize JSON string by removing/escaping control characters
      const sanitizeJsonString = (str: string): string => {
        // Remove common markdown formatting that might be around JSON
        let cleaned = str.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        
        // Extract JSON object if it's embedded in other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleaned = jsonMatch[0];
        }
        
        // Fix array elements that are missing commas between quoted strings
        // This handles cases like ["item1" "item2"] -> ["item1", "item2"]
        cleaned = cleaned.replace(/([""])\s+([""])/g, '$1, $2');
        
        // First fix JSON structure issues
        cleaned = cleaned
          // Fix trailing commas in JSON (common AI mistake)
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas before } or ]
          // Fix the specific pattern: quote, newline, comma, newline  
          .replace(/"\s*\n\s*,\s*\n/g, '",\n')
          // Fix standalone commas on their own lines
          .replace(/,\s*\n\s*([}\]])/g, '\n$1');
        
        // Then handle control characters within string values
        // This approach protects JSON structure while fixing string content
        const fixStringContent = (jsonStr: string): string => {
          return jsonStr.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (_match, content) => {
            // Only fix control characters inside the quotes
            const fixed = content
              .replace(/\r\n/g, '\\n')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\n')
              .replace(/\t/g, '\\t')
              // eslint-disable-next-line no-control-regex
              .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
            return `"${fixed}"`;
          });
        };
        
        cleaned = fixStringContent(cleaned);
        
        return cleaned;
      };
      
      try {
        parsedStyleGuide = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.warn('Initial JSON parse failed, attempting to sanitize:', parseError);
        try {
          const sanitizedJson = sanitizeJsonString(cleanResponse);
          parsedStyleGuide = JSON.parse(sanitizedJson);
        } catch (sanitizeError) {
          console.error('JSON sanitization also failed:', sanitizeError);
          console.error('Original response:', cleanResponse);
          const sanitizedAttempt = sanitizeJsonString(cleanResponse);
          console.error('Sanitized response:', sanitizedAttempt);
          
          // Try one more aggressive cleanup as a last resort
          try {
            const lastResortClean = sanitizedAttempt
              // Fix missing commas in arrays first
              .replace(/([""])\s+([""])/g, '$1, $2')
              // Remove any remaining control characters more aggressively
              // eslint-disable-next-line no-control-regex
              .replace(/[\u0000-\u001F]/g, '')
              // Fix common JSON issues more aggressively
              .replace(/,(\s*[}\]])/g, '$1')
              // Remove any trailing commas at the end of lines
              .replace(/,\s*$/gm, '')
              // Fix malformed object starts/ends
              .replace(/^\s*[^{]*\{/, '{')
              .replace(/\}[^}]*$/, '}');
              
            console.log('Last resort cleanup attempt:', lastResortClean);
            parsedStyleGuide = JSON.parse(lastResortClean);
            console.log('Last resort cleanup succeeded!');
          } catch (lastResortError) {
            // If all parsing attempts fail, provide a helpful fallback
            console.error('All JSON parsing attempts failed:', lastResortError);
            throw new Error(`Could not parse AI response as JSON. The AI response may contain invalid formatting. Original error: ${sanitizeError instanceof Error ? sanitizeError.message : 'Unknown parsing error'}`);
          }
        }
      }

      setAnalyzedStyleGuide(parsedStyleGuide);
      addLog({
        level: 'info',
        category: 'style-guide',
        message: 'Newsletter text analyzed successfully',
        details: { textLength: newsletterText.length }
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      
      let errorMessage = 'Failed to analyze newsletter text';
      let userMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to Ollama service';
          userMessage = 'Make sure Ollama is running locally (ollama serve) and try again.';
        } else if (error.message.includes('JSON') || error.message.includes('parse')) {
          errorMessage = 'Invalid response format from AI';
          userMessage = 'The AI response contained formatting errors and could not be parsed. This can happen with complex content containing special characters. Try simplifying your newsletter text, removing special formatting, or try again.';
        } else {
          userMessage = error.message;
        }
      }
      
      // Show user-friendly error
      alert(`❌ ${errorMessage}\n\n${userMessage}`);
      
      addLog({
        level: 'error',
        category: 'style-guide',
        message: errorMessage,
        details: { error: userMessage, originalError: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mergeStyleGuides = (current: StyleGuide, analyzed: StyleGuide, allSourceContent: string[]) => {
    // Intelligently merge keywords (deduplicate, max 15)
    const existingKeywords = current.keywords || [];
    const newKeywords = analyzed.keywords || [];
    const allKeywords = [...existingKeywords, ...newKeywords];
    const uniqueKeywords = Array.from(new Set(allKeywords.map(k => k.toLowerCase())))
      .map(k => allKeywords.find(orig => orig.toLowerCase() === k))
      .filter((k): k is string => k !== undefined)
      .slice(0, 15);

    // Blend tone settings (70% existing, 30% new for gentle refinement)
    const blendedToneSettings = {
      formality: Math.round((current.tone_settings?.formality || 50) * 0.7 + (analyzed.tone_settings?.formality || 50) * 0.3),
      enthusiasm: Math.round((current.tone_settings?.enthusiasm || 50) * 0.7 + (analyzed.tone_settings?.enthusiasm || 50) * 0.3),
      technicality: Math.round((current.tone_settings?.technicality || 50) * 0.7 + (analyzed.tone_settings?.technicality || 50) * 0.3),
    };

          // Synthesize instructions into one cohesive set (not append)
      const currentInstructions = current.instructions_md || '';
      const newInstructions = analyzed.instructions_md || '';
      
      let enhancedInstructions;
      if (!currentInstructions) {
        // First time - use new instructions as-is
        enhancedInstructions = newInstructions;
      } else {
        // Rewrite the entire instruction set by combining insights
        // This should create a cohesive, unified guide rather than appending
        enhancedInstructions = newInstructions; // Use the newly analyzed instructions which should incorporate all learnings
      }

    // Merge example phrases intelligently
    const mergePhrasesArray = (existing: string[], newOnes: string[]) => {
      const combined = [...(existing || []), ...(newOnes || [])];
      return Array.from(new Set(combined.map(p => p.toLowerCase())))
        .map(p => combined.find(orig => orig.toLowerCase() === p))
        .filter((p): p is string => p !== undefined)
        .slice(0, 8); // Limit each category
    };

    const mergedExamplePhrases = {
      preferred_openings: mergePhrasesArray(
        current.example_phrases?.preferred_openings,
        analyzed.example_phrases?.preferred_openings
      ),
      preferred_transitions: mergePhrasesArray(
        current.example_phrases?.preferred_transitions,
        analyzed.example_phrases?.preferred_transitions
      ),
      preferred_conclusions: mergePhrasesArray(
        current.example_phrases?.preferred_conclusions,
        analyzed.example_phrases?.preferred_conclusions
      ),
      avoid_phrases: mergePhrasesArray(
        current.example_phrases?.avoid_phrases,
        analyzed.example_phrases?.avoid_phrases
      ),
    };

    return {
      instructions_md: enhancedInstructions,
      tone_settings: blendedToneSettings,
      keywords: uniqueKeywords,
      example_phrases: mergedExamplePhrases,
      source_content: allSourceContent, // Include all accumulated source content
    };
  };

  const applyAnalyzedStyleGuide = () => {
    if (!analyzedStyleGuide) return;
    
    // Accumulate all source content for the refined style guide
    const allSourceContent = [
      ...(styleGuide.source_content || []),
      newsletterText
    ];
    
    // Merge the analyzed style guide with the current one
    const refinedStyleGuide = mergeStyleGuides(styleGuide, analyzedStyleGuide, allSourceContent);
    updateStyleGuide(refinedStyleGuide);
    
    setAnalyzedStyleGuide(null);
    // Keep the text analyzer open and preserve the text for reference
    // setNewsletterText(''); // Don't clear the text
    // setShowTextInput(false); // Don't collapse the analyzer
    
    addLog({
      level: 'info',
      category: 'style-guide',
      message: 'Style guide refined with newsletter analysis',
      details: { 
        keywordsAdded: (refinedStyleGuide.keywords?.length || 0) - (styleGuide.keywords?.length || 0),
        toneAdjustments: {
          formality: refinedStyleGuide.tone_settings.formality - styleGuide.tone_settings.formality,
          enthusiasm: refinedStyleGuide.tone_settings.enthusiasm - styleGuide.tone_settings.enthusiasm,
          technicality: refinedStyleGuide.tone_settings.technicality - styleGuide.tone_settings.technicality,
        }
      }
    });
  };

  const handleClearStyleGuide = () => {
    if (confirm('⚠️ Clear Style Guide?\n\nThis will reset all tone settings, keywords, example phrases, and custom instructions to defaults. This action cannot be undone.\n\nClick OK to proceed.')) {
      resetStyleGuide();
      
      addLog({
        level: 'info',
        category: 'style-guide',
        message: 'Style guide reset to defaults',
        details: {}
      });
    }
  };

  const importStyleGuide = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          // Validate the imported data structure
          if (importedData && 
              typeof importedData === 'object' &&
              importedData.tone_settings &&
              typeof importedData.tone_settings === 'object' &&
              Array.isArray(importedData.keywords) &&
              importedData.example_phrases &&
              typeof importedData.example_phrases === 'object') {
            
            // Merge with current style guide to preserve any missing fields
            const mergedStyleGuide = {
              instructions_md: importedData.instructions_md || styleGuide.instructions_md,
              tone_settings: {
                formality: importedData.tone_settings.formality ?? styleGuide.tone_settings.formality,
                enthusiasm: importedData.tone_settings.enthusiasm ?? styleGuide.tone_settings.enthusiasm,
                technicality: importedData.tone_settings.technicality ?? styleGuide.tone_settings.technicality,
              },
              keywords: importedData.keywords || styleGuide.keywords,
              example_phrases: {
                preferred_openings: importedData.example_phrases.preferred_openings || styleGuide.example_phrases.preferred_openings,
                preferred_transitions: importedData.example_phrases.preferred_transitions || styleGuide.example_phrases.preferred_transitions,
                preferred_conclusions: importedData.example_phrases.preferred_conclusions || styleGuide.example_phrases.preferred_conclusions,
                avoid_phrases: importedData.example_phrases.avoid_phrases || styleGuide.example_phrases.avoid_phrases,
              }
            };

            updateStyleGuide(mergedStyleGuide);
            
            addLog({
              level: 'info',
              category: 'style-guide',
              message: 'Style guide imported successfully',
              details: { 
                filename: file.name,
                keywords_count: mergedStyleGuide.keywords.length,
                example_phrases_count: Object.values(mergedStyleGuide.example_phrases).flat().length,
                tone_settings: mergedStyleGuide.tone_settings
              }
            });
          } else {
            throw new Error('Invalid style guide format');
          }
        } catch (error) {
          addLog({
            level: 'error',
            category: 'style-guide',
            message: 'Failed to import style guide',
            details: { 
              filename: file.name,
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const currentStyleGuide = isEditing ? localStyleGuide : styleGuide;
  const totalExamplePhrases = Object.values(currentStyleGuide.example_phrases).flat().length;
  const hasCustomInstructions = currentStyleGuide.instructions_md.trim().length > 0;
  
  const getOllamaStatusInfo = () => {
    switch (ollamaStatus) {
      case 'checking':
        return { color: 'text-yellow-400', icon: '⏳', message: 'Checking Ollama status...' };
      case 'available':
        return { 
          color: 'text-green-400', 
          icon: '✅', 
          message: `Ollama available (${ollamaModels.length} models)` 
        };
      case 'unavailable':
        return { 
          color: 'text-red-400', 
          icon: '❌', 
          message: 'Ollama not running - Start with "ollama serve"' 
        };
    }
  };

  return (
    <>
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-hierarchy-h1" style={{ fontSize: '1.75rem', fontWeight: '700', fontFamily: 'Inter, sans-serif', color: '#111827', lineHeight: '1.2', letterSpacing: '-0.02em' }}>Voice & Style Guide</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              title={`Analyze newsletter text to refine style guide${ollamaStatus !== 'available' ? ' (Requires Ollama)' : ''}`}
              style={{ 
                background: '#E5E7EB',
                border: '1px solid #D1D5DB',
                borderRadius: '16px',
                padding: '12px 16px',
                color: '#111827',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span className="flex items-center gap-2" style={{ color: '#111827' }}>
                {showTextInput ? (
                  <>
                    <FileText size={16} style={{ color: '#111827' }} />
                    Hide Analyzer
                  </>
                ) : (
                  <>
                    <Search size={16} style={{ color: '#111827' }} />
                    Analyze Text
                  </>
                )}
                {ollamaStatus === 'checking' && <RefreshCw size={12} className="text-yellow-400 animate-spin" />}
                {ollamaStatus === 'unavailable' && <span className="w-2 h-2 bg-red-400 rounded-full" />}
                {ollamaStatus === 'available' && !showTextInput && <span className="w-2 h-2 bg-green-400 rounded-full" />}
              </span>
            </button>
            <button
              onClick={importStyleGuide}
              title="Import style guide from JSON"
              style={{ 
                background: '#E5E7EB',
                border: '1px solid #D1D5DB',
                borderRadius: '16px',
                padding: '12px 16px',
                color: '#111827',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={exportStyleGuide}
              title="Export style guide as JSON"
              style={{ 
                background: '#E5E7EB',
                border: '1px solid #D1D5DB',
                borderRadius: '16px',
                padding: '12px 16px',
                color: '#111827',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={handleClearStyleGuide}
              title="Reset style guide to defaults"
              style={{ 
                background: '#E5E7EB',
                border: '1px solid #D1D5DB',
                borderRadius: '16px',
                padding: '12px 16px',
                color: '#111827',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Trash2 size={16} style={{ color: '#111827' }} />
              Clear Style Guide
            </button>
            <button
              onClick={() => {
                if (isEditing && hasChanges) {
                  if (confirm('You have unsaved changes. Do you want to save them?')) {
                    handleSave();
                  } else {
                    handleReset();
                    setIsEditing(false);
                  }
                } else {
                  setIsEditing(!isEditing);
                }
              }}
              className={`glass-button-primary ${isEditing ? 'bg-blue-500' : ''}`}
            >
              {isEditing ? (
                <>
                  <Save size={16} />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit3 size={16} />
                  Edit Style Guide
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Editing Controls */}
          {isEditing && (
            <div className="glass-card p-4 border border-blue-400 border-opacity-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-blue-400 font-medium">✏️ Editing Mode</span>
                  {hasChanges && (
                    <span className="text-yellow-400 text-sm font-medium">Unsaved changes</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    disabled={!hasChanges}
                    className="glass-button disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: '#111827', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                  >
                    <RotateCcw size={16} />
                    Reset Changes
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="glass-button-primary bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                    Save Style Guide
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Text Analyzer Section */}
          {showTextInput && (
            <div className="glass-card p-6 border border-green-400 border-opacity-20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-hierarchy-h3 text-green-400 flex items-center gap-2">
                  <FileText size={20} />
                  Newsletter Style Analyzer
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={checkOllamaStatus}
                    className="text-sm transition-colors p-1"
                    title="Refresh Ollama status"
                    style={{ color: '#6B7280' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <div className={`flex items-center gap-2 text-sm ${getOllamaStatusInfo().color}`}>
                    <span>{getOllamaStatusInfo().icon}</span>
                    <span>{getOllamaStatusInfo().message}</span>
                  </div>
                </div>
              </div>
              
              {!analyzedStyleGuide ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Paste Newsletter or Content Sample
                    </label>
                    <p className="text-gray-400 text-sm mb-3">
                      Paste one or more newsletter samples, articles, or any content that represents the writing style you want to emulate. The AI will analyze the tone, vocabulary, and structure to create a custom style guide.
                    </p>
                    <textarea
                      value={newsletterText}
                      onChange={(e) => setNewsletterText(e.target.value)}
                      placeholder="Paste your newsletter content here... Include multiple paragraphs for better analysis."
                      className="w-full h-40 bg-black/20 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <button
                        onClick={analyzeNewsletterText}
                        disabled={!newsletterText.trim() || isAnalyzing || ollamaStatus !== 'available'}
                        className="glass-button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title={ollamaStatus !== 'available' ? 'Ollama is required for text analysis' : ''}
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Search size={16} />
                            Analyze Style
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setNewsletterText('')}
                        disabled={!newsletterText.trim() || isAnalyzing}
                        className="glass-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Clear text input"
                        style={{ color: '#111827', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                      >
                        <RotateCcw size={16} />
                        Clear
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowTextInput(false);
                          setNewsletterText('');
                        }}
                        className="glass-button-secondary"
                        style={{ color: '#374151' }}
                      >
                        Cancel
                      </button>
                    </div>
                    
                    {ollamaStatus === 'unavailable' && (
                      <div className="bg-red-500 bg-opacity-10 border border-red-400 border-opacity-30 rounded-lg p-4">
                        <h4 className="text-red-400 font-medium mb-2">⚠️ Ollama Required</h4>
                        <p className="text-white text-opacity-80 text-sm mb-3">
                          The text analyzer requires Ollama to be running locally with a compatible language model.
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="text-white text-opacity-70">
                            <span className="font-medium">1.</span> Start Ollama: <code className="bg-black bg-opacity-30 px-2 py-1 rounded text-xs">ollama serve</code>
                          </div>
                          <div className="text-white text-opacity-70">
                            <span className="font-medium">2.</span> Install a model: <code className="bg-black bg-opacity-30 px-2 py-1 rounded text-xs">ollama pull llama3.1:8b</code>
                          </div>
                          <div className="text-white text-opacity-70">
                            <span className="font-medium">3.</span> Click the refresh button above to check status
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="glass-panel p-4 bg-green-500/10 border-green-400/20">
                    <h4 className="text-lg font-semibold text-green-400 mb-2">✅ Analysis Complete!</h4>
                    <p className="text-gray-300 text-sm">
                      The AI has analyzed your content and extracted the writing style. Review the generated style guide below and apply it if it looks good.
                    </p>
                  </div>

                  {/* Condensed Style Guide Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-white font-medium mb-2">Tone Settings</h5>
                      <div className="space-y-2">
                        {Object.entries(analyzedStyleGuide.tone_settings || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm capitalize">{key}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-700 rounded-full h-1">
                                <div
                                  className="bg-green-400 h-1 rounded-full"
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                              <span className="text-green-400 text-sm font-medium">{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-white font-medium mb-2">Keywords ({analyzedStyleGuide.keywords?.length || 0})</h5>
                      <div className="flex flex-wrap gap-1">
                        {(analyzedStyleGuide.keywords || []).slice(0, 8).map((keyword: string, index: number) => (
                          <span key={index} className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                            {keyword}
                          </span>
                        ))}
                        {(analyzedStyleGuide.keywords?.length || 0) > 8 && (
                          <span className="text-gray-400 text-xs">+{(analyzedStyleGuide.keywords?.length || 0) - 8} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={applyAnalyzedStyleGuide}
                      className="glass-button-primary bg-green-500 hover:bg-green-400"
                    >
                      ✨ Refine Style Guide
                    </button>
                    <button
                      onClick={() => setAnalyzedStyleGuide(null)}
                      className="glass-button-secondary"
                      style={{ color: '#374151' }}
                    >
                      ← Back to Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{currentStyleGuide.keywords.length}</div>
              <div className="text-gray-700 font-medium">Keywords</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{totalExamplePhrases}</div>
              <div className="text-gray-700 font-medium">Example Phrases</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {hasCustomInstructions ? '✓' : '○'}
              </div>
              <div className="text-gray-700 font-medium">Custom Instructions</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {Math.round((currentStyleGuide.tone_settings.formality + currentStyleGuide.tone_settings.enthusiasm + currentStyleGuide.tone_settings.technicality) / 3)}
              </div>
              <div className="text-gray-700 font-medium">Avg Tone Level</div>
            </div>
          </div>

          {/* Tone Settings */}
          <div>
            <h3 className="text-hierarchy-h3 mb-6" style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Inter, sans-serif', color: '#111827', lineHeight: '1.3', letterSpacing: '-0.01em' }}>Tone Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.keys(currentStyleGuide.tone_settings) as Array<keyof ToneSettings>).map((key) => {
                const value = currentStyleGuide.tone_settings[key];
                return (
                  <div key={key} className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-900 font-semibold capitalize text-lg">{key}</span>
                      <span className="text-blue-400 font-medium px-3 py-1 rounded-full bg-blue-400 bg-opacity-20">
                        {getToneLabel(value)} ({value})
                      </span>
                  </div>
                    
                    {isEditing ? (
                      <>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={value}
                          onChange={(e) => updateToneSetting(key, parseInt(e.target.value))}
                          className="w-full h-3 bg-white bg-opacity-10 rounded-full appearance-none cursor-pointer mb-3"
                          style={{
                            background: `linear-gradient(to right, #60a5fa 0%, #a855f7 ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)`
                          }}
                        />
                        <p className="text-gray-600 text-sm mt-2">
                          {getToneDescription(key, value)}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-full bg-white bg-opacity-10 rounded-full h-3 mb-3">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${value}%` }}
                    />
                        </div>
                        <div className="text-right text-gray-600 font-medium">{value}/100</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Keywords */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-hierarchy-h3" style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Inter, sans-serif', color: '#111827', lineHeight: '1.3', letterSpacing: '-0.01em' }}>Keywords & Phrases</h3>
              {isEditing && (
                <button
                  onClick={addKeyword}
                  className="glass-button-secondary text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Keyword
                </button>
              )}
            </div>
            
            {currentStyleGuide.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {currentStyleGuide.keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="group px-4 py-2 text-sm font-medium text-blue-100 bg-blue-500 bg-opacity-20 rounded-full border border-blue-400 border-opacity-30 transition-all duration-200 hover:bg-opacity-30 hover:border-opacity-50 flex items-center"
                  >
                    <span>{keyword}</span>
                    <button
                      onClick={() => removeKeyword(index)}
                      className="ml-2 text-blue-200 hover:text-red-300 transition-colors opacity-70 hover:opacity-100"
                      title={`Remove "${keyword}"`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 italic">No keywords added yet</p>
            )}
            
            {!isEditing && (
              <p className="text-gray-600 text-sm mt-3">
                Keywords and phrases that should be emphasized or included in summaries.
              </p>
            )}
          </div>

          {/* Custom Instructions */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-hierarchy-h3" style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Inter, sans-serif', color: '#111827', lineHeight: '1.3', letterSpacing: '-0.01em' }}>Custom Instructions</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="glass-button-secondary text-sm text-blue-400 hover:text-blue-300"
                >
                  <Edit3 size={14} />
                  Edit Instructions
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={localStyleGuide.instructions_md}
                  onChange={(e) => setLocalStyleGuide(prev => ({ ...prev, instructions_md: e.target.value }))}
                  placeholder="Enter specific instructions for how the AI should write summaries and respond to questions..."
                  className="glass-input w-full h-32 text-white resize-none"
                />
                <p className="text-gray-600 text-sm">
                  These instructions will be included in all AI prompts to guide the writing style.
                </p>
              </div>
            ) : hasCustomInstructions ? (
              <div className="bg-white bg-opacity-5 rounded-xl p-4 border border-white border-opacity-10">
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: currentStyleGuide.instructions_md
                        .replace(/### (.*)/g, '<h3 style="color: #1e40af; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: 600;">$1</h3>')
                        .replace(/## (.*)/g, '<h2 style="color: #1e3a8a; margin-top: 2rem; margin-bottom: 1rem; font-weight: 700;">$1</h2>')
                        .replace(/\n\n/g, '</p><p style="margin-bottom: 1rem; color: #1f2937;">')
                        .replace(/^(.+)/, '<p style="margin-bottom: 1rem; color: #1f2937;">$1')
                        + '</p>'
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-600 italic">No custom instructions added yet</p>
            )}
          </div>

          {/* Example Phrases */}
          <div className="glass-card p-6">
            <h3 className="text-hierarchy-h3 mb-6" style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Inter, sans-serif', color: '#111827', lineHeight: '1.3', letterSpacing: '-0.01em' }}>Example Phrases</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(currentStyleGuide.example_phrases).map(([category, phrases]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-gray-900 font-medium capitalize">
                      {category.replace('_', ' ')}
                    </h4>
                    {isEditing && (
                  <button
                        onClick={() => addExamplePhrase(category)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                        + Add
                  </button>
                )}
              </div>
                  
                  {phrases.length > 0 ? (
                    <div className="space-y-2">
                      {phrases.map((phrase: string, index: number) => (
                        <div
                          key={index}
                          className="group bg-purple-500 bg-opacity-10 rounded-lg p-3 border border-purple-400 border-opacity-20 hover:bg-opacity-15 hover:border-opacity-30 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-purple-100 text-sm">{phrase}</span>
              <button
                              onClick={() => removeExamplePhrase(category, index)}
                              className="text-purple-200 hover:text-red-300 transition-colors opacity-70 hover:opacity-100"
                              title={`Remove "${phrase}"`}
              >
                              ×
              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm italic">No phrases added yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Style Guide Tester */}
          <StyleGuideTester />

        </div>
      </div>
    </>
  );
};
