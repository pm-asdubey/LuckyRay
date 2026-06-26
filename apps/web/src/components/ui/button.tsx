'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent text-white font-medium',
    'hover:bg-accent/90 active:bg-accent/80',
    'shadow-subtle',
  ].join(' '),
  secondary: [
    'bg-surface-elevated text-content border border-surface-border',
    'hover:bg-surface-overlay hover:border-content-subtle',
  ].join(' '),
  ghost: [
    'text-content-muted',
    'hover:text-content hover:bg-surface-elevated',
  ].join(' '),
  destructive: [
    'bg-error/10 text-error border border-error/20',
    'hover:bg-error/20',
  ].join(' '),
  icon: [
    'text-content-muted',
    'hover:text-content hover:bg-surface-elevated',
    'aspect-square',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs rounded gap-1.5',
  md: 'h-9 px-4 text-sm rounded-md gap-2',
  lg: 'h-11 px-6 text-sm rounded-lg gap-2.5',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 w-7 rounded',
  md: 'h-9 w-9 rounded-md',
  lg: 'h-11 w-11 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, className, children, disabled, ...props },
  ref,
) {
  const isIcon = variant === 'icon';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150',
        'font-medium select-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        isIcon ? iconSizeStyles[size] : sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner size={size} />
          {!isIcon && children}
        </span>
      ) : children}
    </button>
  );
});

function Spinner({ size }: { size: ButtonSize }) {
  const sizeClass = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-4 w-4' }[size];
  return (
    <svg
      className={cn('animate-spin', sizeClass)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
