/**
 * LeftNavigation - Shared collapsible navigation component
 * Used by both ChatCentricLayout and SummaryResultsView for consistent navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Trash2, Clock, Cpu, Terminal, FileText, TestTube } from 'lucide-react';
import { useAppStore } from '../store';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';

interface LeftNavigationProps {
  isNavExpanded: boolean;
  onNavMouseEnter: () => void;
  onNavMouseLeave: () => void;
  currentDocumentId?: string; // For highlighting current document
  showNewChatButton?: boolean; // Whether to show "New Chat" or "Back to Chat"
  onNewChat?: () => void; // Callback for new chat functionality
}

export const LeftNavigation: React.FC<LeftNavigationProps> = ({
  isNavExpanded,
  onNavMouseEnter,
  onNavMouseLeave,
  currentDocumentId,
  showNewChatButton = true,
  onNewChat
}) => {
  const navigate = useNavigate();
  const { documents, clearAllData, abSummaryPairs } = useAppStore();

  // Helper function to format processing time
  const formatProcessingTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper function to get processing time for a document
  const getDocumentProcessingTime = (documentId: string): number | null => {
    const summaryPair = abSummaryPairs.find(pair => pair.documentId === documentId);
    console.log('Looking for processing time for doc:', documentId, 'Found summary pair:', summaryPair);
    if (summaryPair?.summaryA?.processingStats?.processingTime) {
      return summaryPair.summaryA.processingStats.processingTime;
    }
    return null;
  };

  // Helper function to get model used for a document
  const getDocumentModel = (documentId: string): string | null => {
    const summaryPair = abSummaryPairs.find(pair => pair.documentId === documentId);
    console.log('Looking for model for doc:', documentId, 'Found summary pair:', summaryPair);
    if (summaryPair?.summaryA?.processingStats?.modelUsed) {
      return summaryPair.summaryA.processingStats.modelUsed;
    }
    return null;
  };

  const handleClearAllDocuments = () => {
    if (window.confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
      clearAllData();
      // Navigate back to chat which will show the clean interface
      navigate('/');
    }
  };

  return (
    <div
      className={`relative transition-all duration-300 ease-in-out ${isNavExpanded ? 'w-80' : 'w-16'
        } bg-gray-50 border-r border-gray-200`}
      onMouseEnter={onNavMouseEnter}
      onMouseLeave={onNavMouseLeave}
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
          <button
            onClick={() => {
              if (onNewChat && showNewChatButton) {
                onNewChat();
              } else {
                navigate('/');
              }
            }}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${!isNavExpanded ? 'justify-center' : ''
              }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <Plus className="w-6 h-6 text-gray-600" />
            </div>
            {isNavExpanded && (
              <span className="text-gray-700 ml-3">
                {showNewChatButton ? 'New Chat' : 'Back to Chat'}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/tests')}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${!isNavExpanded ? 'justify-center' : ''
              }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <TestTube className="w-6 h-6 text-gray-600" />
            </div>
            {isNavExpanded && <span className="text-gray-700 ml-3">TDD Tests</span>}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${!isNavExpanded ? 'justify-center' : ''
              }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            {isNavExpanded && <span className="text-gray-700 ml-3">Settings</span>}
          </button>

          {/* Clear All Documents Button */}
          <button
            onClick={handleClearAllDocuments}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors ${!isNavExpanded ? 'justify-center' : ''
              }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            {isNavExpanded && <span className="ml-3">Clear All Documents</span>}
          </button>

          {/* Documents List Indicator */}
          <button
            className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${!isNavExpanded ? 'justify-center' : ''
              }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
            {isNavExpanded && <span className="ml-3 text-gray-700">Documents ({documents.length})</span>}
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
                {documents
                  .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${doc.id === currentDocumentId
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      onClick={() => {
                        // Navigate to summary view with document data
                        navigate('/summary/' + doc.id, {
                          state: { document: doc }
                        });
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-800 text-sm truncate mb-1">
                            {doc.title || doc.filename}
                          </h4>
                          {/* Row 1: Basic metadata */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                            <span>
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                            <span>
                              {doc.text ? `${Math.round(doc.text.length / 1000)}k chars` : 'Unknown size'}
                            </span>
                          </div>

                          {/* Row 2: Processing metadata (only show if available) */}
                          {(getDocumentProcessingTime(doc.id) || getDocumentModel(doc.id)) && (
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {/* Processing Time */}
                              {getDocumentProcessingTime(doc.id) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatProcessingTime(getDocumentProcessingTime(doc.id)!)}
                                </span>
                              )}
                              {/* Model Used */}
                              {getDocumentModel(doc.id) && (
                                <span className="flex items-center gap-1">
                                  <Cpu className="w-3 h-3" />
                                  {getDocumentModel(doc.id)}
                                </span>
                              )}
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

        {/* Bottom Section - Dev Console Link */}
        <div className="mt-auto p-4">
          <button
            onClick={() => navigate('/dev-console')}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${!isNavExpanded ? 'justify-center' : ''
              }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <Terminal className="w-6 h-6 text-gray-600" />
            </div>
            {isNavExpanded && <span className="text-gray-700 ml-3">Dev Console</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
