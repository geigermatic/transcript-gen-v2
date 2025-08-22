import { StyleGuideManager } from '../components/StyleGuideManager';
import { AppShell } from '../components/AppShell';
import { useAppStore } from '../store';

export function SettingsPage() {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    settings, 
    updateSettings
  } = useAppStore();

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="glass-panel p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
          <p className="text-gray-300">
            Configure your voice, style preferences, and core application settings for the beta version.
          </p>
        </div>

        {/* Voice & Style Guide - Top Level Section */}
        <StyleGuideManager />

        {/* Configuration Sections in Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ollama Configuration - Simplified */}
          <div className="glass-panel p-6">
            <h2 className="text-hierarchy-h2 mb-4">AI Model Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Chat Model</label>
                <input
                  type="text"
                  value={settings.chat_default}
                  onChange={(e) => updateSettings({ chat_default: e.target.value })}
                  className="glass-input w-full text-sm"
                  placeholder="llama3.1:8b-instruct-q4_K_M"
                />
                <p className="text-gray-400 text-xs mt-1">
                  AI model for generating summaries and chat responses
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <h3 className="text-blue-400 font-medium mb-2 text-sm">Beta Version</h3>
                <p className="text-xs text-gray-300">
                  This is a beta version focused on core functionality. Advanced features are temporarily hidden.
                </p>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="glass-panel p-6">
            <h2 className="text-hierarchy-h2 mb-4">Theme</h2>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={toggleDarkMode}
                  className={`glass-button-secondary text-white text-sm ${!isDarkMode ? 'bg-white bg-opacity-20' : ''}`}
                  disabled={!isDarkMode}
                >
                  Light Mode
                </button>
                <button 
                  onClick={toggleDarkMode}
                  className={`glass-button-secondary text-white text-sm ${isDarkMode ? 'bg-white bg-opacity-20' : ''}`}
                  disabled={isDarkMode}
                >
                  Dark Mode
                </button>
              </div>
              <p className="text-gray-400 text-xs">
                Current: {isDarkMode ? 'Dark' : 'Light'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
