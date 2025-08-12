import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Document, 
  StyleGuide, 
  AppSettings, 
  ChatMessage, 
  LogEntry,
  UserPreference 
} from '../types';

interface AppState {
  // Documents
  documents: Document[];
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  
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
    (set) => ({
      // Documents
      documents: [],
      addDocument: (document) =>
        set((state) => ({
          documents: [...state.documents, document],
        })),
      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
        })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, ...updates } : doc
          ),
        })),

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
      }),
    }
  )
);
