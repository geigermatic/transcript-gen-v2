import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { ChatEngine } from '../lib/chatEngine';
import { ollama } from '../lib/ollama';
import type { ChatMessage, ChatResponse, ChatContext } from '../types';

export function ChatInterface() {
  const { styleGuide, addChatMessage, chatMessages, clearChat, getAllEmbeddings } = useAppStore();
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allEmbeddings = getAllEmbeddings();
  const hasEmbeddings = allEmbeddings.length > 0;

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  useEffect(() => {
    // Only auto-scroll if there are messages to avoid scrolling on initial page load
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  const checkOllamaStatus = async () => {
    try {
      const available = await ollama.isAvailable();
      setOllamaAvailable(available);
    } catch (error) {
      setOllamaAvailable(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;
    
    if (!ollamaAvailable) {
      alert('Ollama is not available. Please ensure Ollama is running.');
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    addChatMessage(userMessage);
    setInputValue('');
    setIsProcessing(true);

    try {
      const context: ChatContext = {
        messages: [...chatMessages, userMessage],
        maxContextLength: 4000,
      };

      const response: ChatResponse = await ChatEngine.processQuery(
        userMessage.content,
        context,
        styleGuide
      );

      addChatMessage(response.message);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(errorMessage);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div
            className={`glass-panel p-4 ${
              isUser 
                ? 'bg-blue-500 bg-opacity-20 ml-4' 
                : 'bg-white bg-opacity-10 mr-4'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`font-medium text-sm ${
                isUser ? 'text-blue-300' : 'text-green-300'
              }`}>
                {isUser ? 'You' : 'Assistant'}
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            
            <div className="text-gray-200 whitespace-pre-wrap">
              {message.content}
            </div>
            
            {/* Show sources for assistant messages */}
            {!isUser && message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-gray-400 mb-2">Sources ({message.sources.length}):</p>
                <div className="space-y-1">
                  {message.sources.slice(0, 3).map((source, index) => (
                    <div key={source.chunk.id} className="text-xs">
                      <span className="text-gray-400">
                        Source {index + 1} ({(source.similarity * 100).toFixed(1)}% match):
                      </span>
                      <p className="text-gray-300 truncate ml-2">
                        {source.chunk.text.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500 bg-opacity-20 order-2' : 'bg-green-500 bg-opacity-20 order-1'
        }`}>
          <span className="text-sm">
            {isUser ? '👤' : '🤖'}
          </span>
        </div>
      </div>
    );
  };

  const renderWelcomeMessage = () => (
    <div className="text-center py-8">
      <div className="glass-panel p-6 max-w-md mx-auto">
        <div className="text-4xl mb-4">💬</div>
        <h3 className="text-white font-semibold mb-2">Welcome to AI Chat</h3>
        <p className="text-gray-300 text-sm mb-4">
          Ask questions about your uploaded documents. I'll search through them to provide grounded answers.
        </p>
        
        {!hasEmbeddings ? (
          <div className="bg-yellow-500 bg-opacity-20 border border-yellow-400 rounded-lg p-3 mb-4">
            <p className="text-yellow-300 text-sm">
              ⚠️ No document embeddings found. Upload documents and generate embeddings first.
            </p>
          </div>
        ) : (
          <div className="bg-green-500 bg-opacity-20 border border-green-400 rounded-lg p-3 mb-4">
            <p className="text-green-300 text-sm">
              ✅ Ready to chat! I have access to {allEmbeddings.length} chunks from your documents.
            </p>
          </div>
        )}

        {ollamaAvailable === false && (
          <div className="bg-red-500 bg-opacity-20 border border-red-400 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              ❌ Ollama not available. Please ensure Ollama is running.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-panel p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">AI Chat</h2>
            <p className="text-gray-400 text-sm">
              Ask questions about your documents for grounded responses
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {ollamaAvailable === null ? (
                '⏳ Checking Ollama...'
              ) : ollamaAvailable ? (
                '✅ Connected'
              ) : (
                '❌ Ollama Unavailable'
              )}
            </div>
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                className="glass-button text-white text-sm hover:bg-red-500 hover:bg-opacity-20"
              >
                🗑️ Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4">
        <div className="space-y-4">
          {chatMessages.length === 0 ? (
            renderWelcomeMessage()
          ) : (
            <>
              {chatMessages.map(renderMessage)}
              {isProcessing && (
                <div className="flex justify-start mb-4">
                  <div className="max-w-[80%] order-2">
                    <div className="glass-panel p-4 bg-white bg-opacity-10 mr-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <span className="text-gray-300 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center order-1">
                    <span className="text-sm">🤖</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="glass-panel p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !hasEmbeddings 
                ? "Upload documents and generate embeddings first..."
                : !ollamaAvailable 
                ? "Ollama not available..."
                : "Ask a question about your documents..."
            }
            className="glass-input flex-1"
            disabled={isProcessing || !hasEmbeddings || !ollamaAvailable}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing || !hasEmbeddings || !ollamaAvailable}
            className="glass-button text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 hover:bg-opacity-20"
          >
            {isProcessing ? '⏳' : '📤'}
          </button>
        </form>
        
        {hasEmbeddings && (
          <p className="text-xs text-gray-400 mt-2">
            Press Enter to send • Shift+Enter for new line • I'll search {allEmbeddings.length} chunks for answers
          </p>
        )}
      </div>
    </div>
  );
}
