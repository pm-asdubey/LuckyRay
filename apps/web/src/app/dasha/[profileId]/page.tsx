'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, MessageCircle, FileText } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart, DashaPeriod, DashaData } from '@luckyray/shared';
import { PLANET_SYMBOLS } from '@luckyray/shared';
import { formatDashaDuration } from '@luckyray/jyotish';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateNakshatra } from '@/lib/i18n';

export default function DashaPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslation();
  const language = useAppStore(s => s.language);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        getProfile(params.profileId),
        getLatestChart(params.profileId),
      ]);
      if (!p) { setError('Profile not found'); return; }
      setProfile(p);
      if (c) setStoredChart(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [params.profileId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton lines={8} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent>
              <ErrorCard title={t.chart.profileNotFound} message={t.chart.profileDeleted} onRetry={load} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  const chart = storedChart?.chart;

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader
            title={t.dasha.title}
            description={profile.name}
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label={t.common.back}>
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
            actions={
              <div className="flex items-center gap-2">
                <Link href={`/chat/${profile.id}`}>
                  <Button variant="ghost" size="sm">
                    <MessageCircle size={14} />
                    <span className="hidden sm:inline">{t.chart.chat}</span>
                  </Button>
                </Link>
                <Link href={`/reports/${profile.id}`}>
                  <Button variant="secondary" size="sm">
                    <FileText size={14} />
                    <span className="hidden sm:inline">{t.chart.reports}</span>
                  </Button>
                </Link>
              </div>
            }
          />

          {!chart ? (
            <PageContent>
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <p className="text-content-muted text-sm">{t.dasha.noChart}</p>
                <Link href={`/chart/${profile.id}`}>
                  <Button variant="primary">{t.dasha.goToChart}</Button>
                </Link>
              </div>
            </PageContent>
          ) : (
            <div className="flex-1 overflow-auto pb-24 md:pb-0">
              <PageContent className="max-w-3xl">
                <DashaFullView dashas={chart.dashas} />
              </PageContent>
            </div>
          )}
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}

function DashaFullView({ dashas }: { dashas: DashaData }) {
  const [expandedMaha, setExpandedMaha] = useState<string | null>(dashas.currentMahadasha.planet);
  const [expandedAntar, setExpandedAntar] = useState<string | null>(
    dashas.currentAntardasha ? `${dashas.currentMahadasha.planet}-${dashas.currentAntardasha.planet}` : null,
  );
  const now = new Date();
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const d = t.chart.dasha;

  return (
    <div className="space-y-4">
      {/* Current period summary */}
      <CurrentDashaSummary dashas={dashas} />

      {/* Explanation */}
      <div className="text-xs text-content-muted rounded-lg border border-surface-border bg-surface-elevated px-4 py-3 space-y-1">
        <p>
          <span className="text-content font-medium">Vimshottari Dasha</span> — 120-year cycle of planetary periods.
          {' '}{d.moonIn} <span className="text-content">{translateNakshatra(dashas.birthNakshatra, language)}</span> {d.atBirth}
          {' '}({d.nakshatraLord}: <span className="text-content">{translatePlanet(dashas.birthNakshatraLord, language)}</span>).
        </p>
        <p>Three levels: <span className="text-content">Mahadasha</span> →{' '}
          <span className="text-content">Antardasha</span> →{' '}
          <span className="text-content">Pratyantar</span>.
        </p>
      </div>

      {/* Full timeline */}
      <div className="space-y-2">
        {dashas.allPeriods.map((maha) => {
          const isMahaCurrent = new Date(maha.startDate) <= now && new Date(maha.endDate) >= now;
          const isMahaPast = new Date(maha.endDate) < now;
          const mahaKey = maha.planet;
          const isMahaExpanded = expandedMaha === mahaKey;

          return (
            <div
              key={`${maha.planet}-${maha.startDate}`}
              className={cn(
                'rounded-xl border transition-colors',
                isMahaCurrent
                  ? 'border-accent-muted bg-accent-subtle/20'
                  : 'border-surface-border bg-surface-elevated',
              )}
            >
              {/* Mahadasha row */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                onClick={() => setExpandedMaha(isMahaExpanded ? null : mahaKey)}
              >
                <PlanetSymbol planet={maha.planet} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-sm font-semibold',
                      isMahaCurrent ? 'text-accent' : isMahaPast ? 'text-content-subtle' : 'text-content',
                    )}>
                      {translatePlanet(maha.planet, language)} Mahadasha
                    </span>
                    {isMahaCurrent && <Badge variant="accent">{d.current}</Badge>}
                    {isMahaPast && <Badge variant="default">Completed</Badge>}
                  </div>
                  <div className="text-2xs text-content-muted mt-0.5 space-x-2">
                    <span>{formatDate(maha.startDate)}</span>
                    <span>→</span>
                    <span>{formatDate(maha.endDate)}</span>
                    <span>·</span>
                    <span>{formatDashaDuration(maha.durationYears)}</span>
                  </div>
                </div>
                {/* Progress bar for current mahadasha */}
                {isMahaCurrent && (
                  <DashaProgress
                    start={maha.startDate}
                    end={maha.endDate}
                    className="hidden sm:block w-20"
                  />
                )}
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-content-subtle flex-shrink-0 transition-transform duration-200',
                    isMahaExpanded && 'rotate-180',
                  )}
                />
              </button>

              {/* Antardasha list */}
              {isMahaExpanded && maha.antardasha && (
                <div className="border-t border-surface-border">
                  {maha.antardasha.map((anti) => {
                    const isAntiCurrent = isMahaCurrent &&
                      new Date(anti.startDate) <= now && new Date(anti.endDate) >= now;
                    const isAntiPast = new Date(anti.endDate) < now;
                    const antarKey = `${maha.planet}-${anti.planet}`;
                    const isAntiExpanded = expandedAntar === antarKey;

                    return (
                      <div key={`${anti.planet}-${anti.startDate}`}>
                        <button
                          className={cn(
                            'w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-surface',
                            isAntiCurrent && 'bg-accent-subtle/30',
                          )}
                          onClick={() => setExpandedAntar(isAntiExpanded ? null : antarKey)}
                        >
                          <PlanetSymbol planet={anti.planet} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn(
                                'text-xs font-medium',
                                isAntiCurrent ? 'text-accent' : isAntiPast ? 'text-content-subtle' : 'text-content',
                              )}>
                                {translatePlanet(anti.planet, language)} {d.antardasha}
                              </span>
                              {isAntiCurrent && <Badge variant="accent">{d.now}</Badge>}
                            </div>
                            <div className="text-2xs text-content-muted">
                              {formatDate(anti.startDate)} → {formatDate(anti.endDate)} · {formatDashaDuration(anti.durationYears)}
                            </div>
                          </div>
                          {isAntiCurrent && (
                            <DashaProgress
                              start={anti.startDate}
                              end={anti.endDate}
                              className="hidden sm:block w-16"
                            />
                          )}
                          {anti.pratyantar && anti.pratyantar.length > 0 && (
                            <ChevronRight
                              size={12}
                              className={cn(
                                'text-content-subtle flex-shrink-0 transition-transform duration-200',
                                isAntiExpanded && 'rotate-90',
                              )}
                            />
                          )}
                        </button>

                        {/* Pratyantar list */}
                        {isAntiExpanded && anti.pratyantar && (
                          <div className="bg-surface border-t border-surface-border">
                            {anti.pratyantar.map((prat) => {
                              const isPratCurrent = isAntiCurrent &&
                                new Date(prat.startDate) <= now && new Date(prat.endDate) >= now;
                              const isPratPast = new Date(prat.endDate) < now;

                              return (
                                <div
                                  key={`${prat.planet}-${prat.startDate}`}
                                  className={cn(
                                    'flex items-center gap-3 px-10 py-2 border-b border-surface-border last:border-0',
                                    isPratCurrent && 'bg-accent-subtle/20',
                                  )}
                                >
                                  <PlanetSymbol planet={prat.planet} size="xs" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={cn(
                                        'text-2xs font-medium',
                                        isPratCurrent ? 'text-accent' : isPratPast ? 'text-content-subtle' : 'text-content-muted',
                                      )}>
                                        {translatePlanet(prat.planet, language)} {d.pratyantar}
                                      </span>
                                      {isPratCurrent && <Badge variant="accent">{d.current}</Badge>}
                                    </div>
                                    <div className="text-2xs text-content-subtle">
                                      {formatDate(prat.startDate)} → {formatDate(prat.endDate)} · {formatDashaDuration(prat.durationYears)}
                                    </div>
                                  </div>
                                  {isPratCurrent && (
                                    <DashaProgress
                                      start={prat.startDate}
                                      end={prat.endDate}
                                      className="hidden sm:block w-14"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CurrentDashaSummary({ dashas }: { dashas: DashaData }) {
  const now = new Date();
  const mahaEnd = new Date(dashas.currentMahadasha.endDate);
  const mahaStart = new Date(dashas.currentMahadasha.startDate);
  const mahaProgress = Math.min(100, Math.max(0,
    ((now.getTime() - mahaStart.getTime()) / (mahaEnd.getTime() - mahaStart.getTime())) * 100,
  ));
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const d = t.chart.dasha;

  return (
    <div className="rounded-xl border border-accent-muted bg-accent-subtle/30 p-4 space-y-3">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider">{t.dasha.currentPeriod}</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DashaLevel
          label="Mahadasha"
          planet={dashas.currentMahadasha.planet}
          endsAt={dashas.currentMahadasha.endDate}
          level={1}
        />
        {dashas.currentAntardasha && (
          <DashaLevel
            label={d.antardasha}
            planet={dashas.currentAntardasha.planet}
            endsAt={dashas.currentAntardasha.endDate}
            level={2}
          />
        )}
        {dashas.currentPratyantar && (
          <DashaLevel
            label={d.pratyantar}
            planet={dashas.currentPratyantar.planet}
            endsAt={dashas.currentPratyantar.endDate}
            level={3}
          />
        )}
      </div>

      {/* Mahadasha progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-2xs text-content-muted">
          <span>Mahadasha progress</span>
          <span>{mahaProgress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${mahaProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DashaLevel({ label, planet, endsAt, level }: {
  label: string;
  planet: string;
  endsAt: string;
  level: number;
}) {
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const d = t.chart.dasha;
  return (
    <div className="space-y-1">
      <div className="text-2xs text-content-muted">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">{PLANET_SYMBOLS[planet as keyof typeof PLANET_SYMBOLS] ?? ''}</span>
        <span className="text-sm font-semibold text-content">{translatePlanet(planet, language)}</span>
      </div>
      <div className="text-2xs text-content-subtle">{d.until} {formatDate(endsAt)}</div>
    </div>
  );
}

function DashaProgress({ start, end, className }: { start: string; end: string; className?: string }) {
  const now = new Date();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const pct = Math.min(100, Math.max(0, ((now.getTime() - s) / (e - s)) * 100));

  return (
    <div className={cn('space-y-0.5', className)}>
      <div className="h-1 rounded-full bg-surface-border overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-2xs text-content-subtle text-right">{pct.toFixed(0)}%</div>
    </div>
  );
}

function PlanetSymbol({ planet, size }: { planet: string; size: 'xs' | 'sm' | 'lg' }) {
  const sizes = { xs: 'text-sm w-4', sm: 'text-base w-5', lg: 'text-xl w-7' };
  return (
    <span className={cn('text-center flex-shrink-0 text-content-muted', sizes[size])} aria-hidden="true">
      {PLANET_SYMBOLS[planet as keyof typeof PLANET_SYMBOLS] ?? planet[0]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
