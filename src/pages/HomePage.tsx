import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

export function HomePage() {
  const { documents } = useAppStore();

  const handleFeatureClick = (feature: string) => {
    logInfo('UI', `Homepage feature clicked: ${feature}`);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="glass-panel-header p-8 text-center">
        <h1 className="text-hierarchy-h1 mb-4">Welcome to Transcript Summarizer</h1>
        <p className="text-body-large max-w-3xl mx-auto">
          A local, privacy-focused tool for summarizing teaching transcripts and engaging in 
          conversational Q&A using your own Ollama instance. All processing happens locally—your data never leaves your machine.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">{documents.length}</div>
          <div className="text-body">Documents Uploaded</div>
        </div>
        <div className="glass-panel p-6 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">100%</div>
          <div className="text-body">Privacy Protected</div>
        </div>
        <div className="glass-panel p-6 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">Local</div>
          <div className="text-body">AI Processing</div>
        </div>
      </div>
      
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          to="/library" 
          className="glass-card"
          onClick={() => handleFeatureClick('Document Library')}
        >
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-hierarchy-h4 mb-3">Document Library</h3>
          <p className="text-body">
            Upload and manage your .docx, .txt, .md, .srt, and .vtt files. 
            Advanced search and filtering capabilities.
          </p>
        </Link>
        
        <Link 
          to="/chat" 
          className="glass-card"
          onClick={() => handleFeatureClick('AI Chat')}
        >
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-hierarchy-h4 mb-3">AI Chat</h3>
          <p className="text-body">
            Ask questions about your documents with grounded responses. 
            Multi-turn conversations with source attribution.
          </p>
        </Link>
        
        <div className="glass-card" onClick={() => handleFeatureClick('Summarization')}>
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-hierarchy-h4 mb-3">Smart Summarization</h3>
          <p className="text-body">
            Generate structured summaries with techniques, key takeaways, 
            and action items using advanced AI.
          </p>
        </div>

        <Link 
          to="/settings" 
          className="glass-card"
          onClick={() => handleFeatureClick('Style Guide')}
        >
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-hierarchy-h4 mb-3">Style Customization</h3>
          <p className="text-body">
            Customize AI voice and tone with advanced style guides, 
            keywords, and example phrases.
          </p>
        </Link>

        <div className="glass-card" onClick={() => handleFeatureClick('A/B Testing')}>
          <div className="text-4xl mb-4">🧪</div>
          <h3 className="text-hierarchy-h4 mb-3">A/B Testing</h3>
          <p className="text-body">
            Compare different summary styles and provide feedback 
            to improve AI performance over time.
          </p>
        </div>

        <div className="glass-card" onClick={() => handleFeatureClick('Export')}>
          <div className="text-4xl mb-4">📤</div>
          <h3 className="text-hierarchy-h4 mb-3">Export Options</h3>
          <p className="text-body">
            Export summaries in multiple formats: Markdown, HTML, 
            and structured JSON for integration.
          </p>
        </div>
      </div>

      {/* Getting Started */}
      {documents.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <h2 className="text-hierarchy-h2 mb-4">Get Started</h2>
          <p className="text-body mb-6">
            Upload your first document to begin exploring the powerful AI features.
          </p>
          <Link 
            to="/library" 
            className="glass-button-primary inline-block"
            onClick={() => handleFeatureClick('Get Started')}
          >
            Upload Your First Document
          </Link>
        </div>
      )}
    </div>
  );
}
