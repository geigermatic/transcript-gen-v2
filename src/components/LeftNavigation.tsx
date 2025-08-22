/**
 * LeftNavigation - Shared collapsible navigation component
 * Used by both ChatCentricLayout and SummaryResultsView for consistent navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';

interface LeftNavigationProps {
  isNavExpanded: boolean;
  onNavMouseEnter: () => void;
  onNavMouseLeave: () => void;
  currentDocumentId?: string; // For highlighting current document
  showNewChatButton?: boolean; // Whether to show "New Chat" or "Back to Chat"
}

export const LeftNavigation: React.FC<LeftNavigationProps> = ({
  isNavExpanded,
  onNavMouseEnter,
  onNavMouseLeave,
  currentDocumentId,
  showNewChatButton = true
}) => {
  const navigate = useNavigate();
  const { documents, clearAllData } = useAppStore();

  const handleClearAllDocuments = () => {
    if (window.confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
      clearAllData();
      // Navigate back to chat which will show the clean interface
      navigate('/');
    }
  };

  return (
    <div 
      className={`relative transition-all duration-300 ease-in-out ${
        isNavExpanded ? 'w-80' : 'w-16'
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
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-600" />
            {isNavExpanded && (
              <span className="text-gray-700">
                {showNewChatButton ? 'New Chat' : 'Back to Chat'}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
            {isNavExpanded && <span className="text-gray-700">Settings</span>}
          </button>
          
          {/* Clear All Documents Button */}
          <button 
            onClick={handleClearAllDocuments}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            {isNavExpanded && <span>Clear All Documents</span>}
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
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      doc.id === currentDocumentId 
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
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            📅
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            📊
                            {doc.text ? `${Math.round(doc.text.length / 1000)}k chars` : 'Unknown size'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
