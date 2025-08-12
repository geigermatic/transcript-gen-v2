export function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-bold text-white mb-4">AI Chat</h1>
        <p className="text-gray-300">
          Ask questions about your documents and get grounded responses from your local Ollama instance.
        </p>
      </div>

      <div className="glass-panel p-6 h-96">
        <div className="h-full flex flex-col">
          <div className="flex-1 mb-4 p-4 bg-black bg-opacity-20 rounded-lg">
            <p className="text-gray-400 italic">Chat messages will appear here...</p>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask a question about your documents..."
              className="glass-input flex-1"
              disabled
            />
            <button className="glass-button text-white" disabled>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
