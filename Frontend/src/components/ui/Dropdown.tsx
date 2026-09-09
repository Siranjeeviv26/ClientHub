import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block', className)}>
      <div onClick={toggleOpen}>{trigger}</div>
      {isOpen && (
        <div
          className={clsx(
            'dropdown',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          role="menu"
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.dividerBefore && <div className="dropdown-divider" role="separator" />}
              <button
                onClick={() => {
                  item.onClick();
                  close();
                }}
                disabled={item.disabled}
                className={clsx(
                  'dropdown-item w-full text-left',
                  item.danger && 'text-red-600',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                )}
                role="menuitem"
              >
                {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}