/**
 * ChatCentricLayout - Main layout with Perplexity-inspired design
 * Features collapsible left navigation and focused chat interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, User, ChevronUp, Download, Clock, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppShell } from './AppShell';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import { FileUpload } from './FileUpload';
import { useAppStore } from '../store';
import { SummarizationEngine } from '../lib/summarizationEngine';
import { ChatEngine } from '../lib/chatEngine';
import { EmbeddingEngine } from '../lib/embeddingEngine';
import type { ABSummaryPair } from '../types';



export const ChatCentricLayout: React.FC = () => {
  const navigate = useNavigate();
  const { documents, styleGuide, addLog, addABSummaryPair, addEmbeddings, clearAllData, embeddings, isHydrated } = useAppStore();
  
  // Navigation state
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: 'text' | 'document' | 'summary';
    metadata?: any;
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Progress tracking state
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [showProgress, setShowProgress] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  
  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

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

  // Handle document upload and add to chat
  const handleDocumentUpload = async (success: boolean, message: string, document?: any) => {
    if (success && document) {
      // Add upload message to chat
      const uploadMessage = {
        id: `upload-${Date.now()}`,
        role: 'user' as const,
        content: `📄 Uploaded: ${document.title || document.filename}`,
        timestamp: new Date().toISOString(),
        type: 'document' as const,
        metadata: { documentId: document.id, filename: document.filename }
      };
      
      setMessages(prev => [...prev, uploadMessage]);
      
      // Add processing message
      const processingMessage = {
        id: `processing-${Date.now()}`,
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
          }
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
        
        const errorMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant' as const,
          content: `❌ Sorry, I encountered an error while processing your document. Please try again or check if your AI instance is running.`,
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
        id: `upload-error-${Date.now()}`,
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
        id: `ai-${Date.now()}`,
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
      id: `user-${Date.now()}`,
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
          id: `ai-${Date.now()}`,
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
          id: `ai-${Date.now()}`,
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
        id: `ai-${Date.now()}`,
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
      
      const errorMessage = {
        id: `ai-error-${Date.now()}`,
        role: 'assistant' as const,
        content: `❌ Sorry, I encountered an error while processing your message. Please check if your AI instance is running and try again.`,
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
    <AppShell>
      <div className="flex h-screen">
        {/* Left Navigation Panel - Collapsible on Hover */}
        <div 
          className={`relative transition-all duration-300 ease-in-out ${
            isNavExpanded ? 'w-80' : 'w-16'
          } bg-gray-50 border-r border-gray-200`}
          onMouseEnter={handleNavMouseEnter}
          onMouseLeave={handleNavMouseLeave}
        >
          {/* Navigation Content */}
          <div className="h-full flex flex-col">
            {/* Top Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img 
                    src={eliraIcon} 
                    alt="Elira" 
                    className="w-full h-full object-contain"
                  />
                </div>
                {isNavExpanded && (
                  <span className="text-lg font-semibold text-gray-800">Elira</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-3">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Plus className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">New Chat</span>}
              </button>
              
              <button 
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Settings</span>}
              </button>
              
              {/* Clear All Documents Button */}
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
                    clearAllData();
                    // Refresh the page to show clean interface
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                {isNavExpanded && <span>Clear All Documents</span>}
              </button>
            </div>



            {/* Documents Section - Only show when expanded */}
            {isNavExpanded && (
              <div className="px-4 py-2 flex-1">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Documents ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 mx-auto mb-2 text-gray-400">
                      📄
                    </div>
                    <p className="text-gray-500 text-sm">No documents yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Upload documents to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-3 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => {
                          // Navigate to summary view with document data
                          navigate('/summary/' + doc.id, { 
                            state: { document: doc }
                          });
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-800 text-sm truncate mb-1">
                              {doc.title || doc.filename}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                              <span>{formatFileSize(doc.metadata.fileSize)}</span>
                            </div>
                            {doc.metadata.wordCount && (
                              <div className="text-xs text-gray-500 mt-1">
                                {doc.metadata.wordCount} words
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Section */}
            <div className="mt-auto p-4 border-t border-gray-200 space-y-2">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <User className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Account</span>}
              </button>
              
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronUp className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Upgrade</span>}
              </button>
              
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Download className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Install</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Centered Content Layout */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            {/* Content Container */}
            <div className="w-full max-w-4xl space-y-8">
              {/* Logo */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4">
                  <img 
                    src={eliraIcon} 
                    alt="Elira" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-3xl font-semibold text-gray-800">Elira</h1>
              </div>

              {/* Tag Line and Instructions */}
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                  <p className="text-lg text-gray-700 mb-4">
                    Transform your transcripts into powerful insights with AI-powered summarization, 
                    analysis, and conversational Q&A using your local AI instance.
                  </p>
                  <p className="text-gray-600">
                    Upload documents and start chatting with your AI assistant.
                  </p>
                </div>
              </div>

              {/* Drop Zone */}
              <div className="text-center">
                <FileUpload onUploadComplete={handleDocumentUpload} />
              </div>

              {/* Progress Display Area */}
              {showProgress && (
                <div className="w-full max-w-4xl mx-auto mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-800">Processing Document</h3>
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm text-gray-600">
                          {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : '...'}
                        </span>
                      </div>
                    </div>
                    
                    {progress.total > 0 && (
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{progress.status || 'Processing...'}</span>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>Elapsed: {formatTime(elapsedTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Display Area */}
              {messages.length > 0 && (
                <div className="w-full max-w-4xl mx-auto">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-3xl rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-50 text-gray-800 border border-gray-200'
                          }`}
                        >
                          <div className="text-sm prose prose-sm max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">{children}</blockquote>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <div className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            <span className="text-sm">Processing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Input Field */}
              <div className="w-full max-w-2xl mx-auto">
                <div className="flex items-center gap-3 p-4 border border-gray-300 rounded-2xl bg-white">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a document to get started..."
                    className="flex-1 px-4 py-3 border-none outline-none focus:ring-0 text-gray-800 placeholder-gray-500"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isProcessing || !isHydrated}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!isHydrated ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
