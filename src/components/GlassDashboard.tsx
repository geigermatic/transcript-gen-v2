/**
 * GlassDashboard - Main dashboard with glassmorphic design
 * Matches the provided mockup exactly
 */

import React, { useState, useEffect } from 'react';
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
  const { documents, abSummaryPairs, logs } = useAppStore();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chunksProcessed, setChunksProcessed] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);



  const handleUploadComplete = (success: boolean, message: string, document?: any) => {
    if (success && document) {
      setSelectedDocument(document);
      setIsSummarizing(true);
      setChunksProcessed(0);
      setProcessingStartTime(new Date());
      
      // Estimate total chunks based on word count (updated chunk size ~500 words)
      const wordCount = document.metadata.wordCount || 1000;
      const estimatedChunks = Math.ceil(wordCount / 500);
      setTotalChunks(estimatedChunks);
      
      logInfo('UI', 'Document uploaded and selected', { 
        documentId: document.id, 
        estimatedChunks,
        wordCount 
      });
    }
  };

  const handleDocumentSelect = (doc: any) => {
    setSelectedDocument(doc);
    logInfo('UI', 'Document selected from recent list', { docId: doc.id });
  };

  // Monitor when summarization completes
  useEffect(() => {
    if (selectedDocument && isSummarizing) {
      const hasSummary = abSummaryPairs.some(pair => pair.documentId === selectedDocument.id);
      if (hasSummary) {
        setIsSummarizing(false);
        setChunksProcessed(0);
        setTotalChunks(0);
        setProcessingStartTime(null);
        logInfo('UI', 'Summarization completed and summary is available');
      }
    }
  }, [selectedDocument, abSummaryPairs, isSummarizing]);

  // Monitor logs for chunk progress updates
  useEffect(() => {
    if (isSummarizing && selectedDocument && logs.length > 0) {

      
      // Look for either progress format from the actual logs we're seeing
      const progressLogs = logs.filter(log => {
        const categoryMatch = log.category.toUpperCase() === 'SUMMARIZATION';
        const messageMatch = log.message.includes('Extracted facts from chunk') || log.message.includes('Progress:');
        const timeMatch = log.timestamp > (processingStartTime?.toISOString() || '');
        
        return categoryMatch && messageMatch && timeMatch;
      });
      
      if (progressLogs.length > 0) {
        const latestProgress = progressLogs[progressLogs.length - 1];
        
        // Try both patterns: "Progress: X/Y chunks processed" and "Extracted facts from chunk X/Y"
        let match = latestProgress.message.match(/Progress: (\d+)\/(\d+) chunks processed/);
        if (!match) {
          match = latestProgress.message.match(/Extracted facts from chunk (\d+)\/(\d+)/);
        }
        
        if (match) {
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          setChunksProcessed(current);
          setTotalChunks(total);
          

        }
      }
    }
  }, [logs, isSummarizing, selectedDocument, processingStartTime]);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Center & Left Columns - Summary spans both (now centered) */}
          <div className="lg:col-span-2">
            <SummaryPreviewCard 
              summary={getSelectedDocumentSummary()} 
              isLoading={isSummarizing}
              chunksProcessed={chunksProcessed}
              totalChunks={totalChunks}
              processingStartTime={processingStartTime}
            />
          </div>

          {/* Right Column - Upload & Recent Documents */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <UploadCard onUploadComplete={handleUploadComplete} />
            
            {/* Recent Documents Card - below Upload */}
            <RecentDocsCard 
              key={`recent-docs-${documents.length}`} 
              onDocumentSelect={handleDocumentSelect} 
            />
          </div>

          {/* Chat Card - spans full width on second row */}
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

          {/* Status Card - right column on second row */}
          <div className="lg:col-span-1">
            <StatusCard />
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
