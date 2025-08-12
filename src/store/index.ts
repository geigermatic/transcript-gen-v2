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
  EmbeddingProgress
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
  
  // Developer Console
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  
  // UI State
  isDarkMode: boolean;
  toggleDarkMode: () => void;
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
        instructions_md: '',
        tone_settings: {
          formality: 50,
          enthusiasm: 50,
          technicality: 50,
        },
        keywords: [],
      },
      updateStyleGuide: (updates) =>
        set((state) => ({
          styleGuide: { ...state.styleGuide, ...updates },
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
    }),
    {
      name: 'transcript-summarizer-storage',
      partialize: (state) => ({
        documents: state.documents,
        styleGuide: state.styleGuide,
        settings: state.settings,
        preferences: state.preferences,
        isDarkMode: state.isDarkMode,
        // Convert Maps to objects for storage
        embeddings: Object.fromEntries(state.embeddings),
      }),
      // Custom serialization for Maps
      serialize: (state) => {
        const serializedState = {
          ...state,
          state: {
            ...state.state,
            embeddings: Object.fromEntries(state.state.embeddings || new Map()),
          }
        };
        return JSON.stringify(serializedState);
      },
      // Custom deserialization for Maps
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        if (parsed.state?.embeddings) {
          parsed.state.embeddings = new Map(Object.entries(parsed.state.embeddings));
        }
        return parsed;
      },
    }
  )
);
