/**
 * ChatCentricLayout - Main layout with Perplexity-inspired design
 * Features collapsible left navigation and focused chat interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, User, ChevronUp, Download, Clock } from 'lucide-react';
import { AppShell } from './AppShell';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import { ChatInterface } from './ChatInterface';
import { FileUpload } from './FileUpload';
import { useAppStore } from '../store';

export const ChatCentricLayout: React.FC = () => {
  const navigate = useNavigate();
  const { documents } = useAppStore();
  
  // Navigation state
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  
  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  // Ensure page starts at top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <AppShell>
      <div className="flex h-screen">
        {/* Left Navigation Panel - Collapsible on Hover */}
        <div 
          className={`relative transition-all duration-300 ease-in-out ${
            isNavExpanded ? 'w-80' : 'w-16'
          } bg-gray-50 border-r border-gray-200`}
          onMouseEnter={handleNavMouseEnter}
          onMouseLeave={handleNavMouseLeave}
        >
          {/* Navigation Content */}
          <div className="h-full flex flex-col">
            {/* Top Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img 
                    src={eliraIcon} 
                    alt="Elira" 
                    className="w-full h-full object-contain"
                  />
                </div>
                {isNavExpanded && (
                  <span className="text-lg font-semibold text-gray-800">Elira</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-3">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Plus className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">New Chat</span>}
              </button>
              
              <button 
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Settings</span>}
              </button>
            </div>

            {/* Library Section */}
            <div className="px-4 py-2">
              {isNavExpanded && (
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Library
                </h3>
              )}
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Plus className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Add Document</span>}
              </button>
            </div>

            {/* Documents Section - Only show when expanded */}
            {isNavExpanded && (
              <div className="px-4 py-2 flex-1">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Documents ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 mx-auto mb-2 text-gray-400">
                      📄
                    </div>
                    <p className="text-gray-500 text-sm">No documents yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Upload documents to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-3 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-800 text-sm truncate mb-1">
                              {doc.title || doc.filename}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                              <span>{formatFileSize(doc.metadata.fileSize)}</span>
                            </div>
                            {doc.metadata.wordCount && (
                              <div className="text-xs text-gray-500 mt-1">
                                {doc.metadata.wordCount} words
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Section */}
            <div className="mt-auto p-4 border-t border-gray-200 space-y-2">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <User className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Account</span>}
              </button>
              
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronUp className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Upgrade</span>}
              </button>
              
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Download className="w-5 h-5 text-gray-600" />
                {isNavExpanded && <span className="text-gray-700">Install</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Centered Content Layout */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            {/* Content Container */}
            <div className="w-full max-w-4xl space-y-8">
              {/* Logo */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4">
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                  <p className="text-lg text-gray-700 mb-4">
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
                <FileUpload onUploadComplete={(success, message, document) => {
                  if (success) {
                    console.log('Document uploaded successfully:', document);
                  } else {
                    console.error('Upload failed:', message);
                  }
                }} />
              </div>

              {/* Chat Interface - Constrained Width and Centered */}
              <div className="w-full">
                <ChatInterface />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
