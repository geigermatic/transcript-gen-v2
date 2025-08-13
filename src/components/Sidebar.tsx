/**
 * Sidebar - Glass navigation sidebar
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  BookOpen, 
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { logInfo } from '../lib/logger';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, href: '/' },
  { id: 'upload', label: 'Upload', icon: <Upload size={20} />, href: '/upload' },
  { id: 'glossary', label: 'Glossary', icon: <BookOpen size={20} />, href: '/glossary' },
  { id: 'library', label: 'Library', icon: <FileText size={20} />, href: '/library' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, href: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (item: NavItem) => {
    logInfo('UI', `Navigation: ${item.label} clicked`, { itemId: item.id });
    navigate(item.href);
  };

  return (
    <aside 
      className={`fixed top-6 left-6 bottom-6 z-40 transition-all duration-300 ease-out ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      <div className="glass-header h-full p-4 flex flex-col">
        {/* Toggle button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={onToggle}
            className="ghost-button p-2"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`nav-item w-full ${isActive ? 'active' : ''} focus-visible`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        {!collapsed && (
          <div className="mt-auto pt-6 space-y-2 border-t border-white border-opacity-10">
            <div className="status-indicator">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Local mode</span>
            </div>
            <div className="text-caption">
              Ollama: Connected
            </div>
            <div className="text-caption">
              Model: llama3.1:8b‑instruct‑q4_K_M
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
