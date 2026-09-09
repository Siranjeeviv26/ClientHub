import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hover = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    const variantClasses = {
      default: 'bg-white border border-gray-200 shadow-card',
      outlined: 'bg-white border border-gray-200',
      elevated: 'bg-white border border-gray-200 shadow-lg',
    };

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl',
          variantClasses[variant],
          paddingClasses[padding],
          hover && 'hover:shadow-card-hover transition-shadow duration-200 cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  ),
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className = '', ...props }, ref) => (
    <h3 ref={ref} className={clsx('text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  ),
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className = '', ...props }, ref) => (
    <p ref={ref} className={clsx('text-sm text-gray-500 mt-1', className)} {...props}>
      {children}
    </p>
  ),
);

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={clsx('', className)} {...props}>
      {children}
    </div>
  ),
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('mt-4 pt-4 border-t border-gray-200 flex items-center justify-end gap-3', className)}
      {...props}
    >
      {children}
    </div>
  ),
);

CardFooter.displayName = 'CardFooter';