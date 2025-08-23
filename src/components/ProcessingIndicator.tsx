/**
 * ProcessingIndicator - Loading indicator for chat processing
 * Extracted from MessagesDisplay to improve reusability and reduce nesting
 */

import React from 'react';

interface ProcessingIndicatorProps {
  isProcessing: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  isProcessing
}) => {
  if (!isProcessing) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span className="text-sm">Processing...</span>
        </div>
      </div>
    </div>
  );
};
