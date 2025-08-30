/**
 * Focused chat workspace for document Q&A
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { ChatEngine } from '../lib/chatEngine';
import { EnhancedChatEngine } from '../lib/enhancedChatEngine';
import { EmbeddingManager } from './EmbeddingManager';
import { logInfo } from '../lib/logger';
import type { ChatContext } from '../types';
import type { Document, ChatMessage, EmbeddedChunk } from '../types';

interface ChatWorkspaceProps {
  selectedDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  selectedDocument,
  onDocumentSelect
}) => {
  const { documents, getAllEmbeddings } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [embeddings, setEmbeddings] = useState<EmbeddedChunk[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



  // Load embeddings when document changes
  useEffect(() => {
    if (selectedDocument) {
      const allEmbeddings = getAllEmbeddings();
      const docEmbeddings = allEmbeddings.get(selectedDocument.id) || [];
      setEmbeddings(docEmbeddings);

      // Clear chat when switching documents
      setMessages([]);

      // Add welcome message
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi! I'm ready to answer questions about "${selectedDocument.metadata.filename}". What would you like to know?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [selectedDocument, getAllEmbeddings]);

  // Auto-scroll to bottom only when there are actual user/assistant messages
  useEffect(() => {
    if (messages.length > 0 && messages.some(msg => msg.content.trim().length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on mount - but don't scroll to it
  useEffect(() => {
    // Use a small delay to prevent scrolling and only focus if user hasn't interacted
    const timer = setTimeout(() => {
      if (inputRef.current && document.activeElement === document.body) {
        inputRef.current.focus({ preventScroll: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedDocument || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const context: ChatContext = {
        messages: messages,
        documentIds: [selectedDocument.id],
        activeDocument: selectedDocument,
        selectedDocumentSummary: undefined,
        maxContextLength: 4000
      };

      // Use enhanced chat engine for context-aware responses
      const response = await EnhancedChatEngine.processContextAwareQuery(
        userMessage.content,
        context,
        '/workspace'
      );

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date().toISOString(),
        sources: response.sources
      };

      setMessages(prev => [...prev, assistantMessage]);

      logInfo('CHAT', 'Chat response generated', {
        documentId: selectedDocument.id,
        query: userMessage.content,
        sourcesCount: response.sources.length
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your question. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What are the main takeaways?",
    "Summarize the key techniques mentioned",
    "What action items are recommended?",
    "Are there any important quotes?",
    "What's the target audience for this content?"
  ];

  if (!selectedDocument) {
    return (
      <div className="text-center py-16">
        <div className="glass-panel p-8 max-w-2xl mx-auto">
          <h2 className="text-hierarchy-h2 mb-4">No Document Selected</h2>
          <p className="text-body mb-6">
            Choose a document to start asking questions about its content.
          </p>

          {documents.length === 0 ? (
            <p className="text-gray-400">
              Upload your first document in the Upload tab to get started.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-400 mb-4">Select a document:</p>
              {documents.slice(0, 3).map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentSelect(doc)}
                  className="w-full glass-button text-left p-4"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-white font-medium">{doc.metadata.filename}</p>
                      <p className="text-gray-400 text-sm">
                        {doc.metadata.wordCount?.toLocaleString()} words
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-hierarchy-h1 mb-2">AI Chat</h1>
            <p className="text-body">
              Ask questions about your document content
            </p>
          </div>
          <EmbeddingManager document={selectedDocument} />
        </div>

        {/* Document info */}
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-400">
          <span>📄 {selectedDocument.metadata.filename}</span>
          <span>🔗 {embeddings.length} chunks indexed</span>
          <span>💬 {messages.filter(m => m.role === 'user').length} questions asked</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="glass-panel flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-4 rounded-lg ${message.role === 'user'
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
                    : 'glass-panel'
                    }`}
                >
                  <div className="text-sm text-gray-300 mb-1">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                    <span className="ml-2 text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-white whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="text-xs text-gray-400 mb-2">
                        Sources ({message.sources.length}):
                      </div>
                      <div className="space-y-1">
                        {message.sources.slice(0, 3).map((source, idx) => (
                          <div key={idx} className="text-xs text-gray-300 bg-gray-700/50 p-2 rounded">
                            "{source.chunk.text.substring(0, 100)}..."
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="glass-panel p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-gray-400 text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4">
              <p className="text-gray-400 text-sm mb-3">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(question)}
                    className="glass-button-secondary text-xs"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-6 border-t border-gray-700">
            <div className="flex space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the document..."
                disabled={isTyping || embeddings.length === 0}
                className="flex-1 glass-input"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping || embeddings.length === 0}
                className="glass-button-primary flex items-center space-x-2"
              >
                <span>💬</span>
                <span>Send</span>
              </button>
            </div>

            {embeddings.length === 0 && (
              <p className="text-yellow-400 text-xs mt-2">
                ⚠️ Generate embeddings first to enable chat functionality
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
