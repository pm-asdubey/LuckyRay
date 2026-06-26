import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton h-4 rounded',
              i === lines - 1 && 'w-3/4',
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('skeleton', className)} {...props} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="space-y-6 p-4">
      {[0, 1, 2].map(i => (
        <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
          <div className={cn('space-y-2', i % 2 === 0 ? 'max-w-[70%]' : 'max-w-[60%]')}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className={cn('h-4', i % 2 === 0 ? 'w-3/5' : 'w-2/3')} />
          </div>
        </div>
      ))}
    </div>
  );
}
