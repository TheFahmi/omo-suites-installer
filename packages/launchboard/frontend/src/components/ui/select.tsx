'use client';

import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => {
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
        <select
          ref={ref}
          className={`px-3 py-2 rounded-lg text-sm cursor-pointer ${className}`}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
