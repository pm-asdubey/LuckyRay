'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, MessageCircle, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { LuckyRayLogo } from '@/components/brand/logo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

// 5 items — Profiles and Dashas are accessed contextually within Chart and Settings
const navItems: NavItem[] = [
  { href: '/',        label: 'Home',     icon: <Home size={18} />,           exact: true },
  { href: '/chart',   label: 'Chart',    icon: <LayoutDashboard size={18} /> },
  { href: '/reports', label: 'Reports',  icon: <FileText size={18} /> },
  { href: '/chat',    label: 'Chat',     icon: <MessageCircle size={18} /> },
  { href: '/settings',label: 'Settings', icon: <Settings size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const activeProfile = useAppStore(s => s.activeProfile);

  return (
    <nav
      className="hidden md:flex flex-col w-56 shrink-0 border-r border-surface-border bg-surface h-full"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-4 border-b border-surface-border">
        <LuckyRayLogo size={36} showWordmark />
      </div>

      {/* Active profile indicator */}
      {activeProfile && (
        <div className="px-3 pt-3">
          <Link
            href={`/chart/${activeProfile.id}`}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-content-muted hover:text-content hover:bg-surface-elevated transition-colors"
          >
            <Avatar name={activeProfile.name} size="sm" />
            <div className="min-w-0">
              <div className="text-content font-medium text-xs truncate">{activeProfile.name}</div>
              <div className="text-content-subtle text-2xs">Active profile</div>
            </div>
          </Link>
          <div className="border-t border-surface-border mt-3" />
        </div>
      )}

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-0.5 p-3 pt-2">
        {navItems.map(item => {
          // /chart also catches /dasha routes (dasha page is part of the chart experience)
          const isActive = item.exact
            ? pathname === item.href
            : (pathname.startsWith(item.href) && item.href !== '/') ||
              (item.href === '/chart' && pathname.startsWith('/dasha'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'text-content-muted hover:text-content hover:bg-surface-elevated',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-surface-border bg-surface/95 backdrop-blur-sm"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(item => {
          const isActive = item.exact
            ? pathname === item.href
            : (pathname.startsWith(item.href) && item.href !== '/') ||
              (item.href === '/chart' && pathname.startsWith('/dasha'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[52px]',
                'text-2xs transition-colors',
                isActive
                  ? 'text-accent'
                  : 'text-content-subtle hover:text-content',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('');

  const sizeClasses = {
    sm: 'h-7 w-7 text-2xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  // Generate a consistent color from the name
  const hue = name.charCodeAt(0) * 40 % 360;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        sizeClasses[size],
      )}
      style={{
        backgroundColor: `hsl(${hue} 40% 20%)`,
        color: `hsl(${hue} 60% 70%)`,
        borderColor: `hsl(${hue} 40% 25%)`,
        border: '1px solid',
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
