'use client';

import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useAppStore, type Toast } from '@/store/app-store';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: 'border-success/20 text-success',
  error: 'border-error/20 text-error',
  info: 'border-accent/20 text-accent',
  warning: 'border-warning/20 text-warning',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useAppStore(s => s.removeToast);
  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-surface-overlay px-4 py-3',
        'shadow-dialog animate-slide-in-right',
        'min-w-[280px] max-w-[400px]',
        styles[toast.type],
      )}
      role="alert"
    >
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-content">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-content-subtle hover:text-content transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore(s => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
