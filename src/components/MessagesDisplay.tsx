/**
 * MessagesDisplay - Chat messages display area with ChatGPT-like scroll behavior
 * Extracted from ChatCentricLayout to reduce nesting complexity
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import { ProcessingIndicator } from './ProcessingIndicator';
import { ChevronDown, MessageSquare } from 'lucide-react';

interface ChatMessage {
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
}

interface MessagesDisplayProps {
  messages: ChatMessage[];
  isProcessing: boolean;
}

const BOTTOM_THRESHOLD = 24; // 24px from bottom = "at bottom"

export const MessagesDisplay: React.FC<MessagesDisplayProps> = ({
  messages,
  isProcessing
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [showNewDivider, setShowNewDivider] = useState<string | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Check if user is at bottom
  const checkIfAtBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    
    const scrollElement = scrollContainerRef.current;
    const { scrollHeight, scrollTop, clientHeight } = scrollElement;
    const atBottom = scrollHeight - (scrollTop + clientHeight) <= BOTTOM_THRESHOLD;
    return atBottom;
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    
    if (atBottom) {
      setShowJumpToLatest(false);
      setShowNewDivider(null);
    }
  }, [checkIfAtBottom]);

  // Jump to latest messages
  const jumpToLatest = useCallback(() => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
        align: 'end'
      });
    }
    setShowJumpToLatest(false);
    setShowNewDivider(null);
  }, [messages.length]);

  // Auto-scroll to bottom when new content arrives and user is at bottom
  useEffect(() => {
    if (messages.length > lastMessageCount) {
      const wasAtBottom = isAtBottom;
      const atBottom = checkIfAtBottom();
      
      if (atBottom || wasAtBottom) {
        // Auto-scroll to bottom
        setTimeout(() => {
          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index: messages.length - 1,
              behavior: 'smooth',
              align: 'end'
            });
          }
        }, 100);
        setShowJumpToLatest(false);
        setShowNewDivider(null);
      } else {
        // User has scrolled up, show jump to latest
        setShowJumpToLatest(true);
        if (messages.length > 0) {
          setShowNewDivider(messages[messages.length - 1].id);
        }
      }
      
      setLastMessageCount(messages.length);
    }
  }, [messages.length, lastMessageCount, isAtBottom, checkIfAtBottom]);

  // Render individual message
  const renderMessage = useCallback((message: ChatMessage) => (
    <div
      key={message.id}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      role="listitem"
      aria-label={`${message.role === 'user' ? 'User' : 'Assistant'} message`}
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
  ), []);

  // Render new messages divider
  const renderNewDivider = useCallback(() => {
    if (!showNewDivider) return null;
    
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
          <MessageSquare size={14} />
          New messages
        </div>
      </div>
    );
  }, [showNewDivider]);

  if (messages.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      {/* New Messages Divider */}
      {renderNewDivider()}
      
      {/* Messages List with Virtualization */}
      <div className="max-h-96" ref={scrollContainerRef}>
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          itemContent={(_index, message) => renderMessage(message)}
          onScroll={handleScroll}
          followOutput={isAtBottom}
          alignToBottom={true}
          initialTopMostItemIndex={messages.length - 1}
          role="log"
          aria-live={isAtBottom ? 'polite' : 'off'}
          className="chat-scrollbar"
        />
      </div>
      
      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mt-4">
          <ProcessingIndicator isProcessing={isProcessing} />
        </div>
      )}
      
      {/* Jump to Latest Button */}
      {showJumpToLatest && (
        <button
          onClick={jumpToLatest}
          className="fixed bottom-24 right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-105 z-50"
          aria-label="Jump to latest messages"
        >
          <ChevronDown size={20} />
        </button>
      )}
    </div>
  );
};
