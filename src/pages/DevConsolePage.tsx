export function DevConsolePage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Developer Console</h1>
        <p className="text-gray-300">
          View detailed logs, status tracking, and debugging information for development builds.
        </p>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Ollama Connection</h3>
            <p className="text-gray-400">Not connected</p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Documents Indexed</h3>
            <p className="text-gray-400">0</p>
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-white font-medium">Embeddings Generated</h3>
            <p className="text-gray-400">0</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Application Logs</h2>
        <div className="bg-black bg-opacity-50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          <div className="text-gray-500">
            [INFO] Application started
          </div>
          <div className="text-gray-500">
            [INFO] Checking Ollama connection...
          </div>
          <div className="text-yellow-400">
            [WARN] Ollama not detected at http://127.0.0.1:11434
          </div>
        </div>
      </div>
    </div>
  );
}
