'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutDashboard, MessageCircle, Settings, FileText, Users, Heart,
  CalendarDays, Globe, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type AppMode } from '@/store/app-store';
import { LuckyRayLogo } from '@/components/brand/logo';
import { useTranslation } from '@/hooks/use-translation';
import type { Language } from '@/lib/i18n';

interface NavItem {
  href: string;
  labelKey: keyof ReturnType<typeof useTranslation>['nav'];
  icon: React.ReactNode;
  exact?: boolean;
  modes: AppMode[];
}

const navItemDefs: NavItem[] = [
  { href: '/',            labelKey: 'home',        icon: <Home size={16} />,            exact: true, modes: ['astrologer', 'user'] },
  { href: '/chart',       labelKey: 'chart',       icon: <LayoutDashboard size={16} />,              modes: ['astrologer'] },
  { href: '/gochar',      labelKey: 'gochar',      icon: <Globe size={16} />,                        modes: ['astrologer'] },
  { href: '/dasha',       labelKey: 'dashas',      icon: <CalendarDays size={16} />,                 modes: ['astrologer'] },
  { href: '/divisional',  labelKey: 'divisional',  icon: <Layers size={16} />,                       modes: ['astrologer'] },
  { href: '/matchmaking', labelKey: 'matchmaking', icon: <Users size={16} />,                        modes: ['astrologer'] },
  { href: '/milan',       labelKey: 'milan',       icon: <Heart size={16} />,                        modes: ['astrologer'] },
  { href: '/reports',     labelKey: 'reports',     icon: <FileText size={16} />,                     modes: ['astrologer', 'user'] },
  { href: '/chat',        labelKey: 'chat',        icon: <MessageCircle size={16} />,                modes: ['astrologer', 'user'] },
  { href: '/settings',    labelKey: 'settings',    icon: <Settings size={16} />,                     modes: ['astrologer', 'user'] },
];

const mobileItemDefs: NavItem[] = [
  { href: '/',        labelKey: 'home',    icon: <Home size={18} />,         exact: true, modes: ['astrologer', 'user'] },
  { href: '/chart',   labelKey: 'chart',   icon: <LayoutDashboard size={18} />,            modes: ['astrologer'] },
  { href: '/milan',   labelKey: 'milan',   icon: <Heart size={18} />,                      modes: ['astrologer'] },
  { href: '/reports', labelKey: 'reports', icon: <FileText size={18} />,                   modes: ['astrologer', 'user'] },
  { href: '/chat',    labelKey: 'chat',    icon: <MessageCircle size={18} />,               modes: ['astrologer', 'user'] },
  { href: '/settings',labelKey: 'settings',icon: <Settings size={18} />,                   modes: ['astrologer', 'user'] },
];

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === '/chart') return pathname.startsWith('/chart') || pathname.startsWith('/dasha');
  return pathname.startsWith(item.href) && item.href !== '/';
}

function LanguageToggle() {
  const { language, setLanguage } = useAppStore();

  return (
    <div className="flex rounded-md border border-surface-border overflow-hidden">
      {(['en', 'hi'] as Language[]).map(lang => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            'px-2.5 py-1 text-2xs font-semibold tracking-wide transition-colors',
            language === lang
              ? 'bg-accent text-white'
              : 'text-content-subtle hover:text-content hover:bg-surface-elevated',
          )}
          aria-pressed={language === lang}
          title={lang === 'en' ? 'English' : 'हिंदी'}
        >
          {lang === 'en' ? 'EN' : 'हि'}
        </button>
      ))}
    </div>
  );
}

function ModeToggle() {
  const { appMode, setAppMode } = useAppStore();
  const t = useTranslation();
  return (
    <div className="px-3 py-2.5 border-b border-surface-border">
      <div className="flex rounded-lg bg-surface-elevated p-0.5">
        <button
          onClick={() => setAppMode('user')}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-2xs font-medium transition-colors',
            appMode === 'user'
              ? 'bg-surface text-content shadow-sm'
              : 'text-content-subtle hover:text-content-muted',
          )}
        >
          {t.nav.personal}
        </button>
        <button
          onClick={() => setAppMode('astrologer')}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-2xs font-medium transition-colors',
            appMode === 'astrologer'
              ? 'bg-surface text-accent shadow-sm'
              : 'text-content-subtle hover:text-content-muted',
          )}
        >
          {t.nav.astrologer}
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeProfile, appMode } = useAppStore();
  const t = useTranslation();
  const visibleItems = navItemDefs.filter(item => item.modes.includes(appMode));

  return (
    <nav
      className="hidden md:flex flex-col w-56 shrink-0 border-r border-surface-border bg-surface h-full"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border">
        <LuckyRayLogo size={34} showWordmark />
        <LanguageToggle />
      </div>

      <ModeToggle />

      {activeProfile && (
        <div className="px-3 pt-2">
          <Link
            href={`/chart/${activeProfile.id}`}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-content-muted hover:text-content hover:bg-surface-elevated transition-colors"
          >
            <Avatar name={activeProfile.name} size="sm" />
            <div className="min-w-0">
              <div className="text-content font-medium text-xs truncate">{activeProfile.name}</div>
              <div className="text-content-subtle text-2xs">{t.nav.activeProfile}</div>
            </div>
          </Link>
          <div className="border-t border-surface-border mt-2" />
        </div>
      )}

      <div className="flex-1 flex flex-col gap-0.5 p-3 pt-2 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = isItemActive(pathname, item);
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
              {t.nav[item.labelKey]}
            </Link>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-surface-border">
        <span className="text-2xs text-content-subtle uppercase tracking-widest">
          {appMode === 'astrologer' ? t.nav.astrologerView : t.nav.personalView}
        </span>
      </div>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { appMode } = useAppStore();
  const t = useTranslation();
  const visible = mobileItemDefs.filter(item => item.modes.includes(appMode));

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-surface-border bg-surface/95 backdrop-blur-sm"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {visible.map(item => {
          const isActive = isItemActive(pathname, item);
          const label = t.nav[item.labelKey];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[48px]',
                'text-2xs transition-colors',
                isActive ? 'text-accent' : 'text-content-subtle hover:text-content',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              {label && <span>{label}</span>}
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
        border: `1px solid hsl(${hue} 40% 25%)`,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
