import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  dividerBefore?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 192 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192;
    const gap = 8;
    let top = rect.bottom + gap;
    let left = align === 'right' ? rect.right - menuWidth : rect.left;

    // Flip above if near bottom
    const estimatedHeight = items.length * 36 + 16;
    if (top + estimatedHeight > window.innerHeight - 12) {
      top = rect.top - estimatedHeight - gap;
      if (top < 12) top = 12;
    }
    // Keep inside viewport horizontally
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

    setPos({ top, left, width: menuWidth });
  };

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, align, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);
    const handleResize = () => updatePosition();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };
  const close = () => setIsOpen(false);

  return (
    <>
      <div ref={triggerRef} className={clsx('relative inline-block', className)}>
        <div onClick={toggleOpen} className="cursor-pointer inline-flex">{trigger}</div>
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/60 py-1.5 z-[100] overflow-hidden animate-scaleIn"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            role="menu"
          >
            {items.map((item, index) => (
              <React.Fragment key={index}>
                {item.dividerBefore && <div className="my-1 border-t border-gray-100" role="separator" />}
                <button
                  onClick={() => {
                    item.onClick();
                    close();
                  }}
                  disabled={item.disabled}
                  className={clsx(
                    'flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm transition-colors',
                    item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
                    item.disabled && 'opacity-50 cursor-not-allowed',
                  )}
                  role="menuitem"
                >
                  {item.icon && <span className={clsx('w-4 h-4 flex-shrink-0', item.danger ? 'text-red-500' : 'text-gray-400')}>{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
