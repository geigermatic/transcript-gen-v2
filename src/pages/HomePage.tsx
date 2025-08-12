export function HomePage() {
  return (
    <div className="glass-panel p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Welcome to Transcript Summarizer</h1>
      <p className="text-gray-200 text-lg mb-8">
        A local, privacy-focused tool for summarizing teaching transcripts and engaging in 
        conversational Q&A using your own Ollama instance.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold text-white mb-3">📁 Document Library</h3>
          <p className="text-gray-300">
            Upload and manage your .docx, .txt, .md, .srt, and .vtt files.
          </p>
        </div>
        
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold text-white mb-3">🤖 AI Chat</h3>
          <p className="text-gray-300">
            Ask questions about your documents with grounded responses.
          </p>
        </div>
        
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold text-white mb-3">📝 Summarization</h3>
          <p className="text-gray-300">
            Generate structured summaries with techniques and key takeaways.
          </p>
        </div>
      </div>
    </div>
  );
}
