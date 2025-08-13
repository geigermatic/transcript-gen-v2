import { StyleGuideManager } from '../components/StyleGuideManager';
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
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
        <p className="text-gray-300">
          Configure your Ollama connection, style preferences, and application settings.
        </p>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Ollama Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Ollama URL</label>
            <input
              type="text"
              value="http://127.0.0.1:11434"
              className="glass-input w-full"
              disabled
            />
            <p className="text-gray-400 text-sm mt-1">
              Local Ollama instance endpoint (read-only)
            </p>
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Chat Model</label>
            <input
              type="text"
              value={settings.chat_default}
              onChange={(e) => updateSettings({ chat_default: e.target.value })}
              className="glass-input w-full"
              placeholder="llama3.1:8b-instruct-q4_K_M"
            />
            <p className="text-gray-400 text-sm mt-1">
              Model used for chat and summarization
            </p>
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Embedding Model</label>
            <input
              type="text"
              value="nomic-embed-text"
              className="glass-input w-full"
              disabled
            />
            <p className="text-gray-400 text-sm mt-1">
              Model used for generating embeddings (read-only)
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

      {/* User Testing Mode */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">User Testing Mode</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="user-testing-mode" className="text-white font-medium">
                Enable User Testing Mode
              </label>
              <p className="text-gray-400 text-sm mt-1">
                Adds verbose tooltips, guidance modals, and safe defaults for new users
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
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-medium mb-2">User Testing Mode Active</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Enhanced tooltips and guidance text</li>
                <li>• Interactive onboarding for first-time users</li>
                <li>• Safe default settings for beginners</li>
                <li>• Visible glossary and style guide editors</li>
                <li>• Hidden developer tools (except when explicitly enabled)</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Style Guide Manager */}
      <StyleGuideManager />

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Theme</h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleDarkMode}
            className={`glass-button text-white ${!isDarkMode ? 'bg-white bg-opacity-20' : ''}`}
            disabled={!isDarkMode}
          >
            Light Mode
          </button>
          <button 
            onClick={toggleDarkMode}
            className={`glass-button text-white ${isDarkMode ? 'bg-white bg-opacity-20' : ''}`}
            disabled={isDarkMode}
          >
            Dark Mode
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Current theme: {isDarkMode ? 'Dark' : 'Light'}
        </p>
      </div>
    </div>
  );
}
