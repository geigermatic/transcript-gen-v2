/**
 * Advanced logging system for developer observability
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 
  | 'INGEST' 
  | 'INDEX' 
  | 'EMBED' 
  | 'RETRIEVE' 
  | 'SUMMARIZE' 
  | 'CHAT' 
  | 'EXPORT' 
  | 'UI' 
  | 'SYSTEM'
  | 'AB_TEST'
  | 'STYLE_GUIDE';

export interface LogEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  duration?: number; // milliseconds
  stackTrace?: string;
}

export interface LogMetrics {
  totalEvents: number;
  eventsByLevel: Record<LogLevel, number>;
  eventsByCategory: Record<LogCategory, number>;
  averageEventDuration: number;
  recentEventRate: number; // events per second in last minute
}

export interface LogFilter {
  levels: LogLevel[];
  categories: LogCategory[];
  searchText?: string;
  startTime?: Date;
  endTime?: Date;
}

// Ring buffer for efficient log storage
class RingBuffer<T> {
  private buffer: T[] = [];
  private head = 0;
  private count = 0;

  private capacity: number;
  
  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  getAll(): T[] {
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count);
    }
    return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)];
  }

  getRecent(n: number): T[] {
    const all = this.getAll();
    return all.slice(-n);
  }

  clear(): void {
    this.buffer = [];
    this.head = 0;
    this.count = 0;
  }

  size(): number {
    return this.count;
  }
}

export class Logger {
  private static instance: Logger;
  private eventBuffer = new RingBuffer<LogEvent>(1000);
  private listeners: Set<(event: LogEvent) => void> = new Set();
  private sessionStorageKey = 'transcript-summarizer-logs';
  private isEnabled = true;

  private constructor() {
    this.loadFromSessionStorage();
    
    // Auto-save to session storage periodically
    setInterval(() => {
      this.saveToSessionStorage();
    }, 30000); // Every 30 seconds

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.saveToSessionStorage();
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    duration?: number
  ): void {
    if (!this.isEnabled) return;

    const event: LogEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      duration,
      stackTrace: level === 'ERROR' ? new Error().stack : undefined,
    };

    this.eventBuffer.push(event);
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });

    // Mirror to console in development
    if (import.meta.env.DEV) {
      const style = this.getConsoleStyle(level);
      const prefix = `%c[${level}:${category}]`;
      
      if (details || duration !== undefined) {
        console.log(prefix, style, message);
        if (details) {
          console.log('Details:', details);
        }
        if (duration !== undefined) {
          console.log(`Duration: ${duration}ms`);
        }
      } else {
        console.log(prefix, style, message);
      }
    }
  }

  debug(category: LogCategory, message: string, details?: Record<string, any>): void {
    this.log('DEBUG', category, message, details);
  }

  info(category: LogCategory, message: string, details?: Record<string, any>): void {
    this.log('INFO', category, message, details);
  }

  warn(category: LogCategory, message: string, details?: Record<string, any>): void {
    this.log('WARN', category, message, details);
  }

  error(category: LogCategory, message: string, details?: Record<string, any>): void {
    this.log('ERROR', category, message, details);
  }

  // Performance timing helpers
  time(category: LogCategory, label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(category, `${label} completed`, { duration });
    };
  }

  // Event subscription
  subscribe(listener: (event: LogEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Log retrieval and filtering
  getEvents(filter?: LogFilter): LogEvent[] {
    const events = this.eventBuffer.getAll();

    if (!filter) return events;

    return events.filter(event => {
      // Level filter
      if (filter.levels.length > 0 && !filter.levels.includes(event.level)) {
        return false;
      }

      // Category filter
      if (filter.categories.length > 0 && !filter.categories.includes(event.category)) {
        return false;
      }

      // Text search
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        if (
          !event.message.toLowerCase().includes(searchLower) &&
          !event.category.toLowerCase().includes(searchLower) &&
          !(event.details && JSON.stringify(event.details).toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      // Time range filter
      const eventTime = new Date(event.timestamp);
      if (filter.startTime && eventTime < filter.startTime) {
        return false;
      }
      if (filter.endTime && eventTime > filter.endTime) {
        return false;
      }

      return true;
    });
  }

  getMetrics(): LogMetrics {
    const events = this.eventBuffer.getAll();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentEvents = events.filter(
      event => new Date(event.timestamp).getTime() > oneMinuteAgo
    );

    const eventsByLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    const eventsByCategory: Record<LogCategory, number> = {
      INGEST: 0,
      INDEX: 0,
      EMBED: 0,
      RETRIEVE: 0,
      SUMMARIZE: 0,
      CHAT: 0,
      EXPORT: 0,
      UI: 0,
      SYSTEM: 0,
      AB_TEST: 0,
      STYLE_GUIDE: 0,
    };

    let totalDuration = 0;
    let eventsWithDuration = 0;

    events.forEach(event => {
      eventsByLevel[event.level]++;
      eventsByCategory[event.category]++;
      
      if (event.duration !== undefined) {
        totalDuration += event.duration;
        eventsWithDuration++;
      }
    });

    return {
      totalEvents: events.length,
      eventsByLevel,
      eventsByCategory,
      averageEventDuration: eventsWithDuration > 0 ? totalDuration / eventsWithDuration : 0,
      recentEventRate: recentEvents.length / 60, // events per second
    };
  }

  // Export functionality
  exportAsNDJSON(): string {
    return this.eventBuffer.getAll()
      .map(event => JSON.stringify(event))
      .join('\n');
  }

  exportAsJSON(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      events: this.eventBuffer.getAll(),
      metrics: this.getMetrics(),
    }, null, 2);
  }

  // Clear logs
  clear(): void {
    this.eventBuffer.clear();
    this.clearSessionStorage();
  }

  // Session storage management
  private saveToSessionStorage(): void {
    try {
      const recentEvents = this.eventBuffer.getRecent(200);
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to save logs to session storage:', error);
    }
  }

  private loadFromSessionStorage(): void {
    try {
      const stored = sessionStorage.getItem(this.sessionStorageKey);
      if (stored) {
        const events: LogEvent[] = JSON.parse(stored);
        events.forEach(event => this.eventBuffer.push(event));
      }
    } catch (error) {
      console.error('Failed to load logs from session storage:', error);
    }
  }

  private clearSessionStorage(): void {
    try {
      sessionStorage.removeItem(this.sessionStorageKey);
    } catch (error) {
      console.error('Failed to clear logs from session storage:', error);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      DEBUG: 'color: #6b7280; font-weight: normal;',
      INFO: 'color: #3b82f6; font-weight: bold;',
      WARN: 'color: #f59e0b; font-weight: bold;',
      ERROR: 'color: #ef4444; font-weight: bold;',
    };
    return styles[level];
  }
}

// Global logger instance
export const logger = Logger.getInstance();

// Convenience functions
export const logDebug = (category: LogCategory, message: string, details?: Record<string, any>) =>
  logger.debug(category, message, details);

export const logInfo = (category: LogCategory, message: string, details?: Record<string, any>) =>
  logger.info(category, message, details);

export const logWarn = (category: LogCategory, message: string, details?: Record<string, any>) =>
  logger.warn(category, message, details);

export const logError = (category: LogCategory, message: string, details?: Record<string, any>) =>
  logger.error(category, message, details);

export const logTime = (category: LogCategory, label: string) =>
  logger.time(category, label);
