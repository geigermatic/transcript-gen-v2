/**
 * ChatCentricLayout - Main layout with Perplexity-inspired design
 * Features collapsible left navigation and focused chat interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import { ChatEngine } from '../lib/chatEngine';
import { EmbeddingEngine } from '../lib/embeddingEngine';
import type { ABSummaryPair, Document } from '../types';
import { LeftNavigation } from './LeftNavigation';
import { HomePageLayout } from './HomePageLayout';
import { ProgressDisplay } from './ProgressDisplay';
import { MessagesDisplay } from './MessagesDisplay';
import { ChatInput } from './ChatInput';



export const ChatCentricLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { documents, styleGuide, addLog, addABSummaryPair, addEmbeddings, embeddings, isHydrated, settings } = useAppStore();
  
  // Navigation state
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: 'text' | 'document' | 'summary';
    metadata?: {
      documentId?: string;
      filename?: string;
      processingTime?: number;
      retrievalCount?: number;
      topSimilarity?: number;
    };
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Progress tracking state
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [showProgress, setShowProgress] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // No need for ref tracking - we'll check the messages array directly





  
  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);
  
  // Handle new chat - clear chat history
  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    setIsProcessing(false);
    setShowProgress(false);
    setProcessingStartTime(null);
    setElapsedTime(0);
    setProgress({ current: 0, total: 0, status: '' });
  };

  // Ensure page starts at top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Debug embeddings state on mount and when embeddings change
  useEffect(() => {
    console.log('🔍 Embeddings state changed:', {
      embeddingsSize: embeddings.size,
      documentCount: documents.length,
      hasEmbeddings: embeddings.size > 0,
      embeddingsKeys: Array.from(embeddings.keys()),
      documents: documents.map(d => ({ id: d.id, title: d.title || d.filename }))
    });
  }, [embeddings, documents]);

  // Timer for elapsed time tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showProgress && processingStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - processingStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showProgress, processingStartTime]);

  // Handle return from summary view - show document completion state
  useEffect(() => {
    if (location.state?.returnFromSummary && location.state?.document) {
      const document = location.state.document;
      
      // Check if we already have a completion message for this document in the chat
      const existingCompletionMessage = messages.find(msg => 
        msg.type === 'document' && 
        msg.metadata?.documentId === document.id &&
        msg.content.includes('has been successfully processed and summarized')
      );
      
      // Only add completion message if one doesn't already exist
      if (!existingCompletionMessage) {
        const completionMessage = {
          id: `completion-${crypto.randomUUID()}`,
          role: 'assistant' as const,
          content: `✅ Document "${document.title || document.filename}" has been successfully processed and summarized. You can now ask questions about this document or upload another one.`,
          timestamp: new Date().toISOString(),
          type: 'document' as const,
          metadata: {
            documentId: document.id,
            filename: document.filename
          }
        };
        
        setMessages(prev => [...prev, completionMessage]);
      }
      
      // Clear the navigation state to prevent re-triggering
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate, messages]);

  // Handle document upload and add to chat
  const handleDocumentUpload = async (success: boolean, message: string, document?: Document) => {
    if (success && document) {
      // Add upload message to chat
      const uploadMessage = {
        id: `upload-${crypto.randomUUID()}`,
        role: 'user' as const,
        content: `📄 Uploaded: ${document.title || document.filename}`,
        timestamp: new Date().toISOString(),
        type: 'document' as const,
        metadata: { documentId: document.id, filename: document.filename }
      };
      
      setMessages(prev => [...prev, uploadMessage]);
      
      // Add processing message
      const processingMessage = {
        id: `processing-${crypto.randomUUID()}`,
        role: 'assistant' as const,
        content: '🔄 Processing your document... This may take a moment.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      try {
        // Log the processing start
        addLog({
          level: 'info',
          category: 'chat',
          message: `Starting AI processing for document: ${document.title || document.filename}`,
          details: { documentId: document.id, filename: document.filename }
        });

        // Show progress indicator and start timer
        setShowProgress(true);
        setProcessingStartTime(new Date());
        setElapsedTime(0);
        setProgress({ current: 0, total: 0, status: 'Initializing document processing...' });

        // Generate embeddings first (needed for chat functionality)
        const embeddedChunks = await EmbeddingEngine.generateDocumentEmbeddings(
          document.id,
          document.text,
          (progress) => {
            // Log embedding progress
            addLog({
              level: 'info',
              category: 'embeddings',
              message: `Embedding progress: ${progress.current}/${progress.total} chunks (${progress.percentage}%)`,
              details: { documentId: document.id, filename: document.filename }
            });
          }
        );
        
        // Store embeddings in the store for chat functionality
        addEmbeddings(document.id, embeddedChunks);
        
        // Process document with AI summarization with progress tracking
        const summaryResult = await SummarizationEngine.summarizeDocument(
          document, 
          styleGuide,
          (current: number, total: number, status?: string) => {
            setProgress({ current, total, status: status || 'Processing...' });
          },
          settings.chat_default,
          settings.rawSummaryEnabled
        );
        
        // Create AB summary pair to store the result for future access
        const summaryPair: ABSummaryPair = {
          id: crypto.randomUUID(),
          documentId: document.id,
          documentTitle: document.title || document.filename,
          summaryA: summaryResult,
          summaryB: summaryResult, // Use same result for both A and B for now
          variantDetails: {
            variantA: { 
              name: 'Default', 
              description: 'Standard processing',
              styleModifications: {},
              promptStrategy: 'Standard summarization with style guide'
            },
            variantB: { 
              name: 'Default', 
              description: 'Standard processing',
              styleModifications: {},
              promptStrategy: 'Standard summarization with style guide'
            }
          },
          createdAt: new Date().toISOString()
        };
        
        // Add to store so it can be retrieved later
        addABSummaryPair(summaryPair);
        
        // Hide progress, reset timer, and remove processing message
        setShowProgress(false);
        setProcessingStartTime(null);
        setElapsedTime(0);
        setProgress({ current: 0, total: 0, status: '' });
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));

        // Navigate to summary results view with document and summary data
        navigate(`/summary/${document.id}`, { 
          state: { 
            document: document, 
            summary: summaryResult 
          } 
        });
        
        // Log successful processing
        addLog({
          level: 'info',
          category: 'chat',
          message: `Document processing completed successfully`,
          details: { 
            documentId: document.id, 
            filename: document.filename,
            processingTime: summaryResult.processingStats.processingTime,
            chunkCount: summaryResult.processingStats.totalChunks
          }
        });
        
      } catch (error) {
        console.error('Document processing failed:', error);
        
        // Hide progress, reset timer, and remove processing message
        setShowProgress(false);
        setProcessingStartTime(null);
        setElapsedTime(0);
        setProgress({ current: 0, total: 0, status: '' });
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        
        // Create more specific error message based on the error type
        let errorContent = `❌ Sorry, I encountered an error while processing your document.`;
        
        if (error instanceof Error) {
          if (error.message.includes('Ollama is not running')) {
            errorContent = `❌ **Ollama is not running.** Please start Ollama with \`ollama serve\` and try again.`;
          } else if (error.message.includes('timed out')) {
            errorContent = `❌ **Request timed out.** Ollama may be unresponsive. Please check if Ollama is running and try again.`;
          } else if (error.message.includes('Chat request failed')) {
            errorContent = `❌ **Ollama connection failed.** Please ensure Ollama is running on http://127.0.0.1:11434 and try again.`;
          } else {
            errorContent = `❌ **Processing error:** ${error.message}`;
          }
        }
        
        const errorMessage = {
          id: `error-${crypto.randomUUID()}`,
          role: 'assistant' as const,
          content: errorContent,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Log the error
        addLog({
          level: 'error',
          category: 'chat',
          message: `Document processing failed`,
          details: { 
            documentId: document.id, 
            filename: document.filename,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    } else {
      console.error('Upload failed:', message);
      
      const errorMessage = {
        id: `upload-error-${crypto.randomUUID()}`,
        role: 'assistant' as const,
        content: `❌ Upload failed: ${message}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle chat input submission
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    // Wait for store to be hydrated before processing
    if (!isHydrated) {
      const hydrationResponse = {
        id: `ai-${crypto.randomUUID()}`,
        role: 'assistant' as const,
        content: 'Please wait a moment while I load your documents and data...',
        timestamp: new Date().toISOString(),
        type: 'text' as const
      };
      
      setMessages(prev => [...prev, hydrationResponse]);
      setIsProcessing(false);
      return;
    }
    
    const userMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    try {
      // Log the chat request
      addLog({
        level: 'info',
        category: 'chat',
        message: `Processing chat message: "${inputValue.trim().substring(0, 100)}${inputValue.trim().length > 100 ? '...' : ''}"`,
        details: { 
          messageLength: inputValue.trim().length,
          hasDocuments: documents.length > 0,
          hasStyleGuide: !!styleGuide
        }
      });

      // Check if we have documents to work with
      if (documents.length === 0) {
        const noDocsResponse = {
          id: `ai-${crypto.randomUUID()}`,
          role: 'assistant' as const,
          content: 'I don\'t have any documents to analyze yet. Please upload a document first, and then I\'ll be able to answer questions about it!',
          timestamp: new Date().toISOString(),
          type: 'text' as const
        };
        
        setMessages(prev => [...prev, noDocsResponse]);
        setIsProcessing(false);
        return;
      }

      // Check if we have embeddings for the documents (needed for chat functionality)
      console.log('🔍 Chat validation - Embeddings check:', {
        embeddingsSize: embeddings.size,
        documentCount: documents.length,
        embeddingsKeys: Array.from(embeddings.keys()),
        documentIds: documents.map(d => d.id)
      });
      
      if (embeddings.size === 0) {
        console.log('❌ No embeddings found - showing processing message');
        const noEmbeddingsResponse = {
          id: `ai-${crypto.randomUUID()}`,
          role: 'assistant' as const,
          content: 'Your documents are still being processed for search. I need to generate embeddings first before I can answer questions about the content. Please wait a moment and try again.',
          timestamp: new Date().toISOString(),
          type: 'text' as const
        };
        
        setMessages(prev => [...prev, noEmbeddingsResponse]);
        setIsProcessing(false);
        return;
      }

      // Create chat context for the AI engine
      const chatContext = {
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        selectedDocument: documents[0], // Use the first document for now
        selectedDocumentSummary: undefined, // We'll enhance this later
        styleGuide: styleGuide
      };

      // Process with ChatEngine
      const aiResponse = await ChatEngine.processQuery(inputValue.trim(), chatContext);
      
      const responseMessage = {
        id: `ai-${crypto.randomUUID()}`,
        role: 'assistant' as const,
        content: aiResponse.message.content,
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        metadata: {
          processingTime: aiResponse.responseMetrics.processingTime,
          retrievalCount: aiResponse.responseMetrics.retrievalCount,
          topSimilarity: aiResponse.responseMetrics.topSimilarity
        }
        };
      
      setMessages(prev => [...prev, responseMessage]);
      
      // Log successful response
      addLog({
        level: 'info',
        category: 'chat',
        message: `Chat response generated successfully`,
        details: { 
          query: inputValue.trim(),
          responseLength: aiResponse.message.content.length,
          processingTime: aiResponse.responseMetrics.processingTime,
          retrievalCount: aiResponse.responseMetrics.retrievalCount
        }
      });
      
    } catch (error) {
      console.error('Chat processing failed:', error);
      
      // Create more specific error message for chat
      let chatErrorContent = `❌ Sorry, I encountered an error while processing your message.`;
      
      if (error instanceof Error) {
        if (error.message.includes('Ollama is not running')) {
          chatErrorContent = `❌ **Ollama is not running.** Please start Ollama with \`ollama serve\` and try again.`;
        } else if (error.message.includes('timed out')) {
          chatErrorContent = `❌ **Request timed out.** Ollama may be unresponsive. Please check if Ollama is running and try again.`;
        } else if (error.message.includes('Chat request failed')) {
          chatErrorContent = `❌ **Ollama connection failed.** Please ensure Ollama is running on http://127.0.0.1:11434 and try again.`;
        } else {
          chatErrorContent = `❌ **Chat error:** ${error.message}`;
        }
      }
      
      const errorMessage = {
        id: `ai-error-${crypto.randomUUID()}`,
        role: 'assistant' as const,
        content: chatErrorContent,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Log the error
      addLog({
        level: 'error',
        category: 'chat',
        message: `Chat processing failed`,
        details: { 
          query: inputValue.trim(),
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation Panel - Collapsible on Hover */}
      <LeftNavigation
        isNavExpanded={isNavExpanded}
        onNavMouseEnter={handleNavMouseEnter}
        onNavMouseLeave={handleNavMouseLeave}
        currentDocumentId={undefined}
        showNewChatButton={true}
        onNewChat={handleNewChat}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <HomePageLayout onUploadComplete={handleDocumentUpload}>
            <ProgressDisplay
              showProgress={showProgress}
              progress={progress}
              elapsedTime={elapsedTime}
            />

            <MessagesDisplay
              messages={messages}
              isProcessing={isProcessing}
            />
          </HomePageLayout>
        </div>

        {/* Chat Input - Fixed at Bottom */}
        <div className="p-6">
          <ChatInput
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            isProcessing={isProcessing}
            isHydrated={isHydrated}
          />
        </div>
      </div>
    </div>
  );
};
