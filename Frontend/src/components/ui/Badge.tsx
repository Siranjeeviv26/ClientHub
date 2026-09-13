import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'default';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      dot = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    const variantClasses = {
      primary: 'bg-primary-100 text-primary-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
      default: 'bg-gray-100 text-gray-800',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
    };

    return (
      <span
        ref={ref}
        className={clsx('inline-flex items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap shrink-0 leading-none tracking-wide', variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', variantClasses[variant].replace('bg-', 'bg-').replace('text-', 'bg-'))} />}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';