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
  SummarizationResult
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
  getAllEmbeddings: () => EmbeddedChunk[];
  
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
        const allChunks: EmbeddedChunk[] = [];
        state.embeddings.forEach((chunks) => {
          allChunks.push(...chunks);
        });
        return allChunks;
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
        instructions_md: `## Writing Style Analysis

This style guide captures the distinctive voice and approach for creating engaging, transformative content that resonates with readers seeking personal growth and practical wisdom.

### Core Writing Principles

**Transformative Focus**: Every piece of content should focus on transformation and practical outcomes. Ask yourself: What problems does this solve? What will the reader feel/experience? How will they be different after engaging with this content?

**Benefit-Oriented Language**: Emphasize benefits over features. Instead of describing what something is, explain what it does for the reader and how it improves their life.

**Authentic Connection**: Write as if speaking directly to a friend who trusts your guidance. Use inclusive language that creates a sense of partnership and shared journey.

**Practical Wisdom**: Balance inspiration with actionable insights. Every concept should have a practical application or reflection point.

### Voice Characteristics

**Warm and Encouraging**: Maintain a tone that uplifts and supports, even when discussing challenges or difficult topics.

**Confident and Grounded**: Express certainty about the value and effectiveness of the practices and insights shared.

**Accessible and Clear**: Make complex concepts understandable without oversimplifying. Use analogies and examples that resonate with everyday experience.

**Reflective and Contemplative**: Encourage readers to pause, reflect, and integrate insights rather than just consuming information.

### Content Structure Guidelines

**Opening Engagement**: Start with a hook that immediately connects to the reader's experience or challenges. Use questions, scenarios, or relatable situations.

**Progressive Revelation**: Build understanding step by step, allowing readers to see how each piece connects to the whole.

**Practical Integration**: End each major section with reflection questions or simple practices that help readers apply the insights.

**Closing Inspiration**: Conclude with a vision of possibility and a clear next step that readers can take immediately.`,
        tone_settings: {
          formality: 35,
          enthusiasm: 75,
          technicality: 40,
        },
        keywords: [
          "that said",
          "here's the thing",
          "the truth is",
          "what I've found",
          "here's what happens",
          "the beautiful part",
          "here's the magic",
          "what's fascinating",
          "the key insight",
          "here's the shift"
        ],
        example_phrases: {
          preferred_openings: [
            "In this lesson",
            "What I want you to know",
            "Here's what I've discovered",
            "The thing about this is",
            "Let me share something with you"
          ],
          preferred_transitions: [
            "That said",
            "Here's the thing",
            "The truth is",
            "What's fascinating",
            "Here's what happens"
          ],
          preferred_conclusions: [
            "The beautiful part is",
            "Here's the magic",
            "The key insight here",
            "What this means for you",
            "Here's your next step"
          ],
          avoid_phrases: [
            "In conclusion",
            "To summarize",
            "As mentioned above",
            "It is important to note",
            "Furthermore"
          ],
        },
        source_content: [
          "Default style guide created from proven client objectives and writing patterns"
        ],
      },
      updateStyleGuide: (updates) =>
        set((state) => ({
          styleGuide: { ...state.styleGuide, ...updates },
        })),
      resetStyleGuide: () =>
        set(() => ({
          styleGuide: {
            instructions_md: `## Writing Style Analysis

This style guide captures the distinctive voice and approach for creating engaging, transformative content that resonates with readers seeking personal growth and practical wisdom.

### Core Writing Principles

**Transformative Focus**: Every piece of content should focus on transformation and practical outcomes. Ask yourself: What problems does this solve? What will the reader feel/experience? How will they be different after engaging with this content?

**Benefit-Oriented Language**: Emphasize benefits over features. Instead of describing what something is, explain what it does for the reader and how it improves their life.

**Authentic Connection**: Write as if speaking directly to a friend who trusts your guidance. Use inclusive language that creates a sense of partnership and shared journey.

**Practical Wisdom**: Balance inspiration with actionable insights. Every concept should have a practical application or reflection point.

### Voice Characteristics

**Warm and Encouraging**: Maintain a tone that uplifts and supports, even when discussing challenges or difficult topics.

**Confident and Grounded**: Express certainty about the value and effectiveness of the practices and insights shared.

**Accessible and Clear**: Make complex concepts understandable without oversimplifying. Use analogies and examples that resonate with everyday experience.

**Reflective and Contemplative**: Encourage readers to pause, reflect, and integrate insights rather than just consuming information.

### Content Structure Guidelines

**Opening Engagement**: Start with a hook that immediately connects to the reader's experience or challenges. Use questions, scenarios, or relatable situations.

**Progressive Revelation**: Build understanding step by step, allowing readers to see how each piece connects to the whole.

**Practical Integration**: End each major section with reflection questions or simple practices that help readers apply the insights.

**Closing Inspiration**: Conclude with a vision of possibility and a clear next step that readers can take immediately.`,
            tone_settings: {
              formality: 35,
              enthusiasm: 75,
              technicality: 40,
            },
            keywords: [
              "that said",
              "here's the thing",
              "the truth is",
              "what I've found",
              "here's what happens",
              "the beautiful part",
              "here's the magic",
              "what's fascinating",
              "the key insight",
              "here's the shift"
            ],
            example_phrases: {
              preferred_openings: [
                "In this lesson",
                "What I want you to know",
                "What I've discovered",
                "The thing about this is",
                "Let me share something with you"
              ],
              preferred_transitions: [
                "That said",
                "Here's the thing",
                "The truth is",
                "What's fascinating",
                "Here's what happens"
              ],
              preferred_conclusions: [
                "The beautiful part is",
                "Here's the magic",
                "The key insight here",
                "What this means for you",
                "Here's your next step"
              ],
              avoid_phrases: [
                "In conclusion",
                "To summarize",
                "As mentioned above",
                "It is important to note",
                "Furthermore"
              ],
            },
            source_content: [
              "Default style guide created from proven client objectives and writing patterns"
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
          settings: { ...state.settings, ...updates },
        })),

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
          
          // Clear chat data
          chatMessages: [],
          
          // Clear logs
          logs: [],
          
          // Clear user preferences (but keep settings and style guide)
          preferences: [],
          
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
            
            if (parsed.state?.embeddings) {
              const entries = Object.entries(parsed.state.embeddings);
              console.log('🔍 Storage getItem - Entries to convert:', entries);
              parsed.state.embeddings = new Map(entries);
              console.log('🔍 Storage getItem - Converted Map:', parsed.state.embeddings);
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
            
            const serializedState = {
              ...value,
              state: {
                ...value.state,
                embeddings: value.state.embeddings instanceof Map 
                  ? Object.fromEntries(value.state.embeddings) 
                  : {},
              }
            };
            
            console.log('🔍 Storage setItem - Serialized embeddings:', serializedState.state.embeddings);
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
