'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`px-3 py-2 rounded-lg text-sm ${className}`}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
