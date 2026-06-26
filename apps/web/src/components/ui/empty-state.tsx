import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 px-8 text-center',
        className,
      )}
    >
      {icon && (
        <div className="text-content-subtle opacity-50">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-content">{title}</h3>
        {description && (
          <p className="text-xs text-content-muted max-w-xs leading-relaxed">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
