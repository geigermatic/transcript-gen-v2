/**
 * GlassDashboard - Main dashboard with glassmorphic design
 * Matches the provided mockup exactly
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Settings, Trash2 } from 'lucide-react';
import { AppShell } from './AppShell';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import { UploadCard } from './UploadCard';
import { RecentDocsCard } from './RecentDocsCard';
import { SummaryPreviewCard } from './SummaryPreviewCard';
import { ChatCard } from './ChatCard';

import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';
import { SummarizationEngine } from '../lib/summarizationEngine';

// Calculate similarity between two texts (0 = completely different, 1 = identical)
const calculateSimilarity = (text1: string, text2: string): number => {
  if (text1 === text2) return 1;
  if (text1.length === 0 || text2.length === 0) return 0;
  
  // Simple word-based similarity
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
};

export const GlassDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { documents, abSummaryPairs, logs, styleGuide, updateABSummaryPair } = useAppStore();
  

  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chunksProcessed, setChunksProcessed] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [regenerationCount, setRegenerationCount] = useState(1);
  const [regenerationSuccess, setRegenerationSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Separate state for uploads
  const [regenerationInProgress, setRegenerationInProgress] = useState(false); // Persistent regeneration state

  // Ensure page starts at top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Check for persistent regeneration state on mount
  useEffect(() => {
    const savedRegenerationState = localStorage.getItem('regenerationInProgress');
    if (savedRegenerationState === 'true') {
      console.log('🔄 Restoring regeneration state from localStorage');
      setRegenerationInProgress(true);
      setIsSummarizing(true);
    }
  }, []);



  // Protect the loading state from being reset by other operations
  const protectedSetIsSummarizing = useCallback((value: boolean) => {
    // If we're trying to set loading to false and regeneration is in progress, don't allow it
    if (value === false && regenerationInProgress) {
      return;
    }
    
    setIsSummarizing(value);
  }, [regenerationInProgress]);

  const handleUploadComplete = (success: boolean, message: string, document?: any) => {
    if (success && document) {
      setSelectedDocument(document);
      setIsSummarizing(true);
      setChunksProcessed(0);
      setProcessingStartTime(new Date());
      setRegenerationCount(1); // Reset regeneration count for new document
      
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
      
    const summary = recentSummary?.summaryA.markdownSummary || null;
    
    // Debug logging
    if (recentSummary) {
      logInfo('UI', 'Retrieved summary for document', {
        documentId: selectedDocument.id,
        pairId: recentSummary.id,
        hasSummary: !!summary,
        summaryLength: summary?.length || 0,
        hasStyledSummary: !!recentSummary.summaryA.styledSummary,
        hasMarkdownSummary: !!recentSummary.summaryA.markdownSummary
      });
    }
    
    return summary;
  };

  // Get both raw and styled summaries for the selected document
  const getSelectedDocumentSummaries = () => {
    if (!selectedDocument) return { raw: undefined, styled: undefined };
    
    const recentSummary = abSummaryPairs
      .filter(pair => pair.documentId === selectedDocument.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
    const result = {
      raw: recentSummary?.summaryA.rawSummary || undefined,
      styled: recentSummary?.summaryA.styledSummary || recentSummary?.summaryA.markdownSummary || undefined
    };
    
    // Debug logging
    if (recentSummary) {
      logInfo('UI', 'Retrieved summaries for document', {
        documentId: selectedDocument.id,
        pairId: recentSummary.id,
        hasRaw: !!result.raw,
        hasStyled: !!result.styled,
        rawLength: result.raw?.length || 0,
        styledLength: result.styled?.length || 0
      });
    }
    
    return result;
  };

  // Handle regenerating the stylized summary
  const handleRegenerateStyled = async () => {
    logInfo('UI', 'Regenerate button clicked - starting regeneration process', {
      hasSelectedDocument: !!selectedDocument,
      hasStyleGuide: !!styleGuide,
      regenerationCount,
      abSummaryPairsCount: abSummaryPairs.length
    });

    if (!selectedDocument || !styleGuide) {
      logInfo('UI', 'Cannot regenerate: missing document or style guide');
      return;
    }

    // Get the most recent summary pair to access the merged facts
    const recentSummary = abSummaryPairs
      .filter(pair => pair.documentId === selectedDocument.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    logInfo('UI', 'Found recent summary pair', {
      found: !!recentSummary,
      hasFacts: !!recentSummary?.summaryA.mergedFacts,
      pairId: recentSummary?.id,
      factsKeys: recentSummary?.summaryA.mergedFacts ? Object.keys(recentSummary.summaryA.mergedFacts) : []
    });

    if (!recentSummary?.summaryA.mergedFacts) {
      logInfo('UI', 'Cannot regenerate: no existing facts found', {
        recentSummary: recentSummary ? {
          id: recentSummary.id,
          hasSummaryA: !!recentSummary.summaryA,
          summaryAKeys: recentSummary.summaryA ? Object.keys(recentSummary.summaryA) : []
        } : null
      });
      return;
    }

    // IMMEDIATELY set loading state for instant UI feedback
    protectedSetIsSummarizing(true);
    setRegenerationInProgress(true);
    localStorage.setItem('regenerationInProgress', 'true');
    setProgressStatus('Regenerating stylized summary...');
    
    // Set regeneration start time for progress tracking
    setProcessingStartTime(new Date());
    
    // Store the regeneration start time to prevent premature state reset
    const regenerationStartTime = Date.now();
    
    logInfo('UI', 'Starting regeneration with SummarizationEngine', {
      documentId: selectedDocument.id,
      regenerationCount,
      factsKeys: Object.keys(recentSummary.summaryA.mergedFacts),
      styleGuideHasInstructions: !!styleGuide.instructions_md,
      styleGuideInstructionsLength: styleGuide.instructions_md?.length || 0,
      regenerationStartTime
    });
    
    logInfo('UI', 'Starting stylized summary regeneration', { 
      documentId: selectedDocument.id,
      documentTitle: selectedDocument.title || selectedDocument.filename || 'Unknown Document'
    });

    try {
      // Update progress status to show we're calling the AI
      setProgressStatus('Calling AI for regeneration...');
      
      // Regenerate just the stylized summary
      const newStyledSummary = await SummarizationEngine.regenerateStyledSummary(
        selectedDocument,
        recentSummary.summaryA.mergedFacts,
        styleGuide,
        regenerationCount
      );
      
      // Update progress status to show we're processing the response
      setProgressStatus('Processing AI response...');

      // Compare old vs new summary to verify regeneration worked
      const oldSummary = recentSummary.summaryA.styledSummary || recentSummary.summaryA.markdownSummary || '';
      const isIdentical = oldSummary === newStyledSummary;
      
      // More sophisticated similarity check
      const similarityScore = calculateSimilarity(oldSummary, newStyledSummary);
      const isTooSimilar = similarityScore > 0.8; // 80% similarity threshold
      
      console.log('🔄 SUMMARY COMPARISON:', {
        regenerationCount,
        oldSummaryLength: oldSummary.length,
        newSummaryLength: newStyledSummary.length,
        isIdentical,
        similarityScore: similarityScore.toFixed(3),
        isTooSimilar,
        oldSummaryStart: oldSummary.substring(0, 100),
        newSummaryStart: newStyledSummary.substring(0, 100),
        oldSummaryEnd: oldSummary.substring(oldSummary.length - 100),
        newSummaryEnd: newStyledSummary.substring(newStyledSummary.length - 100)
      });

      if (isIdentical) {
        console.warn('⚠️ WARNING: Regenerated summary is IDENTICAL to previous summary!');
        logInfo('UI', 'Warning: Regenerated summary is identical to previous summary', {
          regenerationCount,
          summaryLength: newStyledSummary.length
        });
      } else if (isTooSimilar) {
        console.warn('⚠️ WARNING: Regenerated summary is too similar to previous summary!', {
          similarityScore: similarityScore.toFixed(3)
        });
        logInfo('UI', 'Warning: Regenerated summary is too similar to previous summary', {
          regenerationCount,
          similarityScore: similarityScore.toFixed(3)
        });
      }

      logInfo('UI', 'Regeneration completed successfully', {
        newSummaryLength: newStyledSummary.length,
        newSummaryPreview: newStyledSummary.substring(0, 200) + '...',
        regenerationCount,
        isIdentical
      });

      // Increment regeneration count for next time
      setRegenerationCount(prev => prev + 1);

      // Update the existing summary pair with the new stylized summary
      const updatedSummaryA = {
        ...recentSummary.summaryA,
        styledSummary: newStyledSummary,
        markdownSummary: newStyledSummary // Update backward compatibility field
      };

      const updatedPair = {
        ...recentSummary,
        summaryA: updatedSummaryA,
        createdAt: new Date().toISOString() // Update timestamp
      };

      logInfo('UI', 'About to update AB summary pair', {
        pairId: updatedPair.id,
        hasUpdatedPair: !!updatedPair,
        oldSummaryLength: recentSummary.summaryA.styledSummary?.length || recentSummary.summaryA.markdownSummary?.length || 0,
        newSummaryLength: newStyledSummary.length
      });

      // Update the store
      updateABSummaryPair(updatedPair);
      
      logInfo('UI', 'AB summary pair updated successfully - regeneration complete', {
        summaryLength: newStyledSummary.length,
        regenerationCount: regenerationCount + 1,
        updatedPairId: updatedPair.id
      });

      // Force a UI refresh by updating local state
      // This ensures the component re-renders with the new summary
      setSelectedDocument((prev: any) => prev ? { ...prev } : null);
      
      // Show success message
      setRegenerationSuccess(true);
      setTimeout(() => setRegenerationSuccess(false), 3000);
      
      // Final status update
      setProgressStatus('Regeneration completed successfully!');
      
      // Clear persistent regeneration state
      setRegenerationInProgress(false);
      localStorage.removeItem('regenerationInProgress');

    } catch (error) {
      logInfo('UI', 'Failed to regenerate stylized summary', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show error to user
      setProgressStatus(`Regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Keep error visible for a few seconds
      setTimeout(() => setProgressStatus(''), 5000);
    } finally {
      // Only reset loading state if this was a regeneration operation
      // Check if we're still in the same regeneration cycle
      const currentTime = Date.now();
      const timeSinceRegenerationStart = currentTime - regenerationStartTime;
      
      // If this is a regeneration operation (started within last 5 minutes), reset the state
      if (timeSinceRegenerationStart < 300000) { // 5 minutes
        protectedSetIsSummarizing(false);
        setRegenerationInProgress(false);
        localStorage.removeItem('regenerationInProgress');
        if (!progressStatus.includes('failed')) {
          setProgressStatus('');
        }
        logInfo('UI', 'Regeneration process finished (finally block)', {
          timeSinceRegenerationStart,
          regenerationStartTime
        });
      } else {
        logInfo('UI', 'Skipping loading state reset - not a regeneration operation', {
          timeSinceRegenerationStart,
          regenerationStartTime
        });
      }
    }
  };

  return (
    <AppShell>
      <div className="py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 relative">
          {/* Floating Action Buttons */}
          <div className="absolute left-4 top-8 z-10">
            {documents.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all documents?')) {
                    // Clear all documents from store
                    useAppStore.getState().clearAllData();
                    setSelectedDocument(null);
                    setIsSummarizing(false);
                    setChunksProcessed(0);
                    setTotalChunks(0);
                    setProgressPercent(0);
                    setProgressStatus('');
                    setRegenerationCount(1);
                    setRegenerationSuccess(false);
                    setRegenerationInProgress(false);
                    localStorage.removeItem('regenerationInProgress');
                  }
                }}
                className="glass-panel p-3 hover:bg-white hover:bg-opacity-10 transition-all duration-200"
                title="Clear all documents"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
          
          <div className="absolute right-4 top-8 z-10">
            <button
              onClick={() => navigate('/settings')}
              className="glass-panel p-3 hover:bg-white hover:bg-opacity-10 transition-all duration-200"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 flex items-center justify-center">
                <img 
                  src={eliraIcon} 
                  alt="Elira Icon" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-6xl font-semibold text-white tracking-tight flex items-center gap-3" style={{ fontFamily: 'Lora, serif' }}>
                Elira
                <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                  BETA
                </span>
              </h1>
            </div>
            <p className="text-xl text-white text-opacity-80 max-w-3xl mx-auto font-medium">
              Transform your transcripts into powerful insights with AI-powered summarization, 
              analysis, and conversational Q&A using your local AI instance.
            </p>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Center & Left Columns - Summary spans both (now centered) */}
          <div className="lg:col-span-2">
            <SummaryPreviewCard 
              key={`summary-${selectedDocument?.id}-${regenerationCount}`}
              summary={getSelectedDocumentSummary()} // backward compatibility
              rawSummary={getSelectedDocumentSummaries().raw}
              styledSummary={getSelectedDocumentSummaries().styled}
              isLoading={isSummarizing}
              chunksProcessed={chunksProcessed}
              totalChunks={totalChunks}
              processingStartTime={processingStartTime}
              progressPercent={progressPercent}
              progressStatus={progressStatus}
              onRegenerateStyled={handleRegenerateStyled}
              regenerationSuccess={regenerationSuccess}
            />
          </div>

          {/* Right Column - Upload & Recent Documents */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <UploadCard 
              onUploadComplete={handleUploadComplete}
              onProgress={(current, total, status) => {
                setProgressPercent(current);
                setProgressStatus(status || '');
                setIsUploading(current < 100); // Use separate upload state
                
                // Also set chunk info for backward compatibility
                const estimatedTotalChunks = 7;
                const estimatedProcessedChunks = Math.floor((current / 100) * estimatedTotalChunks);
                setChunksProcessed(estimatedProcessedChunks);
                setTotalChunks(estimatedTotalChunks);
                
                if (current === 0) {
                  setProcessingStartTime(new Date());
                }
              }}
            />
            
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

          {/* Status Card - hidden for beta version */}
          {/* <div className="lg:col-span-1">
            <StatusCard />
          </div> */}
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
