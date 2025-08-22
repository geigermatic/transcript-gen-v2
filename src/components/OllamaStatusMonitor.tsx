import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { ollama } from '../lib/ollama';

export interface OllamaStatus {
  status: 'checking' | 'connected' | 'disconnected' | 'unresponsive';
  lastCheck: Date | null;
  responseTime: number | null;
  error?: string;
}

export const OllamaStatusMonitor: React.FC = () => {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    status: 'checking',
    lastCheck: null,
    responseTime: null
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkOllamaStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkOllamaStatus, 30000);
    
    return () => clearInterval(interval);
  }, [checkOllamaStatus]);

  const checkOllamaStatus = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const isAvailable = await ollama.isAvailable();
      
      if (isAvailable) {
        // Test actual response time with a simple API call
        const responseStart = Date.now();
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        const responseTime = Date.now() - responseStart;
        
        if (response.ok) {
          setOllamaStatus({
            status: 'connected',
            lastCheck: new Date(),
            responseTime
          });
        } else {
          setOllamaStatus({
            status: 'unresponsive',
            lastCheck: new Date(),
            responseTime: null,
            error: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } else {
        setOllamaStatus({
          status: 'disconnected',
          lastCheck: new Date(),
          responseTime: null,
          error: 'Cannot connect to Ollama server'
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setOllamaStatus({
        status: 'disconnected',
        lastCheck: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  const getStatusIcon = () => {
    switch (ollamaStatus.status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'unresponsive':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (ollamaStatus.status) {
      case 'connected':
        return 'Ollama Connected';
      case 'disconnected':
        return 'Ollama Disconnected';
      case 'unresponsive':
        return 'Ollama Unresponsive';
      case 'checking':
        return 'Checking Ollama...';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = () => {
    switch (ollamaStatus.status) {
      case 'connected':
        return 'bg-green-500 bg-opacity-20 border-green-400 text-green-300';
      case 'disconnected':
        return 'bg-red-500 bg-opacity-20 border-red-400 text-red-300';
      case 'unresponsive':
        return 'bg-yellow-500 bg-opacity-20 border-yellow-400 text-yellow-300';
      case 'checking':
        return 'bg-blue-500 bg-opacity-20 border-blue-400 text-blue-300';
      default:
        return 'bg-gray-500 bg-opacity-20 border-gray-400 text-gray-300';
    }
  };

  const getActionButton = () => {
    if (ollamaStatus.status === 'connected') return null;
    
    return (
      <button
        onClick={checkOllamaStatus}
        disabled={isChecking}
        className="ml-3 px-3 py-1 bg-white bg-opacity-10 hover:bg-opacity-20 rounded text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isChecking ? 'Checking...' : 'Retry'}
      </button>
    );
  };

  // Don't show anything if Ollama is connected and working
  if (ollamaStatus.status === 'connected' && ollamaStatus.responseTime && ollamaStatus.responseTime < 1000) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${getStatusColor()} border rounded-lg p-4 shadow-lg backdrop-blur-sm`}>
      <div className="flex items-start">
        {getStatusIcon()}
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{getStatusText()}</h3>
            {getActionButton()}
          </div>
          
          {ollamaStatus.error && (
            <p className="text-sm mt-1 opacity-90">{ollamaStatus.error}</p>
          )}
          
          {ollamaStatus.responseTime && (
            <p className="text-xs mt-1 opacity-75">
              Response time: {ollamaStatus.responseTime}ms
            </p>
          )}
          
          {ollamaStatus.lastCheck && (
            <p className="text-xs mt-1 opacity-75">
              Last checked: {ollamaStatus.lastCheck.toLocaleTimeString()}
            </p>
          )}
          
          {ollamaStatus.status !== 'connected' && (
            <div className="mt-3 text-xs opacity-90">
              <p className="font-medium mb-1">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Terminal</li>
                <li>Run: <code className="bg-black bg-opacity-30 px-1 rounded">ollama serve</code></li>
                <li>Wait for "llama runner started" message</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
