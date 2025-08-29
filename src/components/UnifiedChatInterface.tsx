/**
 * Unified Chat Interface - Single powerful chat component with document manipulation
 * Replaces fragmented chat implementations with comprehensive functionality
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, FileText, RefreshCw, Edit3, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useAppStore } from '../store';
import { EnhancedChatEngine, type EnhancedChatResponse } from '../lib/enhancedChatEngine';
import type { ChatMessage, ChatContext, Document } from '../types';

interface UnifiedChatInterfaceProps {
  selectedDocument?: Document | null;
  className?: string;
}

interface ChatAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  description: string;
}

export const UnifiedChatInterface: React.FC<UnifiedChatInterfaceProps> = ({
  selectedDocument,
  className = ''
}) => {
  const { documents, styleGuide, abSummaryPairs, getAllEmbeddings } = useAppStore();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [lastResponse, setLastResponse] = useState<EnhancedChatResponse | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action suggestions
  const quickActions: ChatAction[] = [
    {
      id: 'rephrase-warmer',
      label: 'Make Warmer',
      icon: <Sparkles size={16} />,
      prompt: 'Rephrase this in a warmer, more compassionate tone',
      description: 'Apply Caren\'s warm, nurturing voice'
    },
    {
      id: 'reformat-bullets',
      label: 'Bullet Points',
      icon: <FileText size={16} />,
      prompt: 'Reformat this as clear bullet points',
      description: 'Organize content into easy-to-read bullets'
    },
    {
      id: 'add-examples',
      label: 'Add Examples',
      icon: <Plus size={16} />,
      prompt: 'Add practical examples to illustrate these concepts',
      description: 'Include real-world applications'
    },
    {
      id: 'simplify',
      label: 'Simplify',
      icon: <RefreshCw size={16} />,
      prompt: 'Simplify this for someone new to meditation',
      description: 'Make more accessible for beginners'
    }
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle message sending
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isProcessing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    setShowSuggestions(false);

    try {
      // Build chat context
      const context: ChatContext = {
        messages: messages,
        documentIds: selectedDocument ? [selectedDocument.id] : documents.map(d => d.id),
        activeDocument: selectedDocument || null,
        selectedDocumentSummary: getSelectedDocumentSummary(),
        availableSummaries: abSummaryPairs,
        maxContextLength: 4000
      };

      // Process with enhanced chat engine
      const response = await EnhancedChatEngine.processEnhancedQuery(text, context);
      setLastResponse(response);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date().toISOString(),
        sources: response.sources
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Please try again or rephrase your question.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, messages, selectedDocument, documents, abSummaryPairs]);

  // Get selected document summary
  const getSelectedDocumentSummary = useCallback(() => {
    if (!selectedDocument) return undefined;
    const summary = abSummaryPairs.find(pair => pair.documentId === selectedDocument.id);
    return summary?.styledSummary || summary?.rawSummary;
  }, [selectedDocument, abSummaryPairs]);

  // Handle quick action
  const handleQuickAction = useCallback((action: ChatAction) => {
    handleSendMessage(action.prompt);
  }, [handleSendMessage]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Render message
  const renderMessage = useCallback((message: ChatMessage) => (
    <div
      key={message.id}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
    >
      <div
        className={`max-w-3xl rounded-2xl px-4 py-3 ${
          message.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-50 text-gray-800 border border-gray-200'
        }`}
      >
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {/* Show sources if available */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-600">
              Referenced {message.sources.length} source{message.sources.length > 1 ? 's' : ''} from your documents
            </p>
          </div>
        )}
      </div>
    </div>
  ), []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Chat with {selectedDocument ? selectedDocument.title : 'Your Documents'}
            </h2>
            <p className="text-sm text-gray-600">
              Ask questions, request reformatting, or get help with your content
            </p>
          </div>
          {selectedDocument && (
            <div className="text-sm text-gray-500">
              <FileText size={16} className="inline mr-1" />
              {selectedDocument.metadata.wordCount} words
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && showSuggestions && (
          <div className="text-center py-8">
            <div className="mb-6">
              <Sparkles size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                How can I help you today?
              </h3>
              <p className="text-gray-600">
                I can help you reformat content, rephrase in Caren's voice, answer questions, and more.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center mb-1">
                    {action.icon}
                    <span className="ml-2 font-medium text-sm">{action.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(renderMessage)}
        
        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex justify-start mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {/* Show suggestions after response */}
        {lastResponse?.suggestions && lastResponse.suggestions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {lastResponse.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(suggestion)}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question, request reformatting, or get help with your content..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isProcessing}
            className="flex-shrink-0 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
