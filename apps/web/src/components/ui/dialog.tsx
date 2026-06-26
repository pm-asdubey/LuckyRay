'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full rounded-2xl bg-surface-overlay border border-surface-border',
          'shadow-dialog animate-slide-up',
          sizeMap[size],
          className,
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 p-5 pb-4">
            <div>
              {title && (
                <h2 id="dialog-title" className="text-base font-semibold text-content">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-content-muted mt-1">{description}</p>
              )}
            </div>
            <Button variant="icon" size="sm" onClick={onClose} aria-label="Close dialog">
              <X size={16} />
            </Button>
          </div>
        )}

        {!(title || description) && (
          <Button
            variant="icon"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 z-10"
          >
            <X size={16} />
          </Button>
        )}

        {/* Content */}
        <div className={cn(title || description ? 'px-5 pb-5' : 'p-5')}>
          {children}
        </div>
      </div>
    </div>
  );
}
