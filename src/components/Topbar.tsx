/**
 * Topbar - Glass navigation header
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, Sun, Moon, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';
import eliraLeafIcon from '../assets/icons/elira_leaf_512.png';

interface TopbarProps {
  // sidebarCollapsed prop removed for beta version
}

export const Topbar: React.FC<TopbarProps> = () => {
  const { isDarkMode, toggleDarkMode, clearAllData, documents } = useAppStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Debug icon import
  console.log('Topbar - eliraLeafIcon:', eliraLeafIcon);

  const handleClearAllData = () => {
    const confirmClear = window.confirm(
      `⚠️ Clear All Data?\n\nThis will permanently delete:\n• ${documents.length} uploaded documents\n• All summaries\n• Chat history\n• Embeddings\n• Processing logs\n\nThis action cannot be undone. Continue?`
    );
    
    if (confirmClear) {
      clearAllData();
      logInfo('UI', 'All data cleared by user');
      
      // Show success message
      setTimeout(() => {
        alert('✅ All data cleared successfully! You can now start fresh.');
      }, 100);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when at top of page
      if (currentScrollY < 10) {
        setIsVisible(true);
      } 
      // Hide header when scrolling down, show when scrolling up
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Auto-focus search input when component mounts (home page navigation)
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <header 
      className={`fixed left-0 right-0 z-50 p-6 transition-all duration-300 ease-out ${
        isVisible ? 'top-0' : '-top-32'
      }`}
    >
      <div className={`glass-header px-6 py-4 ${isVisible ? 'shadow-lg' : ''}`}>
        <div className="flex items-center justify-between">
          {/* Left side - App branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={eliraLeafIcon} 
                alt="Elira Leaf Icon" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Elira
              </h1>
              <p className="text-xs text-white text-opacity-60">
                Local AI • Privacy First
              </p>
            </div>
          </div>

          {/* Center - Search (placeholder for now) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-opacity-50" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search transcripts..."
                className="glass-input w-full py-2"
                style={{ paddingLeft: '3.5rem', paddingRight: '1rem' }}
                readOnly
              />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Clear All Data button - only show if there are documents */}
            {documents.length > 0 && (
              <button
                onClick={handleClearAllData}
                className="ghost-button p-3 hover:bg-red-500 hover:bg-opacity-20"
                title="Clear all data"
              >
                <Trash2 size={18} />
              </button>
            )}
            
            <button
              onClick={toggleDarkMode}
              className="ghost-button p-3"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="ghost-button p-3" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
