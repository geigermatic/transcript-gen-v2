/**
 * GlassDashboard - Main dashboard with glassmorphic design
 * Matches the provided mockup exactly
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AppShell } from './AppShell';
import { UploadCard } from './UploadCard';
import { RecentDocsCard } from './RecentDocsCard';
import { SummaryPreviewCard } from './SummaryPreviewCard';
import { ChatCard } from './ChatCard';
import { StatusCard } from './StatusCard';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

export const GlassDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { documents, abSummaryPairs } = useAppStore();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);



  const handleUploadComplete = (success: boolean, message: string, document?: any) => {
    if (success && document) {
      setSelectedDocument(document);
      logInfo('UI', 'Document uploaded and selected', { documentId: document.id });
    }
  };

  const handleDocumentSelect = (doc: any) => {
    setSelectedDocument(doc);
    logInfo('UI', 'Document selected from recent list', { docId: doc.id });
  };

  // Get the most recent summary for the selected document
  const getSelectedDocumentSummary = () => {
    if (!selectedDocument) return null;
    
    const recentSummary = abSummaryPairs
      .filter(pair => pair.documentId === selectedDocument.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
    return recentSummary?.summaryA.markdownSummary || null;
  };

  return (
    <AppShell>
      <div className="py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-display mb-4">
              Generate summaries and abstracts from transcripts
            </h1>
            <p className="text-body text-white text-opacity-70 max-w-2xl mx-auto">
              Upload your teaching transcripts and documents to create AI-powered summaries, 
              insights, and engage in conversational Q&A using your local Ollama instance.
            </p>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Upload Card */}
          <div className="lg:col-span-1">
            <UploadCard onUploadComplete={handleUploadComplete} />
          </div>

          {/* Summary Preview Card */}
          <div className="lg:col-span-1">
            <SummaryPreviewCard 
              summary={getSelectedDocumentSummary()} 
              isLoading={false}
            />
          </div>

          {/* Recent Documents Card */}
          <div className="lg:col-span-2 xl:col-span-1">
            <RecentDocsCard onDocumentSelect={handleDocumentSelect} />
          </div>

          {/* Chat Card */}
          <div className="lg:col-span-2">
            <div className="h-96">
              <ChatCard 
                selectedDocument={selectedDocument}
                onSendMessage={(message) => {
                  logInfo('CHAT', 'Message sent from dashboard', { message });
                }}
              />
            </div>
          </div>

          {/* Status Card */}
          <div className="lg:col-span-1">
            <StatusCard />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="text-heading text-lg">Ready to get started?</h3>
                <p className="text-caption">
                  Upload your first document or explore existing summaries
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/glossary')}
                className="ghost-button focus-visible"
              >
                Manage Glossary
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="ghost-button focus-visible"
              >
                Settings
              </button>
              <button
                onClick={() => navigate('/workspace')}
                className="accent-button focus-visible"
              >
                View Summaries
              </button>
            </div>
          </div>
        </div>

        {/* Status Footer */}
        <div className="glass-header px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-caption">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Local mode</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span>Ollama: Connected</span>
              </div>
            </div>
            <div>
              <span>Model: llama3.1:8b‑instruct‑q4_K_M</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
