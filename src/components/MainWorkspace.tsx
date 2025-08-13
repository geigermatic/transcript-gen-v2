/**
 * Main single-view workspace with tabbed interface
 * Priority: Upload → Summarize → Chat
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { FileUpload } from './FileUpload';
import { DocumentLibrary } from './DocumentLibrary';
import { SummaryWorkspace } from './SummaryWorkspace';
import { ChatWorkspace } from './ChatWorkspace';
import { SettingsPanel } from './SettingsPanel';
import { DevConsole } from './DevConsole';
import { OnboardingModal } from './OnboardingModal';
import { useDevConsole } from '../hooks/useDevConsole';
import { logInfo } from '../lib/logger';
import type { Document } from '../types';

type TabType = 'upload' | 'summarize' | 'chat' | 'library' | 'settings';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
  description: string;
  isPrimary?: boolean;
}

const tabs: Tab[] = [
  {
    id: 'upload',
    label: 'Upload',
    icon: '📄',
    description: 'Add documents to analyze',
    isPrimary: true
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: '✨',
    description: 'Generate AI summaries',
    isPrimary: true
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: '💬',
    description: 'Ask questions about content',
    isPrimary: true
  },
  {
    id: 'library',
    label: 'Library',
    icon: '📚',
    description: 'Browse your documents'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'Customize your experience'
  }
];

export const MainWorkspace: React.FC = () => {
  const { documents, isDarkMode, toggleDarkMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const devConsole = useDevConsole();

  // Auto-select first document if none selected
  useEffect(() => {
    if (!selectedDocument && documents.length > 0) {
      setSelectedDocument(documents[0]);
    }
  }, [documents, selectedDocument]);

  // Smart tab switching based on workflow
  const handleDocumentUploaded = (document: Document) => {
    setSelectedDocument(document);
    setActiveTab('summarize');
    logInfo('UI', 'Workflow: Document uploaded, switched to summarize tab', {
      documentId: document.id,
      filename: document.metadata.filename
    });
  };

  const handleSummaryGenerated = () => {
    setActiveTab('chat');
    logInfo('UI', 'Workflow: Summary generated, switched to chat tab');
  };

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    logInfo('UI', `Tab switched to: ${tabId}`);
  };

  const getTabClassName = (tab: Tab) => {
    const baseClass = "tab-button flex items-center space-x-2";
    const activeClass = activeTab === tab.id ? "active" : "";
    const primaryClass = tab.isPrimary ? "font-semibold" : "";
    return `${baseClass} ${activeClass} ${primaryClass}`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-hierarchy-h1 mb-2">Upload Documents</h1>
              <p className="text-body text-lg">
                Start by uploading a document to analyze with AI
              </p>
            </div>
            <FileUpload onUploadComplete={(success, message, document) => {
              if (success && document) {
                handleDocumentUploaded(document);
              }
            }} />
            {documents.length > 0 && (
              <div className="glass-panel p-6">
                <h2 className="text-hierarchy-h3 mb-4">Recent Documents</h2>
                <div className="grid gap-3">
                  {documents.slice(0, 3).map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setActiveTab('summarize');
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-white font-medium">{doc.metadata.filename}</p>
                          <p className="text-gray-400 text-sm">
                            {doc.metadata.wordCount?.toLocaleString()} words
                          </p>
                        </div>
                      </div>
                      <button className="glass-button-primary text-sm">
                        Analyze →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'summarize':
        return (
          <SummaryWorkspace 
            selectedDocument={selectedDocument}
            onDocumentSelect={setSelectedDocument}
            onSummaryGenerated={handleSummaryGenerated}
          />
        );

      case 'chat':
        return (
          <ChatWorkspace 
            selectedDocument={selectedDocument}
            onDocumentSelect={setSelectedDocument}
          />
        );

      case 'library':
        return (
          <DocumentLibrary 
            onDocumentSelect={(doc) => {
              setSelectedDocument(doc);
              setActiveTab('summarize');
            }}
          />
        );

      case 'settings':
        return <SettingsPanel />;

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="glass-panel-header sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-hierarchy-h3">Transcript Summarizer</h1>
            <div className="hidden md:flex items-center space-x-1 text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Local AI • Privacy First</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Document selector */}
            {documents.length > 0 && (
              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Document:</span>
                <select
                  value={selectedDocument?.id || ''}
                  onChange={(e) => {
                    const doc = documents.find(d => d.id === e.target.value);
                    if (doc) setSelectedDocument(doc);
                  }}
                  className="glass-panel px-3 py-1 text-sm text-white bg-transparent border-0 outline-none"
                >
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id} className="bg-gray-800">
                      {doc.metadata.filename}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              className="glass-button-secondary"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Developer console toggle */}
            {devConsole.isVisible && (
              <button
                onClick={devConsole.toggle}
                className="glass-button-secondary"
                title="Toggle Developer Console"
              >
                🔧
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-container px-6">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={getTabClassName(tab)}
                title={tab.description}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.isPrimary && (
                  <span className="hidden lg:inline text-xs text-gray-400">
                    • {tab.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {/* Floating Developer Console */}
      {devConsole.isVisible && (
        <DevConsole
          isOpen={devConsole.isOpen}
          onToggle={devConsole.toggle}
          position={devConsole.position}
          onPositionChange={devConsole.changePosition}
        />
      )}

      {/* Onboarding */}
      <OnboardingModal />

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 glass-panel-header px-6 py-2 z-20">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>{documents.length} documents</span>
            {selectedDocument && (
              <span>• {selectedDocument.metadata.wordCount?.toLocaleString()} words</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>Local AI Ready</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
