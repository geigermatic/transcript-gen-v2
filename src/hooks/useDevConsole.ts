/**
 * Hook for managing DevConsole state and visibility
 */

import { useState, useEffect } from 'react';

export interface DevConsoleState {
  isOpen: boolean;
  position: 'right' | 'bottom';
  isVisible: boolean; // Based on dev mode settings
}

export function useDevConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'right' | 'bottom'>('right');

  // Check if dev console should be visible
  const isVisible = import.meta.env.DEV || 
    (typeof window !== 'undefined' && localStorage.getItem('dev-console-enabled') === 'true');

  const toggle = () => {
    if (isVisible) {
      setIsOpen(!isOpen);
    }
  };

  const open = () => {
    if (isVisible) {
      setIsOpen(true);
    }
  };

  const close = () => {
    setIsOpen(false);
  };

  const changePosition = (newPosition: 'right' | 'bottom') => {
    setPosition(newPosition);
    // Save preference
    localStorage.setItem('dev-console-position', newPosition);
  };

  // Load saved position preference
  useEffect(() => {
    const savedPosition = localStorage.getItem('dev-console-position');
    if (savedPosition === 'right' || savedPosition === 'bottom') {
      setPosition(savedPosition);
    }
  }, []);

  return {
    isOpen,
    position,
    isVisible,
    toggle,
    open,
    close,
    changePosition,
  };
}
