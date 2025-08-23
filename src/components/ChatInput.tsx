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
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 border border-gray-300 rounded-2xl bg-white">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 border-none outline-none focus:ring-0 text-gray-800 placeholder-gray-500"
        />
        <button 
          onClick={onSendMessage}
          disabled={!inputValue.trim() || isProcessing || !isHydrated}
          className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!isHydrated ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
