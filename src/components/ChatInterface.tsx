/**
 * ChatInterface - Main chat area with Perplexity-inspired design
 * Features action chips, multi-modal input, and integrated document handling
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, Grid, Mic, Paperclip, Globe, Calendar, FileText } from 'lucide-react';

import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';
import { FileUpload } from './FileUpload';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'document' | 'summary';
  metadata?: any;
}

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const { documents } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [showActionChips, setShowActionChips] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hi! I\'m Elira, your AI assistant for transcript analysis. I can help you:\n\n• Upload and analyze transcripts\n• Generate summaries with your preferred style\n• Answer questions about your documents\n• Compare different documents\n\nStart by uploading a document or asking me anything!',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle document upload
  const handleDocumentUpload = (document: any) => {
    const uploadMessage: ChatMessage = {
      id: `upload-${Date.now()}`,
      role: 'user',
      content: `📄 Uploaded: ${document.title}`,
      timestamp: new Date().toISOString(),
      type: 'document',
      metadata: { documentId: document.id, filename: document.filename }
    };
    
    setMessages(prev => [...prev, uploadMessage]);
    
    // Add processing message
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      role: 'assistant',
      content: '🔄 Processing your document... This may take a moment.',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, processingMessage]);
    
    // TODO: Trigger actual document processing
    logInfo('CHAT', 'Document upload initiated', { documentId: document.id });
  };

  // Handle message sending
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowActionChips(false);

    logInfo('CHAT', 'User message sent', { content: userMessage.content });

    try {
      // Check if we have any documents and embeddings
      if (documents.length === 0) {
        const noDocsResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I don\'t have any documents to chat about yet. Please upload some documents first, and I\'ll be able to answer questions about their content.',
          timestamp: new Date().toISOString(),
          type: 'text'
        };
        setMessages(prev => [...prev, noDocsResponse]);
        setIsTyping(false);
        setShowActionChips(true);
        return;
      }

      // TODO: Implement actual chat processing with ChatEngine
      const response: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. The actual chat functionality will be implemented in the next phase.',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, response]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setShowActionChips(true);
    }
  };

  // Handle action chip clicks
  const handleActionChip = (action: string) => {
    let message = '';
    switch (action) {
      case 'troubleshoot':
        message = 'I can help you troubleshoot issues with your documents or analysis. What specific problem are you experiencing?';
        break;
      case 'analyze':
        message = 'I\'m ready to analyze your documents. What would you like me to focus on?';
        break;
      case 'local':
        message = 'I\'m running locally on your machine for privacy. What would you like to know about your local setup?';
        break;
      case 'finance':
        message = 'I can help analyze financial transcripts and documents. What financial content would you like me to examine?';
        break;
      case 'shopping':
        message = 'I can help with shopping-related transcripts and analysis. What shopping content do you have?';
        break;
      default:
        message = `I can help with ${action}. What would you like to know?`;
    }
    
    setInputValue(message);
    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.role === 'system'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-gray-50 text-gray-800 border border-gray-200'
              }`}
            >
              {message.type === 'document' && (
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm opacity-80">Document Upload</span>
                </div>
              )}
              
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              <div className="text-xs opacity-60 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-600">Elira is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Action Chips */}
      {showActionChips && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {['troubleshoot', 'analyze', 'local', 'finance', 'shopping'].map((action) => (
              <button
                key={action}
                onClick={() => handleActionChip(action)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors capitalize"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-6">
        <div className="flex items-end gap-3">
          {/* Left Action Icons */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Grid className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Main Input Field */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything or @mention a document..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              
            />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Calendar className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Globe className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="mt-4">
          <FileUpload onUploadComplete={handleDocumentUpload} />
        </div>
      </div>
    </div>
  );
};
