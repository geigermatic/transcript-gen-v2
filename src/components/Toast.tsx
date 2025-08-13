/**
 * Toast - Glass notification component with useToast hook
 */

import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: 'text-green-400 border-green-400/30 bg-green-400/10',
  error: 'text-red-400 border-red-400/30 bg-red-400/10',
  warning: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  info: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(id), 300); // Wait for exit animation
  };

  const Icon = toastIcons[type];

  return (
    <div
      className={`
        toast ${toastColors[type]} transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className="flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white">{title}</h4>
          {message && (
            <p className="text-sm text-white/80 mt-1">{message}</p>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ghost-button p-1 ml-2"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts?: ToastProps[];
  messages?: ToastMessage[];
  onDismiss?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts = [], 
  messages = [], 
  onDismiss, 
  onRemove 
}) => {
  const handleDismiss = onDismiss || onRemove || (() => {});
  const displayToasts = toasts.length > 0 ? toasts : messages.map(msg => ({
    id: msg.id,
    type: msg.type,
    title: msg.message,
    message: msg.details,
    onDismiss: handleDismiss
  }));

  return (
    <div className="fixed top-24 right-6 z-50 space-y-3 max-w-sm w-full">
      {displayToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
};

// useToast Hook
interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string, details?: string) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, type, message, details };
    
    setMessages(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setMessages(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string, details?: string) => {
    return addToast('success', message, details);
  }, [addToast]);

  const error = useCallback((message: string, details?: string) => {
    return addToast('error', message, details);
  }, [addToast]);

  const warning = useCallback((message: string, details?: string) => {
    return addToast('warning', message, details);
  }, [addToast]);

  const info = useCallback((message: string, details?: string) => {
    return addToast('info', message, details);
  }, [addToast]);

  return {
    messages,
    success,
    error,
    warning,
    info,
    removeToast,
    addToast,
  };
};