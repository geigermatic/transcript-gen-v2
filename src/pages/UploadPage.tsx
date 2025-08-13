/**
 * Upload Page with glassmorphic design
 */

import React from 'react';
import { Upload, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { useAppStore } from '../store';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents } = useAppStore();

  return (
    <div className="min-h-screen font-sans text-white" style={{background: 'linear-gradient(135deg, #1F2937 0%, #374151 25%, #1E3A8A 50%, #0F766E 75%, #0D9488 100%)'}}>
      {/* Top Bar */}
      <header className="glass-header sticky top-0 z-30 mx-6 mt-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="ghost-button p-2"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold text-white">Upload Transcript</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="glass-card p-8 text-center">
            <div className="mb-6">
              <Upload size={48} className="mx-auto text-white/60 mb-4" />
              <h2 className="text-hierarchy-h2 text-white mb-2">
                Upload Your Documents
              </h2>
              <p className="text-body max-w-2xl mx-auto">
                Upload your teaching transcripts and documents to start generating AI-powered summaries and insights.
                Supported formats: .docx, .txt, .md, .srt, .vtt
              </p>
            </div>

            <FileUpload onUploadComplete={(success, message, document) => {
              if (success && document) {
                navigate('/');
              }
            }} />
          </div>

          {/* Recent Documents */}
          {documents.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-hierarchy-h3 text-white mb-4">
                Recently Uploaded
              </h3>
              <div className="grid gap-4">
                {documents.slice(0, 5).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 glass-panel">
                    <div className="flex items-center gap-3">
                      <Upload size={20} className="text-white/60" />
                      <div>
                        <p className="text-white font-medium">{doc.metadata.filename}</p>
                        <p className="text-body text-sm">
                          {doc.metadata.wordCount?.toLocaleString()} words • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button className="ghost-button px-4 py-2 text-sm">
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
