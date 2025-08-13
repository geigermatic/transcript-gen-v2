/**
 * Advanced Developer Console with comprehensive logging and metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLogger } from '../hooks/useLogger';
import type { LogLevel, LogCategory, LogFilter } from '../lib/logger';

interface DevConsoleProps {
  isOpen: boolean;
  onToggle: () => void;
  position: 'right' | 'bottom';
  onPositionChange: (position: 'right' | 'bottom') => void;
}

export const DevConsole: React.FC<DevConsoleProps> = ({
  isOpen,
  onToggle,
  position,
  onPositionChange,
}) => {
  const {
    events,
    metrics,
    isEnabled,
    filter,
    setFilter,
    setEnabled,
    clearLogs,
    downloadLogs,
  } = useLogger();

  const [selectedTab, setSelectedTab] = useState<'timeline' | 'metrics' | 'export'>('timeline');
  const [searchText, setSearchText] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState(position === 'right' ? 400 : 300);
  const timelineRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll timeline to bottom when new events arrive
  useEffect(() => {
    if (timelineRef.current && selectedTab === 'timeline') {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [events, selectedTab]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` or Cmd+` to toggle console
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        onToggle();
      }
      
      // ESC to close when open
      if (e.key === 'Escape' && isOpen) {
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (position === 'right') {
        const newWidth = window.innerWidth - e.clientX;
        setSize(Math.max(300, Math.min(800, newWidth)));
      } else {
        const newHeight = window.innerHeight - e.clientY;
        setSize(Math.max(200, Math.min(600, newHeight)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position]);

  const handleFilterChange = (key: keyof LogFilter, value: any) => {
    setFilter({ ...filter, [key]: value });
  };

  const handleLevelToggle = (level: LogLevel) => {
    const newLevels = filter.levels.includes(level)
      ? filter.levels.filter(l => l !== level)
      : [...filter.levels, level];
    handleFilterChange('levels', newLevels);
  };

  const handleCategoryToggle = (category: LogCategory) => {
    const newCategories = filter.categories.includes(category)
      ? filter.categories.filter(c => c !== category)
      : [...filter.categories, category];
    handleFilterChange('categories', newCategories);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getLogLevelColor = (level: LogLevel) => {
    const colors = {
      DEBUG: 'text-gray-400',
      INFO: 'text-blue-400',
      WARN: 'text-yellow-400',
      ERROR: 'text-red-400',
    };
    return colors[level];
  };

  const getCategoryColor = (category: LogCategory) => {
    const colors = {
      INGEST: 'text-green-400',
      INDEX: 'text-purple-400',
      EMBED: 'text-indigo-400',
      RETRIEVE: 'text-cyan-400',
      SUMMARIZE: 'text-orange-400',
      CHAT: 'text-pink-400',
      EXPORT: 'text-emerald-400',
      UI: 'text-gray-400',
      SYSTEM: 'text-slate-400',
      AB_TEST: 'text-violet-400',
      STYLE_GUIDE: 'text-rose-400',
    };
    return colors[category];
  };

  const consoleStyle = {
    [position === 'right' ? 'width' : 'height']: `${size}px`,
  };

  const resizeHandleStyle = position === 'right' 
    ? 'left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-400'
    : 'top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-blue-400';

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 glass-button-secondary z-50"
        title="Open Developer Console (Ctrl+`)"
      >
        🔧 DevConsole
      </button>
    );
  }

  return (
    <div
      className={`fixed glass-card z-40 flex flex-col ${
        position === 'right' 
          ? 'top-6 right-6 bottom-6 border-l-0' 
          : 'bottom-6 left-6 right-6 border-t-0'
      }`}
      style={consoleStyle}
    >
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className={`absolute ${resizeHandleStyle} bg-white/10 transition-colors`}
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold">Developer Console</h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {isEnabled ? 'Logging' : 'Disabled'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPositionChange(position === 'right' ? 'bottom' : 'right')}
            className="text-gray-400 hover:text-white text-sm"
            title="Change position"
          >
            📐
          </button>
          <button
            onClick={() => setEnabled(!isEnabled)}
            className={`text-sm px-2 py-1 rounded ${
              isEnabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            {isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white"
            title="Close Console (Escape)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/20">
        {[
          { id: 'timeline', label: 'Timeline', icon: '📜' },
          { id: 'metrics', label: 'Metrics', icon: '📊' },
          { id: 'export', label: 'Export', icon: '📤' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedTab === 'timeline' && (
          <>
            {/* Timeline Filters */}
            <div className="p-3 border-b border-white/20 space-y-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search logs..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-400 text-sm"
              />

              {/* Level Filters */}
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-400 mr-2">Levels:</span>
                {(['DEBUG', 'INFO', 'WARN', 'ERROR'] as LogLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => handleLevelToggle(level)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      filter.levels.includes(level)
                        ? `${getLogLevelColor(level)} bg-current bg-opacity-20`
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-400 mr-2">Categories:</span>
                {(['INGEST', 'INDEX', 'EMBED', 'RETRIEVE', 'SUMMARIZE', 'CHAT', 'EXPORT', 'UI'] as LogCategory[]).map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      filter.categories.includes(category)
                        ? `${getCategoryColor(category)} bg-current bg-opacity-20`
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div
              ref={timelineRef}
              className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1"
            >
              {events
                .filter(event => 
                  !searchText || 
                  event.message.toLowerCase().includes(searchText.toLowerCase()) ||
                  event.category.toLowerCase().includes(searchText.toLowerCase()) ||
                  (event.details && JSON.stringify(event.details).toLowerCase().includes(searchText.toLowerCase()))
                )
                .map(event => (
                <div key={event.id} className="flex gap-2 py-1 hover:bg-white/5 rounded">
                  <span className="text-gray-500 shrink-0">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  <span className={`shrink-0 ${getLogLevelColor(event.level)}`}>
                    {event.level}
                  </span>
                  <span className={`shrink-0 ${getCategoryColor(event.category)}`}>
                    {event.category}
                  </span>
                  <span className="text-white flex-1">
                    {event.message}
                    {event.duration && (
                      <span className="text-gray-400 ml-2">({event.duration}ms)</span>
                    )}
                  </span>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No log events match the current filter
                </div>
              )}
            </div>
          </>
        )}

        {selectedTab === 'metrics' && (
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-blue-400">{metrics.totalEvents}</div>
                <div className="text-xs text-gray-400">Total Events</div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-green-400">
                  {metrics.recentEventRate.toFixed(1)}/s
                </div>
                <div className="text-xs text-gray-400">Recent Rate</div>
              </div>
            </div>

            {/* Events by Level */}
            <div>
              <h4 className="text-white font-medium mb-2">Events by Level</h4>
              <div className="space-y-2">
                {Object.entries(metrics.eventsByLevel).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className={`text-sm ${getLogLevelColor(level as LogLevel)}`}>
                      {level}
                    </span>
                    <span className="text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Events by Category */}
            <div>
              <h4 className="text-white font-medium mb-2">Events by Category</h4>
              <div className="space-y-2">
                {Object.entries(metrics.eventsByCategory)
                  .filter(([, count]) => count > 0)
                  .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className={`text-sm ${getCategoryColor(category as LogCategory)}`}>
                      {category}
                    </span>
                    <span className="text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance */}
            {metrics.averageEventDuration > 0 && (
              <div>
                <h4 className="text-white font-medium mb-2">Performance</h4>
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-lg font-bold text-orange-400">
                    {metrics.averageEventDuration.toFixed(1)}ms
                  </div>
                  <div className="text-xs text-gray-400">Average Duration</div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'export' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">Export Logs</h4>
              <p className="text-gray-400 text-sm mb-4">
                Export logs for external analysis or archival.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => downloadLogs('json')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                📄 Export as JSON
              </button>
              
              <button
                onClick={() => downloadLogs('ndjson')}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                📜 Export as NDJSON
              </button>

              <button
                onClick={clearLogs}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                🗑️ Clear All Logs
              </button>
            </div>

            <div className="text-xs text-gray-400">
              <p>• JSON: Structured format with metadata</p>
              <p>• NDJSON: Newline-delimited for streaming</p>
              <p>• Logs are auto-saved to session storage</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
