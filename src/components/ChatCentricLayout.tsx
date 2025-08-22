/**
 * ChatCentricLayout - Main layout with Perplexity-inspired design
 * Features collapsible left navigation and focused chat interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, User, ChevronUp, Download, Clock } from 'lucide-react';
import { AppShell } from './AppShell';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import { FileUpload } from './FileUpload';
import { useAppStore } from '../store';

export const ChatCentricLayout: React.FC = () => {
  const navigate = useNavigate();
  const { documents } = useAppStore();
  
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

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  
  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  // Ensure page starts at top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Handle document upload and add to chat
  const handleDocumentUpload = (success: boolean, message: string, document?: any) => {
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
        timestamp: new Date().toISOString(),
        type: 'text' as const
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      // TODO: Trigger actual document processing
      console.log('Document upload initiated:', document);
    } else {
      console.error('Upload failed:', message);
    }
  };

  // Handle chat input submission
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
      type: 'text' as const
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    // TODO: Process with AI and get response
    // For now, add a placeholder response
    setTimeout(() => {
      const aiResponse = {
        id: `ai-${Date.now()}`,
        role: 'assistant' as const,
        content: 'I understand your message. Document processing integration is coming soon!',
        timestamp: new Date().toISOString(),
        type: 'text' as const
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 1000);
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
                          <div className="text-sm">{message.content}</div>
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
                    disabled={!inputValue.trim() || isProcessing}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
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
