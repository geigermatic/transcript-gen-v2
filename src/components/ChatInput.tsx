/**
 * ChatInput - Chat input field component
 * Extracted from ChatCentricLayout to reduce nesting complexity
 */

import React from 'react';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isProcessing: boolean;
  isHydrated: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isProcessing,
  isHydrated,
  placeholder = "Add a document to get started..."
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative">
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3">
          {/* Input Field */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
          />

          {/* Send Button */}
          <button 
            onClick={onSendMessage}
            disabled={!inputValue.trim() || isProcessing || !isHydrated}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!isHydrated ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
