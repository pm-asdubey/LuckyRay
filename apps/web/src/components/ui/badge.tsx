import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'gold' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default:  'bg-surface-overlay text-content-muted border border-surface-border',
  accent:   'bg-accent-subtle text-accent border border-accent-muted',
  gold:     'bg-gold-subtle text-gold border border-gold-muted',
  success:  'bg-success/10 text-success border border-success/20',
  warning:  'bg-warning/10 text-warning border border-warning/20',
  error:    'bg-error/10 text-error border border-error/20',
  outline:  'text-content border border-surface-border',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
