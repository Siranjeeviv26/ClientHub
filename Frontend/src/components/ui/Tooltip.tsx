import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const childRef = useRef<HTMLElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Clone the child element to add event handlers
  const childWithHandlers = React.cloneElement(children, {
    ref: childRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
  });

  if (!isVisible || !childRef.current) {
    return childWithHandlers;
  }

  const rect = childRef.current.getBoundingClientRect();
  const tooltipWidth = 240; // approximate max-width

  const positions = {
    top: {
      left: rect.left + rect.width / 2 - tooltipWidth / 2,
      top: rect.top - 8,
      transform: 'translateX(-50%) translateY(-100%)',
      arrowPosition: 'bottom',
    },
    bottom: {
      left: rect.left + rect.width / 2 - tooltipWidth / 2,
      top: rect.bottom + 8,
      transform: 'translateX(-50%)',
      arrowPosition: 'top',
    },
    left: {
      left: rect.left - 8,
      top: rect.top + rect.height / 2,
      transform: 'translateX(-100%) translateY(-50%)',
      arrowPosition: 'right',
    },
    right: {
      left: rect.right + 8,
      top: rect.top + rect.height / 2,
      transform: 'translateY(-50%)',
      arrowPosition: 'left',
    },
  };

  const pos = positions[position];

  const tooltip = (
    <div
      className={clsx(
        'fixed z-50 max-w-xs px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
      style={{
        left: pos.left,
        top: pos.top,
        transform: pos.transform,
      }}
      role="tooltip"
    >
      {content}
      <div
        className={clsx(
          'absolute w-0 h-0 border-4 border-transparent',
          {
            'bottom-[-8px] left-1/2 -translate-x-1/2 border-t-gray-900': pos.arrowPosition === 'bottom',
            'top-[-8px] left-1/2 -translate-x-1/2 border-b-gray-900': pos.arrowPosition === 'top',
            'left-[-8px] top-1/2 -translate-y-1/2 border-r-gray-900': pos.arrowPosition === 'left',
            'right-[-8px] top-1/2 -translate-y-1/2 border-l-gray-900': pos.arrowPosition === 'right',
          }
        )}
      />
    </div>
  );

  return (
    <>
      {childWithHandlers}
      {createPortal(tooltip, document.body)}
    </>
  );
}