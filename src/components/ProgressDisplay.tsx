/**
 * ProgressDisplay - Progress indicator for document processing
 * Extracted from ChatCentricLayout to reduce nesting complexity
 */

import React from 'react';
import { Clock } from 'lucide-react';

interface ProgressDisplayProps {
  showProgress: boolean;
  progress: {
    current: number;
    total: number;
    status: string;
  };
  elapsedTime: number;
}

export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  showProgress,
  progress,
  elapsedTime
}) => {
  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showProgress) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-800">Processing Document</h3>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">
              {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : '...'}
            </span>
          </div>
        </div>
        
        {progress.total > 0 && (
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{progress.status || 'Processing...'}</span>
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Elapsed: {formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
