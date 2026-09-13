import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      shape = 'circle',
      className = '',
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
    };

    const shapeClass = shape === 'square' ? 'rounded-lg' : 'rounded-full';

    const getInitials = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getColorFromName = (name: string) => {
      const colors = [
        'bg-red-100 text-red-700',
        'bg-orange-100 text-orange-700',
        'bg-amber-100 text-amber-700',
        'bg-green-100 text-green-700',
        'bg-emerald-100 text-emerald-700',
        'bg-teal-100 text-teal-700',
        'bg-cyan-100 text-cyan-700',
        'bg-sky-100 text-sky-700',
        'bg-blue-100 text-blue-700',
        'bg-indigo-100 text-indigo-700',
        'bg-violet-100 text-violet-700',
        'bg-purple-100 text-purple-700',
        'bg-fuchsia-100 text-fuchsia-700',
        'bg-pink-100 text-pink-700',
        'bg-rose-100 text-rose-700',
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    if (src) {
      return (
        <img
          ref={ref}
          src={src}
          alt={alt || name || 'Avatar'}
          className={clsx('object-cover shrink-0 aspect-square', shapeClass, sizeClasses[size], className)}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={clsx('flex items-center justify-center font-medium shrink-0 aspect-square leading-none select-none', shapeClass, sizeClasses[size], name ? getColorFromName(name) : 'bg-gray-100 text-gray-500', className)}
        {...props}
      >
        {name ? (
          <span className="tracking-wide">{getInitials(name)}</span>
        ) : (
          <svg className="w-1/2 h-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';