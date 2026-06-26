import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-error/20 bg-error/5 p-4',
        'flex items-start gap-3',
        className,
      )}
      role="alert"
    >
      <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content">{title}</p>
        <p className="text-xs text-content-muted mt-1">{message}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-3 text-content-muted"
          >
            <RefreshCw size={13} />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
