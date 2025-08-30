/**
 * ChatCard - Chat interface with glass styling
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Bot, User } from 'lucide-react';
import { ChatEngine } from '../lib/chatEngine';
import { EnhancedChatEngine } from '../lib/enhancedChatEngine';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';
import type { Document } from '../types';
import type { ChatContext } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatCardProps {
  selectedDocument?: Document;
  onSendMessage?: (message: string) => void;
}

export const ChatCard: React.FC<ChatCardProps> = ({ selectedDocument, onSendMessage }) => {
  const { embeddings, documents, abSummaryPairs } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hi! I\'m your AI assistant. Upload some documents and I\'ll help you ask questions about their content, find specific information, and discuss the topics covered. If you have a generated summary, you can reference it by saying "the summary" or "the generated summary".',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  // Helper function to get the current summary
  const getSelectedDocumentSummary = () => {
    if (!selectedDocument) return null;

    const recentSummary = abSummaryPairs
      .filter(pair => pair.documentId === selectedDocument.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return recentSummary?.summaryA?.markdownSummary || null;
  };

  // Helper function to get available summaries for context
  const getAvailableSummaries = () => {
    return selectedDocument
      ? abSummaryPairs.filter(pair => pair.documentId === selectedDocument.id)
      : abSummaryPairs;
  };

  useEffect(() => {
    // Only auto-scroll if there are actual user/assistant messages (not empty or initial state)
    if (messages.length > 0 && messages.some(msg => msg.content.trim().length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    logInfo('CHAT', 'User message sent', { content: userMessage.content });

    try {
      // Check if we have any documents and embeddings
      if (documents.length === 0) {
        const noDocsResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I don\'t have any documents to chat about yet. Please upload some documents first, and I\'ll be able to answer questions about their content.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, noDocsResponse]);
        setIsTyping(false);
        return;
      }

      if (embeddings.size === 0) {
        const noEmbeddingsResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Your documents are still being processed for search. I need to generate embeddings first before I can answer questions about the content. Please wait a moment and try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, noEmbeddingsResponse]);
        setIsTyping(false);
        return;
      }

      // Create chat context from previous messages
      const context: ChatContext = {
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        documentIds: selectedDocument ? [selectedDocument.id] : documents.map(d => d.id),
        activeDocument: selectedDocument || null,
        selectedDocumentSummary: getSelectedDocumentSummary() || undefined,
        availableSummaries: getAvailableSummaries(),
        maxContextLength: 4000
      };

      // Process query with Enhanced ChatEngine for context-aware responses
      const response = await EnhancedChatEngine.processContextAwareQuery(
        userMessage.content,
        context,
        '/chat'
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);

      logInfo('CHAT', 'Assistant response generated', {
        responseLength: response.message.content.length,
        processingTime: response.responseMetrics.processingTime,
        retrievalCount: response.responseMetrics.retrievalCount
      });

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);

      logInfo('CHAT', 'Chat error occurred', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: userMessage.content
      });
    }

    onSendMessage?.(userMessage.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="glass-card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading">Chat</h2>
        <div className="status-indicator">
          <MessageCircle size={14} />
          <span>{messages.filter(m => m.role === 'user').length} questions</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin mb-6 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={32} className="mx-auto text-white text-opacity-30 mb-3" />
            <p className="text-body mb-2">No conversation yet</p>
            <p className="text-caption">
              {selectedDocument ? "Ask questions about your document" : "Select a document to start chatting"}
            </p>
          </div>
        ) : messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-accent" />
              </div>
            )}

            <div className={`chat-bubble ${message.role} max-w-[80%]`}>
              <div className="text-body leading-relaxed">
                {message.content}
              </div>
              <div className="text-caption mt-2 opacity-70">
                {formatTime(message.timestamp)}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-white bg-opacity-10 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white text-opacity-70" />
              </div>
            )}
          </div>
        ))}

        {isTyping && messages.length > 0 && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-accent" />
            </div>
            <div className="chat-bubble assistant">
              <div className="flex items-center gap-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white bg-opacity-50 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-white bg-opacity-50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-white bg-opacity-50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-caption ml-2">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedDocument ? "Ask about this document..." : "Select a document to start chatting"}
            disabled={!selectedDocument || isTyping}
            className="glass-input flex-1 focus-visible"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !selectedDocument || isTyping}
            className="accent-button px-4 py-2 focus-visible"
          >
            <Send size={16} />
          </button>
        </div>

        {!selectedDocument && (
          <p className="text-caption">
            💡 Upload and select a document to start asking questions about its content
          </p>
        )}
      </div>
    </div>
  );
};
