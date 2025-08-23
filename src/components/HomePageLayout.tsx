/**
 * HomePageLayout - Main content area for the home page
 * Extracted from ChatCentricLayout to reduce nesting complexity
 */

import React from 'react';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import { FileUpload } from './FileUpload';

interface HomePageLayoutProps {
  children?: React.ReactNode;
  onUploadComplete: (success: boolean, message: string, document?: any) => void;
}

export const HomePageLayout: React.FC<HomePageLayoutProps> = ({
  children,
  onUploadComplete
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
              {/* Content Container */}
        <div className="w-full max-w-4xl space-y-8">
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              <img 
                src={eliraIcon} 
                alt="Elira" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-semibold text-gray-800">Elira</h1>
          </div>

          {/* Tag Line and Instructions */}
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 space-y-4">
              <p className="text-lg text-gray-700">
                Transform your transcripts into powerful insights with AI-powered summarization, 
                analysis, and conversational Q&A using your local AI instance.
              </p>
              <p className="text-gray-600">
                Upload documents and start chatting with your AI assistant.
              </p>
            </div>
          </div>

          {/* Drop Zone */}
          <div className="text-center">
            <FileUpload onUploadComplete={onUploadComplete} />
          </div>

          {/* Dynamic Content Area */}
          {children}
        </div>
    </div>
  );
};
