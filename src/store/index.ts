import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Document, 
  StyleGuide, 
  AppSettings, 
  ChatMessage, 
  LogEntry,
  UserPreference,
  EmbeddedChunk,
  EmbeddingProgress,
  ABSummaryPair,
  SummarizationResult,
  SummaryHistory,
  ModelOption,
  SummaryVersion
} from '../types';

interface AppState {
  // Documents
  documents: Document[];
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  
  // Embeddings
  embeddings: Map<string, EmbeddedChunk[]>; // documentId -> embedded chunks
  addEmbeddings: (documentId: string, chunks: EmbeddedChunk[]) => void;
  removeEmbeddings: (documentId: string) => void;
  getAllEmbeddings: () => Map<string, EmbeddedChunk[]>;
  
  // Embedding progress tracking
  embeddingProgress: Map<string, EmbeddingProgress>; // documentId -> progress
  setEmbeddingProgress: (documentId: string, progress: EmbeddingProgress) => void;
  clearEmbeddingProgress: (documentId: string) => void;
  
  // Style Guide
  styleGuide: StyleGuide;
  updateStyleGuide: (updates: Partial<StyleGuide>) => void;
  resetStyleGuide: () => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  
  // Model Selection
  availableModels: ModelOption[];
  getAvailableModels: () => ModelOption[];
  getCurrentModel: () => ModelOption;
  
  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  
  // User Preferences (A/B testing)
  preferences: UserPreference[];
  addPreference: (preference: UserPreference) => void;
  
  // A/B Testing
  abSummaryPairs: ABSummaryPair[];
  addABSummaryPair: (pair: ABSummaryPair) => void;
  updateABSummaryPair: (pair: ABSummaryPair) => void;
  updateABSummaryFeedback: (pairId: string, feedback: UserPreference) => void;
  getABSummaryPair: (pairId: string) => ABSummaryPair | undefined;
  getDocumentSummary: (documentId: string) => SummarizationResult | undefined;
  
  // Summary History Management
  summaryHistory: Map<string, SummaryHistory>; // documentId -> version history
  addSummaryVersion: (documentId: string, summary: string, isOriginal?: boolean, modelUsed?: string) => void;
  getSummaryHistory: (documentId: string) => SummaryHistory | undefined;
  getAllVersions: (documentId: string) => SummaryVersion[]; // Get all versions for a document
  setCurrentVersion: (documentId: string, versionIndex: number) => void; // Set current version index
  clearVersionHistory: (documentId: string) => void; // Clear to original only
  restoreSummaryVersion: (documentId: string, versionId: string) => SummarizationResult | undefined;
  clearSummaryHistory: (documentId: string) => void;
  cleanupSummaryHistory: () => void; // Memory management
  deleteSummaryVersion: (documentId: string, versionId: string) => void;
  
  // Developer Console
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  
  // UI State
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // User Testing Mode
  isUserTestingMode: boolean;
  toggleUserTestingMode: () => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: (completed: boolean) => void;
  
  // Store Hydration State
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  
  // Data Management
  clearAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Documents
      documents: [],
      addDocument: (document) =>
        set((state) => ({
          documents: [...state.documents, document],
        })),
      removeDocument: (id) =>
        set((state) => {
          const newState = {
            documents: state.documents.filter((doc) => doc.id !== id),
          };
          // Also remove embeddings for this document
          state.embeddings.delete(id);
          state.embeddingProgress.delete(id);
          return newState;
        }),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, ...updates } : doc
          ),
        })),

      // Embeddings
      embeddings: new Map<string, EmbeddedChunk[]>(),
      addEmbeddings: (documentId, chunks) =>
        set((state) => {
          const newEmbeddings = new Map(state.embeddings);
          newEmbeddings.set(documentId, chunks);
          return { embeddings: newEmbeddings };
        }),
      removeEmbeddings: (documentId) =>
        set((state) => {
          const newEmbeddings = new Map(state.embeddings);
          newEmbeddings.delete(documentId);
          return { embeddings: newEmbeddings };
        }),
      getAllEmbeddings: () => {
        const state = get();
        return state.embeddings;
      },

      // Embedding progress tracking
      embeddingProgress: new Map<string, EmbeddingProgress>(),
      setEmbeddingProgress: (documentId, progress) =>
        set((state) => {
          const newProgress = new Map(state.embeddingProgress);
          newProgress.set(documentId, progress);
          return { embeddingProgress: newProgress };
        }),
      clearEmbeddingProgress: (documentId) =>
        set((state) => {
          const newProgress = new Map(state.embeddingProgress);
          newProgress.delete(documentId);
          return { embeddingProgress: newProgress };
        }),

      // Style Guide
      styleGuide: {
        instructions_md: `# Caren's Voice & Teaching Style Guide

## VOICE OVERVIEW
Write in a warm, conversational, and approachable voice that feels like sitting down for coffee with a trusted teacher or friend. Caren's communication blends wisdom with humor, making even complex spiritual or psychological concepts feel accessible and relatable. She doesn't talk *at* people, she talks *with* them—always leaving space for curiosity, compassion, and discovery.

Her teaching style is grounded yet expansive. She draws from Buddhist philosophy, neuroscience, and personal storytelling, weaving these threads together in a way that feels both intimate and universally relevant. She avoids cleverness or jargon and instead favors honesty, simplicity, and a bit of playful humor to keep things light even when the topic is deep.

Above all, Caren's voice is marked by compassion. She reassures her students that setbacks, overwhelm, and human struggles are natural. She consistently reminds them they are not broken, and that wisdom and goodness already live within them. Her words create a safe space where students feel both guided and empowered.

## TONE CHARACTERISTICS
- **Formality:** Casual to semi-formal. She speaks like a wise, down-to-earth mentor, not an academic or corporate lecturer.
- **Energy Level:** Calm and steady with flashes of enthusiasm when something feels especially important or liberating.
- **Warmth vs. Directness:** Warm, kind, and compassionate first. Direct when clarity or encouragement is needed.
- **Authority vs. Collaboration:** Balanced. She has authority as a teacher but emphasizes shared humanity, speaking as someone who walks the path alongside her students.

## TEACHING APPROACH
Introduce new concepts by grounding them in everyday struggles or relatable experiences before moving into philosophy or practice. When handling complex or difficult topics, soften them with warmth, humor, and reassurance—reminding students they're not alone.

Practical application is central. Don't just explain ideas, give students simple ways to notice, reflect, and experiment in their daily lives. Motivate by emphasizing progress over perfection, encouraging students to celebrate small steps and "little victories."

## CONTENT STYLE PREFERENCES
- Use **first person** ("I want to share…") and **second person** ("You'll notice that…") to maintain intimacy.
- Stories, examples, and analogies are essential. They should be personal, practical, or drawn from timeless wisdom like the Bhagavad Gita.
- Favor guided discovery over rigid instruction—ask reflective questions, encourage noticing.
- Relate to students as a **mentor-guide**: wise but approachable, compassionate but real, both teacher and fellow traveler.

## SYNOPSIS WRITING STYLE
When writing a 4-sentence lesson summary:
- **Start with a hook**: a relatable struggle or observation ("We all know what it's like to…")
- **Highlight the transformation**: emphasize relief, confidence, or clarity students will gain.
- **Use inspirational yet grounded language**: "There's nothing wrong with you. You already have what you need."
- **Balance heart and practice**: end with a practical application students can try right away.

## STRUCTURAL PREFERENCES
- Lessons should flow from **story → teaching → application → encouragement.**
- Use bullet points for clarity when listing practices, benefits, or steps.
- Use **bold** or *italics* for emphasis, not all caps.
- Section names should be simple, real, and clear (e.g., "Noticing What's Really Happening," "The Courage to Be Yourself"). Avoid overly clever or abstract titles.`,
        tone_settings: {
          formality: 25,
          enthusiasm: 70,
          technicality: 30,
        },
        keywords: [
          "practice",
          "notice",
          "pay attention",
          "isn't that interesting",
          "inner battle",
          "spaciousness",
          "gentle curiosity",
          "blindspots",
          "overwhelm",
          "wisdom already within you",
          "patterns of thought",
          "compassionate awareness",
          "epic moment",
          "real, not perfect",
          "show up as you are",
          "kindness to yourself",
          "learning to be responsive, not reactive",
          "life as practice",
          "trust the process",
          "little victories",
          "gentle humor",
          "warm smile"
        ],
        example_phrases: {
          preferred_openings: [
            "Here's the thing…",
            "What I want you to notice is…",
            "Let's get real for a moment.",
            "You know how…",
            "This is the part that matters.",
            "I want to share something with you…",
            "Let's take a step back and…",
            "You know what's funny about this…"
          ],
          preferred_transitions: [
            "Now, here's where it gets interesting…",
            "That brings us to…",
            "And at the same time…",
            "Let's look at it another way…",
            "Which means that…",
            "Here's how this shows up in real life…",
            "The good news is…",
            "And here's the thing that always makes me smile…"
          ],
          preferred_conclusions: [
            "So the key takeaway here is…",
            "What this means for you is…",
            "If you remember one thing, let it be this…",
            "That's how we start to shift.",
            "This is how practice helps us in everyday life.",
            "So next time you notice this, you'll know what to do."
          ],
          avoid_phrases: [
            "Academic jargon (e.g., 'epistemological framework')",
            "Corporate speak (e.g., 'synergy,' 'leverage your potential')",
            "Overly casual slang (e.g., 'YOLO,' 'lol')",
            "Clever wordplay that distracts from sincerity"
          ],
        },
        source_content: [
          "Caren's Voice & Teaching Style Guide - Client-provided style guide for warm, conversational, compassionate teaching voice"
        ],
      },
      updateStyleGuide: (updates) =>
        set((state) => ({
          styleGuide: { ...state.styleGuide, ...updates },
        })),
      resetStyleGuide: () =>
        set(() => ({
          styleGuide: {
            instructions_md: `# Caren's Voice & Teaching Style Guide

## VOICE OVERVIEW
Write in a warm, conversational, and approachable voice that feels like sitting down for coffee with a trusted teacher or friend. Caren's communication blends wisdom with humor, making even complex spiritual or psychological concepts feel accessible and relatable. She doesn't talk *at* people, she talks *with* them—always leaving space for curiosity, compassion, and discovery.

Her teaching style is grounded yet expansive. She draws from Buddhist philosophy, neuroscience, and personal storytelling, weaving these threads together in a way that feels both intimate and universally relevant. She avoids cleverness or jargon and instead favors honesty, simplicity, and a bit of playful humor to keep things light even when the topic is deep.

Above all, Caren's voice is marked by compassion. She reassures her students that setbacks, overwhelm, and human struggles are natural. She consistently reminds them they are not broken, and that wisdom and goodness already live within them. Her words create a safe space where students feel both guided and empowered.

## TONE CHARACTERISTICS
- **Formality:** Casual to semi-formal. She speaks like a wise, down-to-earth mentor, not an academic or corporate lecturer.
- **Energy Level:** Calm and steady with flashes of enthusiasm when something feels especially important or liberating.
- **Warmth vs. Directness:** Warm, kind, and compassionate first. Direct when clarity or encouragement is needed.
- **Authority vs. Collaboration:** Balanced. She has authority as a teacher but emphasizes shared humanity, speaking as someone who walks the path alongside her students.

## TEACHING APPROACH
Introduce new concepts by grounding them in everyday struggles or relatable experiences before moving into philosophy or practice. When handling complex or difficult topics, soften them with warmth, humor, and reassurance—reminding students they're not alone.

Practical application is central. Don't just explain ideas, give students simple ways to notice, reflect, and experiment in their daily lives. Motivate by emphasizing progress over perfection, encouraging students to celebrate small steps and "little victories."

## CONTENT STYLE PREFERENCES
- Use **first person** ("I want to share…") and **second person** ("You'll notice that…") to maintain intimacy.
- Stories, examples, and analogies are essential. They should be personal, practical, or drawn from timeless wisdom like the Bhagavad Gita.
- Favor guided discovery over rigid instruction—ask reflective questions, encourage noticing.
- Relate to students as a **mentor-guide**: wise but approachable, compassionate but real, both teacher and fellow traveler.

## SYNOPSIS WRITING STYLE
When writing a 4-sentence lesson summary:
- **Start with a hook**: a relatable struggle or observation ("We all know what it's like to…")
- **Highlight the transformation**: emphasize relief, confidence, or clarity students will gain.
- **Use inspirational yet grounded language**: "There's nothing wrong with you. You already have what you need."
- **Balance heart and practice**: end with a practical application students can try right away.

## STRUCTURAL PREFERENCES
- Lessons should flow from **story → teaching → application → encouragement.**
- Use bullet points for clarity when listing practices, benefits, or steps.
- Use **bold** or *italics* for emphasis, not all caps.
- Section names should be simple, real, and clear (e.g., "Noticing What's Really Happening," "The Courage to Be Yourself"). Avoid overly clever or abstract titles.`,
            tone_settings: {
              formality: 25,
              enthusiasm: 70,
              technicality: 30,
            },
            keywords: [
              "practice",
              "notice",
              "pay attention",
              "isn't that interesting",
              "inner battle",
              "spaciousness",
              "gentle curiosity",
              "blindspots",
              "overwhelm",
              "wisdom already within you",
              "patterns of thought",
              "compassionate awareness",
              "epic moment",
              "real, not perfect",
              "show up as you are",
              "kindness to yourself",
              "learning to be responsive, not reactive",
              "life as practice",
              "trust the process",
              "little victories"
            ],
            example_phrases: {
              preferred_openings: [
                "Here's the thing…",
                "What I want you to notice is…",
                "Let's get real for a moment.",
                "You know how…",
                "This is the part that matters.",
                "I want to share something with you…",
                "Let's take a step back and…"
              ],
              preferred_transitions: [
                "Now, here's where it gets interesting…",
                "That brings us to…",
                "And at the same time…",
                "Let's look at it another way…",
                "Which means that…",
                "Here's how this shows up in real life…",
                "The good news is…"
              ],
              preferred_conclusions: [
                "So the key takeaway here is…",
                "What this means for you is…",
                "If you remember one thing, let it be this…",
                "That's how we start to shift.",
                "This is how practice helps us in everyday life.",
                "So next time you notice this, you'll know what to do."
              ],
              avoid_phrases: [
                "Academic jargon (e.g., 'epistemological framework')",
                "Corporate speak (e.g., 'synergy,' 'leverage your potential')",
                "Overly casual slang (e.g., 'YOLO,' 'lol')",
                "Clever wordplay that distracts from sincerity"
              ],
            },
            source_content: [
              "Caren's Voice & Teaching Style Guide - Client-provided style guide for warm, conversational, compassionate teaching voice"
            ],
          },
        })),

      // Settings
      settings: {
        default_model: 'llama3.1:8b-instruct-q4_K_M',
        chat_default: 'llama3.1:8b-instruct-q4_K_M',
        theme: 'dark',
        developer_mode: true,
      },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates }
        })),
      
      // Model Selection
      availableModels: [
        {
          id: 'llama3.1:8b-instruct-q4_K_M',
          name: 'Llama 3.1 8B Instruct (Q4_K_M)',
          description: 'Your current model - good balance of speed and quality',
          size: '8B parameters',
          expectedSpeed: '2-3 minutes',
          ramUsage: '4-5GB',
          recommended: false
        },
        {
          id: 'gemma3:4b',
          name: 'Gemma 3 4B (Multimodal)',
          description: '🔥 RECOMMENDED: 128K context, no chunking needed, multimodal support',
          size: '4B parameters',
          expectedSpeed: '1-2 minutes',
          ramUsage: '3.3GB',
          recommended: true
        },
        {
          id: 'gemma3:12b',
          name: 'Gemma 3 12B (Multimodal)',
          description: 'Premium performance with 128K context, excellent for complex analysis',
          size: '12B parameters',
          expectedSpeed: '30-60 seconds',
          ramUsage: '8.1GB',
          recommended: true
        },
        {
          id: 'gemma3:1b',
          name: 'Gemma 3 1B (Text)',
          description: 'Ultra-fast for simple summarization tasks',
          size: '1B parameters',
          expectedSpeed: '30-45 seconds',
          ramUsage: '815MB',
          recommended: false
        },
        {
          id: 'mixtral:8x7b',
          name: 'Mixtral 8x7B',
          description: 'High performance mixture-of-experts model, excellent for complex tasks',
          size: '8x7B parameters',
          expectedSpeed: '30-60 seconds',
          ramUsage: '26GB',
          recommended: false
        }
      ],
      getAvailableModels: () => get().availableModels,
      getCurrentModel: () => {
        const currentModelId = get().settings.chat_default;
        return get().availableModels.find(model => model.id === currentModelId) || get().availableModels[0];
      },

      // Chat
      chatMessages: [],
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      clearChat: () => set({ chatMessages: [] }),

      // User Preferences
      preferences: [],
      addPreference: (preference) =>
        set((state) => ({
          preferences: [...state.preferences, preference],
        })),

      // A/B Testing
      abSummaryPairs: [],
      addABSummaryPair: (pair) =>
        set((state) => ({
          abSummaryPairs: [...state.abSummaryPairs, pair],
        })),
      updateABSummaryPair: (updatedPair) => {
        console.log('Store: Updating AB summary pair', {
          pairId: updatedPair.id,
          oldPairsCount: get().abSummaryPairs.length,
          updatedPair: updatedPair
        });
        
        set((state) => {
          const newPairs = state.abSummaryPairs.map((pair) =>
            pair.id === updatedPair.id ? updatedPair : pair
          );
          
          console.log('Store: AB summary pairs after update', {
            newPairsCount: newPairs.length,
            updatedPairFound: newPairs.find(p => p.id === updatedPair.id)
          });
          
          return { abSummaryPairs: newPairs };
        });
      },
      updateABSummaryFeedback: (pairId, feedback) =>
        set((state) => ({
          abSummaryPairs: state.abSummaryPairs.map((pair) =>
            pair.id === pairId ? { ...pair, userFeedback: feedback } : pair
          ),
        })),
      getABSummaryPair: (pairId) => {
        const state = get();
        return state.abSummaryPairs.find((pair) => pair.id === pairId);
      },
      
      // Get summary for a specific document (from AB pairs)
      getDocumentSummary: (documentId: string) => {
        const state = get();
        const pair = state.abSummaryPairs.find((pair) => pair.documentId === documentId);
        if (pair) {
          // Return the primary summary (summaryA) which contains both styled and raw summaries
          return pair.summaryA;
        }
        return undefined;
      },

      // Summary History Management
      summaryHistory: new Map<string, SummaryHistory>(),
      addSummaryVersion: (documentId, summary, isOriginal = false, modelUsed?: string) =>
        set((state) => {
          // Ensure summaryHistory is a Map (handle rehydration from persistence)
          const summaryHistory = state.summaryHistory instanceof Map 
            ? state.summaryHistory 
            : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
          
          const existingHistory = summaryHistory.get(documentId);
          
          // Check for duplicate content to prevent multiple identical versions
          if (existingHistory && existingHistory.versions && existingHistory.versions.length > 0) {
            const isDuplicate = existingHistory.versions.some(version => 
              version.summary === summary && version.isOriginal === isOriginal
            );
            
            if (isDuplicate) {
              console.log('🔄 Skipping duplicate version creation:', { documentId, isOriginal, contentLength: summary.length });
              return state; // Don't create duplicate, return current state
            }
          }
          
          const nextVersionNumber = (existingHistory?.versions.length || 0) + 1;
          
          const newVersion: SummaryVersion = {
            id: crypto.randomUUID(),
            versionNumber: nextVersionNumber,
            summary,
            timestamp: Date.now(),
            regenerationCount: existingHistory?.versions.length || 0,
            isOriginal,
            characterCount: summary.length,
            modelUsed,
          };
          
          const updatedHistory: SummaryHistory = {
            documentId,
            versions: [newVersion, ...(existingHistory?.versions || [])], // Prepend new version at top
            maxVersions: 10, // Increased limit for stacked view
            lastAccessed: Date.now(),
            totalSize: (existingHistory?.totalSize || 0) + summary.length,
            currentVersionIndex: 0, // New version is always at index 0
          };
          
          // Enforce max versions limit (remove oldest versions from bottom)
          if (updatedHistory.versions.length > updatedHistory.maxVersions) {
            const removedVersions = updatedHistory.versions.splice(updatedHistory.maxVersions);
            const removedSize = removedVersions.reduce((total, version) => total + version.characterCount, 0);
            updatedHistory.totalSize -= removedSize;
          }
          
          const newHistory = new Map<string, SummaryHistory>(summaryHistory);
          newHistory.set(documentId, updatedHistory);
          
          console.log('✅ Added new version:', { documentId, versionNumber: nextVersionNumber, isOriginal, contentLength: summary.length });
          
          return { summaryHistory: newHistory };
        }),
      getSummaryHistory: (documentId) => {
        const state = get();
        // Ensure summaryHistory is a Map (handle rehydration from persistence)
        const summaryHistory = state.summaryHistory instanceof Map 
          ? state.summaryHistory 
          : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
        return summaryHistory.get(documentId);
      },
      
      // New methods for stacked version view
      getAllVersions: (documentId) => {
        const state = get();
        const history = state.summaryHistory.get(documentId);
        return history?.versions || [];
      },
      
      setCurrentVersion: (documentId, versionIndex) => {
        set((state) => {
          const summaryHistory = state.summaryHistory instanceof Map 
            ? state.summaryHistory 
            : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
          
          const history = summaryHistory.get(documentId);
          if (!history || versionIndex < 0 || versionIndex >= history.versions.length) {
            return state;
          }
          
          const updatedHistory = { ...history, currentVersionIndex: versionIndex, lastAccessed: Date.now() };
          const newHistory = new Map<string, SummaryHistory>(summaryHistory);
          newHistory.set(documentId, updatedHistory);
          
          return { summaryHistory: newHistory };
        });
      },
      
      clearVersionHistory: (documentId) => {
        set((state) => {
          const summaryHistory = state.summaryHistory instanceof Map 
            ? state.summaryHistory 
            : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
          
          // Keep only the original version
          const history = summaryHistory.get(documentId);
          if (!history) return state;
          
          const originalVersion = history.versions.find(v => v.isOriginal);
          if (!originalVersion) return state;
          
          const clearedHistory: SummaryHistory = {
            documentId,
            versions: [originalVersion],
            maxVersions: 10,
            lastAccessed: Date.now(),
            totalSize: originalVersion.characterCount,
            currentVersionIndex: 0,
          };
          
          const newHistory = new Map<string, SummaryHistory>(summaryHistory);
          newHistory.set(documentId, clearedHistory);
          
          return { summaryHistory: newHistory };
        });
      },
      restoreSummaryVersion: (documentId, versionId) => {
        const state = get();
        // Ensure summaryHistory is a Map (handle rehydration from persistence)
        const summaryHistory = state.summaryHistory instanceof Map 
          ? state.summaryHistory 
          : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
        
        const history = summaryHistory.get(documentId);
        if (!history) return undefined;

        const version = history.versions.find(v => v.id === versionId);
        if (!version) return undefined;

        // Update last accessed time
        const updatedHistory = { ...history, lastAccessed: Date.now() };
        const newHistory = new Map<string, SummaryHistory>(summaryHistory);
        newHistory.set(documentId, updatedHistory);
        set({ summaryHistory: newHistory });

        // Return the restored summary as a partial SummarizationResult
        return {
          document: state.documents.find(d => d.id === documentId)!,
          chunkFacts: [],
          mergedFacts: {} as any,
          markdownSummary: version.summary,
          styledSummary: version.summary,
          regenerationCount: version.regenerationCount,
          currentVersionId: version.id,
          versions: [version], // Include the restored version
          currentVersionIndex: 0, // Set as current version
          processingStats: {
            totalChunks: 0,
            successfulChunks: 0,
            failedChunks: 0,
            processingTime: 0
          }
        };
      },
      clearSummaryHistory: (documentId) =>
        set((state) => {
          // Ensure summaryHistory is a Map (handle rehydration from persistence)
          const summaryHistory = state.summaryHistory instanceof Map 
            ? state.summaryHistory 
            : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
          
          const newHistory = new Map<string, SummaryHistory>(summaryHistory);
          newHistory.delete(documentId);
          return { summaryHistory: newHistory };
        }),
      cleanupSummaryHistory: () => {
        const state = get();
        // Ensure summaryHistory is a Map (handle rehydration from persistence)
        const summaryHistory = state.summaryHistory instanceof Map 
          ? state.summaryHistory 
          : new Map(Object.entries(state.summaryHistory || {}).map(([key, value]) => [key, value as SummaryHistory]));
        
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const maxSize = 50 * 1024 * 1024; // 50MB total
        
        let totalSize = 0;
        const newHistory = new Map<string, SummaryHistory>();
        
        // Keep only recent and small histories
        for (const [docId, history] of summaryHistory.entries()) {
          const age = now - history.lastAccessed;
          const wouldExceedSize = totalSize + history.totalSize > maxSize;
          
          if (age < maxAge && !wouldExceedSize) {
            newHistory.set(docId, history);
            totalSize += history.totalSize;
          }
        }
        
        set({ summaryHistory: newHistory });
      },
      deleteSummaryVersion: (documentId: string, versionId: string) => {
        set((state) => {
          // Handle both Map and plain object cases
          let summaryHistory: Map<string, SummaryHistory>;
          if (state.summaryHistory instanceof Map) {
            summaryHistory = state.summaryHistory;
          } else {
            // Convert from plain object back to Map
            summaryHistory = new Map<string, SummaryHistory>();
            if (state.summaryHistory) {
              Object.entries(state.summaryHistory).forEach(([key, value]) => {
                summaryHistory.set(key, value as SummaryHistory);
              });
            }
          }
          
          const existingHistory = summaryHistory.get(documentId);
          if (!existingHistory || !existingHistory.versions) {
            return state;
          }

          // Filter out the version to delete
          const updatedVersions = existingHistory.versions.filter((v: any) => v.id !== versionId);
          
          // If we're deleting the last version, clear the history
          if (updatedVersions.length === 0) {
            summaryHistory.delete(documentId);
            return {
              ...state,
              summaryHistory: summaryHistory
            };
          }

          // Update the history with the filtered versions
          const updatedHistory: SummaryHistory = {
            ...existingHistory,
            versions: updatedVersions,
            currentVersionIndex: Math.min(existingHistory.currentVersionIndex || 0, updatedVersions.length - 1)
          };

          summaryHistory.set(documentId, updatedHistory);

          return {
            ...state,
            summaryHistory: summaryHistory
          };
        });
      },

      // Developer Console
      logs: [],
      addLog: (log) => {
        const logEntry: LogEntry = {
          ...log,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          logs: [...state.logs, logEntry].slice(-1000), // Keep last 1000 logs
        }));
      },
      clearLogs: () => set({ logs: [] }),

      // UI State
      isDarkMode: true,
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      // User Testing Mode
      isUserTestingMode: false,
      toggleUserTestingMode: () =>
        set((state) => ({ isUserTestingMode: !state.isUserTestingMode })),

      // Onboarding
      hasCompletedOnboarding: false,
      setOnboardingComplete: (completed) =>
        set({ hasCompletedOnboarding: completed }),
      
      // Store Hydration State
      isHydrated: false,
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      
      // Data Management
      clearAllData: () => 
        set(() => ({
          // Clear all documents and related data
          documents: [],
          embeddings: new Map<string, EmbeddedChunk[]>(),
          embeddingProgress: new Map<string, EmbeddingProgress>(),
          abSummaryPairs: [],
          summaryHistory: new Map<string, SummaryHistory>(), // Clear summary history
          
          // Clear chat data
          chatMessages: [],
          
          // Clear logs
          logs: [],
          
          // Keep UI state and settings intact
          // isDarkMode, isUserTestingMode, hasCompletedOnboarding, styleGuide, settings stay the same
        })),
    }),
    {
      name: 'transcript-summarizer-storage',
      // Remove partialize - let custom storage handle Map serialization
      onRehydrateStorage: () => (state) => {
        // Mark store as hydrated when persistence is complete
        if (state) {
          console.log('🔍 onRehydrateStorage - State before hydration:', {
            documentsCount: state.documents?.length,
            embeddingsSize: state.embeddings?.size,
            embeddingsKeys: state.embeddings ? Array.from(state.embeddings.keys()) : []
          });
          
          state.setHydrated(true);
          
          console.log('🔍 onRehydrateStorage - State after hydration:', {
            documentsCount: state.documents?.length,
            embeddingsSize: state.embeddings?.size,
            embeddingsKeys: state.embeddings ? Array.from(state.embeddings.keys()) : []
          });
        }
      },
      // Modern storage configuration with custom serialization for Maps
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          try {
            const parsed = JSON.parse(str);
            console.log('🔍 Storage getItem - Raw embeddings:', parsed.state?.embeddings);
            console.log('🔍 Storage getItem - Raw summaryHistory:', parsed.state?.summaryHistory);
            
            if (parsed.state?.embeddings) {
              const entries = Object.entries(parsed.state.embeddings);
              console.log('🔍 Storage getItem - Entries to convert:', entries);
              parsed.state.embeddings = new Map(entries);
              console.log('🔍 Storage getItem - Converted Map:', parsed.state.embeddings);
            }
            
            if (parsed.state?.summaryHistory) {
              const entries = Object.entries(parsed.state.summaryHistory);
              console.log('🔍 Storage getItem - SummaryHistory entries to convert:', entries);
              parsed.state.summaryHistory = new Map(entries);
              console.log('🔍 Storage getItem - Converted SummaryHistory Map:', parsed.state.summaryHistory);
            }
            
            return parsed;
          } catch (error) {
            console.warn('Failed to parse stored state:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            console.log('🔍 Storage setItem - Original embeddings:', value.state.embeddings);
            console.log('🔍 Storage setItem - Is Map?', value.state.embeddings instanceof Map);
            console.log('🔍 Storage setItem - Original summaryHistory:', value.state.summaryHistory);
            console.log('🔍 Storage setItem - SummaryHistory Is Map?', value.state.summaryHistory instanceof Map);
            
            const serializedState = {
              ...value,
              state: {
                ...value.state,
                embeddings: value.state.embeddings instanceof Map 
                  ? Object.fromEntries(value.state.embeddings) 
                  : {},
                summaryHistory: value.state.summaryHistory instanceof Map 
                  ? Object.fromEntries(value.state.summaryHistory) 
                  : {},
              }
            };
            
            console.log('🔍 Storage setItem - Serialized embeddings:', serializedState.state.embeddings);
            console.log('🔍 Storage setItem - Serialized summaryHistory:', serializedState.state.summaryHistory);
            localStorage.setItem(name, JSON.stringify(serializedState));
          } catch (error) {
            console.warn('Failed to store state:', error);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
