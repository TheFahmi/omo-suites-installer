'use client';

import { forwardRef } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'default' | 'outline';
  className?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, color, variant = 'default', className = '' }, ref) => {
    const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap';

    if (variant === 'outline') {
      return (
        <span
          ref={ref}
          className={`${baseStyles} ${className}`}
          style={{
            border: `1px solid ${color || 'var(--border)'}`,
            color: color || 'var(--text-secondary)',
            background: 'transparent',
          }}
        >
          {children}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${className}`}
        style={{
          backgroundColor: color ? `${color}20` : 'var(--gold-dim)',
          color: color || 'var(--gold)',
        }}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export function PriorityDot({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    1: 'var(--p1)',
    2: 'var(--p2)',
    3: 'var(--p3)',
    4: 'var(--p4)',
  };

  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: colors[priority] || 'var(--text-muted)' }}
    />
  );
}

export function PriorityLabel({ priority }: { priority: number }) {
  const labels: Record<number, string> = {
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4',
  };
  const colors: Record<number, string> = {
    1: 'var(--p1)',
    2: 'var(--p2)',
    3: 'var(--p3)',
    4: 'var(--p4)',
  };

  return (
    <span
      className="text-xs font-semibold"
      style={{ color: colors[priority] || 'var(--text-muted)' }}
    >
      {labels[priority] || `P${priority}`}
    </span>
  );
}
