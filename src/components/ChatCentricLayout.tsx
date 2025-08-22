/**
 * ChatCentricLayout - Main layout with Perplexity-inspired design
 * Features collapsible left navigation and focused chat interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, User, ChevronUp, Download } from 'lucide-react';
import { AppShell } from './AppShell';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';
import { ChatInterface } from './ChatInterface';
import { DocumentSidebar } from './DocumentSidebar';
import { useAppStore } from '../store';

export const ChatCentricLayout: React.FC = () => {
  const navigate = useNavigate();
  const { documents } = useAppStore();
  
  // Navigation state
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  
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
            isNavExpanded ? 'w-64' : 'w-16'
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

            {/* Recent Queries - Only show when expanded */}
            {isNavExpanded && documents.length > 0 && (
              <div className="px-4 py-2 flex-1">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Recent Documents
                </h3>
                <div className="space-y-1">
                  {documents.slice(0, 5).map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-2 rounded text-sm text-gray-600 hover:bg-gray-100 cursor-pointer truncate"
                      title={doc.title}
                    >
                      {doc.title}
                    </div>
                  ))}
                </div>
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

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Top Bar */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src={eliraIcon} 
                  alt="Elira" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-800">Elira</h1>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex">
            {/* Chat Interface - Main Area */}
            <div className="flex-1 flex flex-col">
              <ChatInterface />
            </div>

            {/* Document Sidebar - Right Panel */}
            <div className="w-80 border-l border-gray-200">
              <DocumentSidebar />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
