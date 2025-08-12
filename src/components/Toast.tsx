import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onRemove: (id: string) => void;
}

function Toast({ message, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(message.id), 300); // Wait for animation
    }, message.duration || 4000);

    return () => clearTimeout(timer);
  }, [message.id, message.duration, onRemove]);

  const getIcon = () => {
    switch (message.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getColors = () => {
    switch (message.type) {
      case 'success': return 'bg-green-500 bg-opacity-20 border-green-400';
      case 'error': return 'bg-red-500 bg-opacity-20 border-red-400';
      case 'info': return 'bg-blue-500 bg-opacity-20 border-blue-400';
      default: return 'bg-gray-500 bg-opacity-20 border-gray-400';
    }
  };

  return (
    <div
      className={`
        glass-panel p-4 mb-3 flex items-center space-x-3 transition-all duration-300
        ${getColors()}
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      <span className="text-xl">{getIcon()}</span>
      <p className="text-white flex-1">{message.message}</p>
      <button
        onClick={() => onRemove(message.id)}
        className="text-gray-300 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ messages, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-sm">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Hook for managing toast messages
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], message: string, duration?: number) => {
    const toast: ToastMessage = {
      id: crypto.randomUUID(),
      type,
      message,
      duration,
    };
    setMessages(prev => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  return {
    messages,
    addToast,
    removeToast,
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  };
}
