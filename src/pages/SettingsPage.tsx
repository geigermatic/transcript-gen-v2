export function SettingsPage() {
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
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Chat Model</label>
            <input
              type="text"
              value="llama3.1:8b-instruct-q4_K_M"
              className="glass-input w-full"
              disabled
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Embedding Model</label>
            <input
              type="text"
              value="nomic-embed-text"
              className="glass-input w-full"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Style Guide</h2>
        <p className="text-gray-400 italic">Style guide editor will be implemented here.</p>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Theme</h2>
        <div className="flex items-center space-x-4">
          <button className="glass-button text-white">Light Mode</button>
          <button className="glass-button text-white bg-white bg-opacity-20">Dark Mode</button>
        </div>
      </div>
    </div>
  );
}
