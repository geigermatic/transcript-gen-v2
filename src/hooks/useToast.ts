import { useState, useCallback } from 'react';

export interface ToastMessage {
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
