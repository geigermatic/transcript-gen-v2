/**
 * React hook for logger integration
 */

import { useState, useEffect, useCallback } from 'react';
import { logger, type LogEvent, type LogFilter, type LogMetrics, type LogCategory } from '../lib/logger';

export interface UseLoggerReturn {
  events: LogEvent[];
  metrics: LogMetrics;
  isEnabled: boolean;
  filter: LogFilter;
  setFilter: (filter: LogFilter) => void;
  setEnabled: (enabled: boolean) => void;
  clearLogs: () => void;
  exportNDJSON: () => string;
  exportJSON: () => string;
  downloadLogs: (format: 'ndjson' | 'json') => void;
}

const defaultFilter: LogFilter = {
  levels: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
  categories: ['INGEST', 'INDEX', 'EMBED', 'RETRIEVE', 'SUMMARIZE', 'CHAT', 'EXPORT', 'UI', 'SYSTEM', 'AB_TEST', 'STYLE_GUIDE'],
};

export function useLogger(): UseLoggerReturn {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [metrics, setMetrics] = useState<LogMetrics>(logger.getMetrics());
  const [isEnabled, setIsEnabledState] = useState(true);
  const [filter, setFilter] = useState<LogFilter>(defaultFilter);

  // Update events when filter changes
  useEffect(() => {
    const filteredEvents = logger.getEvents(filter);
    setEvents(filteredEvents);
  }, [filter]);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(logger.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Subscribe to new log events
  useEffect(() => {
    const unsubscribe = logger.subscribe((newEvent: LogEvent) => {
      // Check if the new event matches the current filter
      const matchesFilter = logger.getEvents(filter).some(event => event.id === newEvent.id);
      
      if (matchesFilter) {
        setEvents(prevEvents => {
          // Add new event and keep only recent ones for performance
          const newEvents = [...prevEvents, newEvent];
          return newEvents.slice(-1000); // Keep last 1000 events in UI
        });
      }

      // Always update metrics
      setMetrics(logger.getMetrics());
    });

    return unsubscribe;
  }, [filter]);

  // Initial load
  useEffect(() => {
    setEvents(logger.getEvents(filter));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    logger.setEnabled(enabled);
  }, []);

  const clearLogs = useCallback(() => {
    logger.clear();
    setEvents([]);
    setMetrics(logger.getMetrics());
  }, []);

  const exportNDJSON = useCallback(() => {
    return logger.exportAsNDJSON();
  }, []);

  const exportJSON = useCallback(() => {
    return logger.exportAsJSON();
  }, []);

  const downloadLogs = useCallback((format: 'ndjson' | 'json') => {
    const content = format === 'ndjson' ? exportNDJSON() : exportJSON();
    const mimeType = format === 'ndjson' ? 'application/x-ndjson' : 'application/json';
    const filename = `logs_${new Date().toISOString().split('T')[0]}.${format}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);

    logger.info('UI', `Logs exported as ${format.toUpperCase()}`, { filename, size: content.length });
  }, [exportNDJSON, exportJSON]);

  return {
    events,
    metrics,
    isEnabled,
    filter,
    setFilter,
    setEnabled,
    clearLogs,
    exportNDJSON,
    exportJSON,
    downloadLogs,
  };
}

// Convenience hooks for specific categories
export function useLoggerForCategory(category: LogCategory) {
  const { events, ...rest } = useLogger();
  
  const categoryEvents = events.filter(event => event.category === category);
  
  return {
    events: categoryEvents,
    ...rest,
  };
}

export function useLoggerMetrics() {
  const [metrics, setMetrics] = useState<LogMetrics>(logger.getMetrics());

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(logger.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return metrics;
}
