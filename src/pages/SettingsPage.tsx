import { StyleGuideManager } from '../components/StyleGuideManager';
import { useAppStore } from '../store';

export function SettingsPage() {
  const { isDarkMode, toggleDarkMode, settings, updateSettings } = useAppStore();

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
