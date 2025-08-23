/**
 * MessagesDisplay - Chat messages display area
 * Extracted from ChatCentricLayout to reduce nesting complexity
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

export const MessagesDisplay: React.FC<MessagesDisplayProps> = ({
  messages,
  isProcessing
}) => {
  if (messages.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 max-h-96 overflow-y-auto">
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
  );
};
