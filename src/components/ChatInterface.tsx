/**
 * ChatInterface - Main chat area with Perplexity-inspired design
 * Features action chips, multi-modal input, and integrated document handling
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText } from 'lucide-react';

import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

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


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with empty messages
  useEffect(() => {
    // Start with empty messages - no welcome message
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);



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
    }
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
      {/* Messages Area - Only show when there are messages */}
      {messages.length > 0 && (
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
      )}



      {/* Input Area */}
      <div className="border-t border-gray-200 p-6">
        <div className="flex items-center gap-3">
          {/* Main Input Field */}
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything or @mention a document..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>


      </div>
    </div>
  );
};
