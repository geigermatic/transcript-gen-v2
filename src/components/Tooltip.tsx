/**
 * Enhanced tooltip component for User Testing Mode
 */

import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  testingModeOnly?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  disabled = false,
  testingModeOnly = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { isUserTestingMode } = useAppStore();

  // Don't render tooltip if testing mode only and testing mode is disabled
  if (testingModeOnly && !isUserTestingMode) {
    return <>{children}</>;
  }

  // Don't render if disabled
  if (disabled) {
    return <>{children}</>;
  }

  const showTooltip = () => {
    setIsVisible(true);
    
    // Calculate optimal position based on viewport
    setTimeout(() => {
      if (tooltipRef.current && triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newPosition = position;

        // Check if tooltip would go off screen and adjust
        if (position === 'top' && triggerRect.top - tooltipRect.height < 10) {
          newPosition = 'bottom';
        } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > viewportHeight - 10) {
          newPosition = 'top';
        } else if (position === 'left' && triggerRect.left - tooltipRect.width < 10) {
          newPosition = 'right';
        } else if (position === 'right' && triggerRect.right + tooltipRect.width > viewportWidth - 10) {
          newPosition = 'left';
        }

        setActualPosition(newPosition);
      }
    }, 0);
  };

  const hideTooltip = () => {
    setIsVisible(false);
    setActualPosition(position);
  };

  const getTooltipClasses = () => {
    const baseClasses = `
      absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 border border-gray-700 rounded-lg shadow-lg
      max-w-xs transition-opacity duration-200 pointer-events-none
      ${isVisible ? 'opacity-100' : 'opacity-0'}
    `;

    const positionClasses = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    };

    return `${baseClasses} ${positionClasses[actualPosition]}`;
  };

  const getArrowClasses = () => {
    const arrowClasses = {
      top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
      left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
      right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
    };

    return `absolute w-0 h-0 border-4 ${arrowClasses[actualPosition]}`;
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      <div
        ref={tooltipRef}
        className={getTooltipClasses()}
        role="tooltip"
      >
        {content}
        <div className={getArrowClasses()} />
      </div>
    </div>
  );
};

// Enhanced version with help icon for testing mode
interface HelpTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  position = 'top',
}) => {
  const { isUserTestingMode } = useAppStore();

  if (!isUserTestingMode) {
    return null;
  }

  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 ml-2 text-xs text-blue-400 bg-blue-500/20 rounded-full hover:bg-blue-500/30 transition-colors"
        aria-label="Help"
      >
        ?
      </button>
    </Tooltip>
  );
};
