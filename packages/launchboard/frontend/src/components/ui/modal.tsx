'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = '640px' }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 modal-backdrop"
        onClick={onClose}
      />
      {/* Content */}
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          width: '90vw',
          maxWidth,
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-heading), sans-serif' }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: title ? 'calc(80vh - 60px)' : '80vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
