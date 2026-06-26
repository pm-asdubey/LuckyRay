import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('flex-1 flex flex-col', className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-border">
      <div className="flex items-center gap-3 min-w-0">
        {back}
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-content truncate">{title}</h1>
          {description && (
            <p className="text-xs text-content-muted truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContent({ children, className, noPadding }: PageContentProps) {
  return (
    <div className={cn('flex-1 overflow-auto', !noPadding && 'p-6', className)}>
      {children}
    </div>
  );
}
