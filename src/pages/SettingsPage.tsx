import { StyleGuideManager } from '../components/StyleGuideManager';
import { AppShell } from '../components/AppShell';
import { useAppStore } from '../store';

export function SettingsPage() {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    settings, 
    updateSettings,
    isUserTestingMode,
    toggleUserTestingMode 
  } = useAppStore();

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="glass-panel p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
          <p className="text-gray-300">
            Configure your voice, style preferences, and application settings.
          </p>
        </div>

        {/* Voice & Style Guide - Top Level Section */}
        <StyleGuideManager />

        {/* Configuration Sections in Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ollama Configuration */}
          <div className="glass-panel p-6">
            <h2 className="text-hierarchy-h2 mb-4">Ollama Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Ollama URL</label>
                <input
                  type="text"
                  value="http://127.0.0.1:11434"
                  className="glass-input w-full text-sm"
                  disabled
                />
                <p className="text-gray-400 text-xs mt-1">
                  Local endpoint (read-only)
                </p>
              </div>
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
                  Model for chat & summaries
                </p>
              </div>
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Embedding Model</label>
                <input
                  type="text"
                  value="nomic-embed-text"
                  className="glass-input w-full text-sm"
                  disabled
                />
                <p className="text-gray-400 text-xs mt-1">
                  For embeddings (read-only)
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
                <label htmlFor="developer-mode" className="text-gray-300 text-sm">
                  Developer Mode
                </label>
              </div>
            </div>
          </div>

          {/* User Testing Mode */}
          <div className="glass-panel p-6">
            <h2 className="text-hierarchy-h2 mb-4">User Testing Mode</h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <label htmlFor="user-testing-mode" className="text-white font-medium text-sm">
                    Enable User Testing
                  </label>
                  <p className="text-gray-400 text-xs mt-1">
                    Adds tooltips and guidance for new users
                  </p>
                </div>
                <button
                  onClick={toggleUserTestingMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    isUserTestingMode ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      isUserTestingMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {isUserTestingMode && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <h3 className="text-blue-400 font-medium mb-2 text-sm">Active Features</h3>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Enhanced tooltips</li>
                    <li>• Interactive onboarding</li>
                    <li>• Safe defaults</li>
                    <li>• Visible guidance</li>
                  </ul>
                </div>
              )}
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
