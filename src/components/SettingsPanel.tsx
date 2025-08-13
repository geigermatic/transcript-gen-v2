/**
 * Simplified settings panel for single-view interface
 */

import React from 'react';
import { useAppStore } from '../store';
import { StyleGuideManager } from './StyleGuideManager';
import { QATestRunner } from './QATestRunner';

export const SettingsPanel: React.FC = () => {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    settings, 
    updateSettings,
    isUserTestingMode,
    toggleUserTestingMode 
  } = useAppStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <h1 className="text-hierarchy-h1 mb-2">Settings</h1>
        <p className="text-body">
          Customize your AI experience and application preferences
        </p>
      </div>

      {/* Quick Settings */}
      <div className="glass-panel p-6">
        <h2 className="text-hierarchy-h3 mb-4">Quick Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Dark Mode</label>
              <p className="text-gray-400 text-sm">Toggle between light and dark themes</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-teal-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* User Testing Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">User Testing Mode</label>
              <p className="text-gray-400 text-sm">Enhanced tooltips and guidance</p>
            </div>
            <button
              onClick={toggleUserTestingMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                isUserTestingMode ? 'bg-teal-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isUserTestingMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Ollama Configuration */}
      <div className="glass-panel p-6">
        <h2 className="text-hierarchy-h3 mb-4">AI Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Chat Model</label>
            <input
              type="text"
              value={settings.chat_default || 'llama3.1:8b-instruct-q4_K_M'}
              onChange={(e) => updateSettings({ chat_default: e.target.value })}
              className="glass-input w-full"
              placeholder="llama3.1:8b-instruct-q4_K_M"
            />
            <p className="text-gray-400 text-sm mt-1">
              Ollama model for chat and summarization
            </p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Embedding Model</label>
            <input
              type="text"
              value="nomic-embed-text"
              disabled
              className="glass-input w-full opacity-50"
            />
            <p className="text-gray-400 text-sm mt-1">
              Model for generating embeddings (read-only)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="developer-mode"
              checked={settings.developer_mode}
              onChange={(e) => updateSettings({ developer_mode: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="developer-mode" className="text-gray-300">
              Enable Developer Mode
            </label>
          </div>
        </div>
      </div>

      {/* Style Guide */}
      <StyleGuideManager />

      {/* Developer Tools */}
      {settings.developer_mode && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-hierarchy-h3 mb-4">Developer Tools</h2>
            <p className="text-body mb-4">
              Advanced tools for testing and debugging the application.
            </p>
          </div>
          <QATestRunner />
        </div>
      )}

      {/* About */}
      <div className="glass-panel p-6">
        <h2 className="text-hierarchy-h3 mb-4">About</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="text-white font-medium mb-2">Application</h3>
            <div className="space-y-1 text-gray-400">
              <p>Local-Only Transcript Summarizer</p>
              <p>Version: 1.0.0 MVP</p>
              <p>Privacy First • Local AI</p>
            </div>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">Technology</h3>
            <div className="space-y-1 text-gray-400">
              <p>React + TypeScript + Vite</p>
              <p>Local Ollama AI Processing</p>
              <p>IndexedDB Storage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
