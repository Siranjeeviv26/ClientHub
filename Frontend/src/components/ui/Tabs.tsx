import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
  fullWidth?: boolean;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      tabs,
      activeTab,
      onChange,
      variant = 'default',
      className = '',
      fullWidth = false,
    },
    ref,
  ) => {
    const variantClasses = {
      default: 'flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-thin',
      pills: 'inline-flex gap-1 bg-gray-100 p-1 rounded-xl',
      underline: 'flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-thin',
    };

    const tabClasses = {
      default:
        'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      pills: 'rounded-md text-gray-600 hover:text-gray-900',
      underline:
        'border-b-2 border-transparent text-gray-500 hover:text-gray-700',
    };

    const activeTabClasses = {
      default: 'border-primary-600 text-primary-600',
      pills: 'bg-white text-primary-600 shadow-sm',
      underline: 'border-primary-600 text-primary-600',
    };

    return (
      <div ref={ref} className={clsx(variantClasses[variant], className)} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              fullWidth && 'flex-1 justify-center',
              tabClasses[variant],
              activeTab === tab.id && activeTabClasses[variant],
              tab.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={clsx('px-1.5 py-0.5 text-xs rounded-full', activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  },
);

Tabs.displayName = 'Tabs';

export function TabPanel({ id, children, activeTab }: { id: string; children: React.ReactNode; activeTab: string }) {
  if (activeTab !== id) return null;
  return <div id={`panel-${id}`} role="tabpanel">{children}</div>;
}