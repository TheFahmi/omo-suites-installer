'use client';

import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className = '', style, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--gold)',
        color: '#0a0a0a',
      },
      secondary: {
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
      },
      danger: {
        backgroundColor: '#ef444420',
        color: '#ef4444',
        border: '1px solid #ef444440',
      },
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${className}`}
        style={{ ...variantStyles[variant], ...style }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
