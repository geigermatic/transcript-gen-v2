/**
 * ContextAwareChat - Shared chat component with context awareness
 * Maintains consistent patterns while preserving page-specific context and history
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { EnhancedChatEngine } from '../lib/enhancedChatEngine';
import type { ChatMessage, ChatContext, Document, ABSummaryPair } from '../types';

interface ContextAwareChatProps {
  // Context-specific props
  activeDocument?: Document | null;
  currentSummary?: any; // SummaryResult or ABSummaryPair
  
  // Chat state management
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  
  // UI customization
  placeholder?: string;
  className?: string;
  showMessagesArea?: boolean;
  
  // Optional overrides
  customContext?: Partial<ChatContext>;
}

export const ContextAwareChat: React.FC<ContextAwareChatProps> = ({
  activeDocument,
  currentSummary,
  messages,
  onMessagesChange,
  placeholder = "Ask a question...",
  className = "",
  showMessagesArea = true,
  customContext = {}
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const { documents, abSummaryPairs, styleGuide } = useAppStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const buildChatContext = (): ChatContext => {
    // Build context based on current page and available data
    const baseContext: ChatContext = {
      messages: messages,
      documentIds: activeDocument ? [activeDocument.id] : documents.map(d => d.id),
      activeDocument: activeDocument || documents[0] || null,
      selectedDocumentSummary: currentSummary ? {
        id: crypto.randomUUID(),
        documentId: activeDocument?.id || '',
        documentTitle: activeDocument?.title || activeDocument?.filename || '',
        summaryA: currentSummary,
        summaryB: currentSummary,
        variantDetails: {
          variantA: { name: 'Current', description: 'Current summary', styleModifications: {}, promptStrategy: 'Current' },
          variantB: { name: 'Current', description: 'Current summary', styleModifications: {}, promptStrategy: 'Current' }
        },
        createdAt: new Date().toISOString()
      } : undefined,
      availableSummaries: abSummaryPairs,
      maxContextLength: 4000
    };

    // Merge with any custom context overrides
    return { ...baseContext, ...customContext };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInputValue('');
    setIsProcessing(true);

    try {
      const chatContext = buildChatContext();
      
      // Process with Enhanced ChatEngine for context-aware responses
      const response = await EnhancedChatEngine.processContextAwareQuery(
        userMessage.content,
        chatContext,
        location.pathname
      );

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date().toISOString(),
        sources: response.sources
      };

      onMessagesChange([...newMessages, assistantMessage]);

    } catch (error) {
      console.error('Chat processing failed:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };

      onMessagesChange([...newMessages, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Messages Area - Conditional rendering */}
      {showMessagesArea && messages.length > 0 && (
        <div className="mb-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs text-gray-600">
                        Sources: {message.sources.length} relevant sections
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-600">Processing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isProcessing}
            className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
