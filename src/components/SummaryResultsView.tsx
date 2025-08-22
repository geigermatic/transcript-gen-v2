/**
 * SummaryResultsView - Dedicated view for displaying document summaries with tabs
 * Similar to Perplexity.ai's query results page layout
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Grid3X3, HelpCircle, Globe, Paperclip, Mic, Send, Settings, Plus } from 'lucide-react';
import { useAppStore } from '../store';
import eliraIcon from '../assets/icons/elira-leaf-extract.svg';

export const SummaryResultsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { documents } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'stylized' | 'raw'>('stylized');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [document, setDocument] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  useEffect(() => {
    // Get document and summary data from navigation state
    if (location.state?.document && location.state?.summary) {
      setDocument(location.state.document);
      setSummary(location.state.summary);
    } else {
      // Fallback: redirect back to chat if no data
      navigate('/');
    }
  }, [location.state, navigate]);

  const handleBack = () => {
    navigate('/');
  };

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Summary Available</h2>
          <p className="text-gray-500">The document summary could not be generated.</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderSummaryContent = () => {
    if (activeTab === 'stylized') {
      return summary.styledSummary || 'No stylized summary available';
    } else {
      return summary.rawSummary || 'No raw summary available';
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuery.trim()) {
      // TODO: Handle follow-up query - could navigate back to chat or process here
      console.log('Follow-up query:', followUpQuery);
      setFollowUpQuery('');
    }
  };

  return (
    <div className="flex h-screen bg-white">
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
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
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
                        doc.id === document?.id 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => {
                        if (doc.id !== document?.id) {
                          navigate(`/summary/${doc.id}`, { 
                            state: { 
                              document: doc, 
                              summary: null // Will need to fetch summary for other docs
                            } 
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm truncate">
                          {doc.title || doc.filename}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Chat</span>
              </button>
              <div className="flex items-center gap-3">
                {/* Placeholder icons as shown in the layout */}
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
        {/* Document Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {document.title || document.filename || 'Document Summary'}
          </h1>
        </div>

        {/* Summary Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('stylized')}
              className={`px-6 py-3 text-sm font-medium rounded-md transition-all ${
                activeTab === 'stylized'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Styled Summary
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-6 py-3 text-sm font-medium rounded-md transition-all ${
                activeTab === 'raw'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Raw Summary
            </button>
          </div>
        </div>

        {/* Summary Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8 min-h-96">
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-800 whitespace-pre-wrap">
              {renderSummaryContent()}
            </div>
          </div>
        </div>

        {/* Follow-up Input */}
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleFollowUpSubmit} className="relative">
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3">
              {/* Left Icons */}
              <div className="flex items-center gap-3 mr-3">
                <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Search size={18} />
                </button>
                <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Grid3X3 size={18} />
                </button>
                <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <HelpCircle size={18} />
                </button>
              </div>

              {/* Input Field */}
              <input
                type="text"
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                placeholder="Ask a follow-up..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
              />

              {/* Right Icons */}
              <div className="flex items-center gap-3 ml-3">
                <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Globe size={18} />
                </button>
                <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Paperclip size={18} />
                </button>
                <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Mic size={18} />
                </button>
                <button
                  type="submit"
                  disabled={!followUpQuery.trim()}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};
