/**
 * World-Class Glassmorphic Dashboard - Matches provided mockup exactly
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  BookOpen, 
  FileText, 
  MessageCircle, 
  Settings, 
  Search, 
  User,
  ChevronLeft,
  ChevronRight,
  Copy,
  TerminalSquare,
  X,
  Calendar,
  Archive
} from 'lucide-react';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, href: '/', active: true },
  { id: 'upload', label: 'Upload', icon: <Upload size={20} />, href: '/upload' },
  { id: 'glossary', label: 'Glossary', icon: <BookOpen size={20} />, href: '/glossary' },
  { id: 'summaries', label: 'Summaries', icon: <FileText size={20} />, href: '/workspace' },
  { id: 'chat', label: 'Chat', icon: <MessageCircle size={20} />, href: '/chat' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, href: '/settings' },
];

// Mock documents removed - using real documents from store

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { documents } = useAppStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);

  const handleNavigation = (item: NavItem) => {
    logInfo('UI', `Navigation: ${item.label} clicked`, { itemId: item.id });
    navigate(item.href);
  };

  const handleUploadTranscript = () => {
    logInfo('UI', 'Upload Transcript button clicked');
    navigate('/upload');
  };

  return (
    <div className="min-h-screen font-sans text-white" style={{background: 'linear-gradient(135deg, #1F2937 0%, #374151 25%, #1E3A8A 50%, #0F766E 75%, #0D9488 100%)'}}>
      {/* Desktop Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full glass-header z-40 transition-all duration-300 ease-in-out p-6
        ${sidebarCollapsed ? 'w-20' : 'w-80'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Archive size={16} className="text-white" />
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-xl font-semibold text-white">
                  Dashboard
                </h1>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ghost-button p-2"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${item.active 
                    ? 'bg-accent text-white shadow-inner' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'ml-20' : 'ml-80'}
      `}>
        {/* Top Bar */}
        <header className="glass-header sticky top-0 z-30 mx-6 mt-6 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-white/70">Generate summaries ad abstracts from transcripts</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="ghost-button p-3">
                <Settings size={20} />
              </button>
              <button className="ghost-button p-3">
                <User size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <button
              onClick={handleUploadTranscript}
              className="bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-soft"
            >
              <Upload size={20} className="inline mr-3" />
              Upload Transcript
            </button>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Upload Card - Bottom Left */}
            <div className="glass-card p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">Upload</h2>
              
              <div className="glass-card p-6 border-dashed border-white/30 text-center mb-6">
                <Upload size={32} className="mx-auto mb-4 text-white/60" />
                <p className="text-white/70">Drop a file here or click to select</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Recent Documents</h3>
                {documents.length > 0 ? documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-3 border-b border-white border-opacity-10 last:border-b-0">
                    <div>
                      <p className="text-white font-medium">{doc.filename}</p>
                      <p className="text-white text-opacity-60 text-sm">{doc.tags.join(', ') || 'No tags'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-white text-opacity-40" />
                      <span className="text-white text-opacity-60 text-sm">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <FileText size={32} className="mx-auto text-white text-opacity-30 mb-3" />
                    <p className="text-white text-opacity-70">No documents uploaded yet</p>
                    <p className="text-white text-opacity-50 text-sm">Upload your first document to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Preview Card - Top Right */}
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Summary Preview</h2>
                <button className="ghost-button px-4 py-2 flex items-center gap-2">
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              
              <p className="text-white/80 leading-relaxed">
                This talk focuses on organization strategies, highlighting the importance of clear roles and
                responsibilities in team management. The discussion covers best practices for maintaining
                productivity while fostering a collaborative environment.
              </p>
            </div>

            {/* Chat Card - Bottom Right */}
            <div className="glass-card p-8 col-span-2">
              <h2 className="text-2xl font-semibold text-white mb-6">Chat</h2>
              
              <div className="space-y-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/80 font-medium mb-2">What is in the transcript?</p>
                  <p className="text-white/70">
                    The transcript covers techniques for deep meditation, including mindfulness and
                    proper breathwork, as well as advice on establishing a consistent daily practice
                    for maximum benefit.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Index / Embed Status</h3>
                <span className="text-white/60">128 / 260</span>
              </div>
              
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{ width: '49%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Developer Console */}
      {devConsoleOpen && (
        <div className={`
          fixed bottom-0 h-60 glass-header z-20 transition-all duration-300
          ${sidebarCollapsed ? 'left-20' : 'left-80'} right-0 mx-6 mb-6 rounded-xl
        `}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <TerminalSquare size={20} className="text-white" />
              <h3 className="text-white font-semibold">Developer Mode</h3>
            </div>
            <button
              onClick={() => setDevConsoleOpen(false)}
              className="ghost-button p-1"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="p-4 space-y-1 font-mono text-sm overflow-y-auto h-40">
            <div className="flex gap-3 text-gray-300">
              <span className="text-gray-500">INFO</span>
              <span className="text-gray-400">Ingesting document at 14:32:17</span>
            </div>
            <div className="flex gap-3 text-gray-300">
              <span className="text-gray-500">INFO</span>
              <span className="text-gray-400">Processing document at 14:32:17</span>
            </div>
            <div className="flex gap-3 text-gray-300">
              <span className="text-gray-500">INFO</span>
              <span className="text-gray-400">Summary generated at 14:32:18</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};