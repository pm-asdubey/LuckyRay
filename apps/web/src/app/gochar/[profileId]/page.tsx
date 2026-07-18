'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Calendar, Globe } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import { computeCurrentGochar, checkSadeSati } from '@luckyray/jyotish';
import type { Profile, StoredChart, GocharData, GocharPlanet } from '@luckyray/shared';
import { PLANET_SYMBOLS, SIGN_ABBREVIATIONS } from '@luckyray/shared';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateSign, translateNakshatra } from '@/lib/i18n';

type ReferenceMode = 'lagna' | 'chandra';

const PLANET_COLORS: Record<string, string> = {
  Sun:     'text-amber-400',
  Moon:    'text-slate-300',
  Mars:    'text-red-400',
  Mercury: 'text-emerald-400',
  Jupiter: 'text-yellow-300',
  Venus:   'text-pink-300',
  Saturn:  'text-blue-400',
  Rahu:    'text-violet-400',
  Ketu:    'text-orange-400',
};

export default function GocharPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gochar, setGochar] = useState<GocharData | null>(null);
  const [mode, setMode] = useState<ReferenceMode>('lagna');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]!);
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

  useEffect(() => {
    if (!storedChart) return;
    const chart = storedChart.chart;
    const refSignIndex = mode === 'lagna'
      ? chart.ascendant.signIndex
      : chart.planets.find(p => p.id === 'Moon')?.signIndex ?? chart.ascendant.signIndex;
    const d = new Date(date + 'T12:00:00Z');
    const g = computeCurrentGochar(refSignIndex, d);
    setGochar(g);
  }, [storedChart, mode, date]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton lines={6} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent>
              <ErrorCard title="Error" message={error ?? 'Profile not found'} onRetry={load} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  const chart = storedChart?.chart;
  const natalMoon = chart?.planets.find(p => p.id === 'Moon');
  const natalSaturn = chart?.planets.find(p => p.id === 'Saturn');
  const transitSaturn = gochar?.planets.find(p => p.id === 'Saturn');
  const sadeSati = natalMoon && transitSaturn
    ? checkSadeSati(transitSaturn.signIndex, natalMoon.signIndex)
    : null;

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader
            title={t.gochar.title}
            description={`${t.gochar.transits} · ${profile.name}`}
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label={t.common.back}>
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(new Date().toISOString().split('T')[0]!)}
              >
                <RefreshCw size={14} />
                {t.gochar.today}
              </Button>
            }
          />

          <div className="flex-1 overflow-auto pb-24 md:pb-0">
            <PageContent className="max-w-3xl space-y-5">
              {!chart ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <p className="text-content-muted text-sm">{t.gochar.noChart}</p>
                  <Link href={`/chart/${profile.id}`}>
                    <Button variant="primary">{t.gochar.generateChartFirst}</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Reference mode toggle */}
                    <div className="flex rounded-xl bg-surface-elevated border border-surface-border p-1 gap-1 w-fit">
                      <button
                        onClick={() => setMode('lagna')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          mode === 'lagna'
                            ? 'bg-accent-subtle text-accent'
                            : 'text-content-muted hover:text-content',
                        )}
                      >
                        <Globe size={12} className="inline mr-1.5" />
                        {t.gochar.fromLagna}
                      </button>
                      <button
                        onClick={() => setMode('chandra')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          mode === 'chandra'
                            ? 'bg-accent-subtle text-accent'
                            : 'text-content-muted hover:text-content',
                        )}
                      >
                        ☽ {t.gochar.fromChandra}
                      </button>
                    </div>

                    {/* Date picker */}
                    <Input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      leftIcon={<Calendar size={14} />}
                      className="max-w-[200px]"
                    />
                  </div>

                  {/* Sade Sati alert */}
                  {sadeSati?.active && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                      <span className="font-semibold text-amber-400">{t.gochar.sadeSatiActive}</span>
                      <span className="text-content-muted ml-2">— {sadeSati.description}</span>
                      <p className="text-xs text-content-muted mt-1">
                        {t.gochar.sadeSatiDesc}
                      </p>
                    </div>
                  )}

                  {/* Transit grid */}
                  {gochar && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                        {t.gochar.planetaryTransits} · {mode === 'lagna' ? t.gochar.fromAscendant : t.gochar.fromNatalMoon} · {new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>

                      <div className="grid gap-2">
                        {gochar.planets.map(planet => {
                          const natalPlanet = chart.planets.find(p => p.id === planet.id);
                          const sameSign = natalPlanet?.signIndex === planet.signIndex;
                          const colorClass = PLANET_COLORS[planet.id] ?? 'text-content';

                          return (
                            <GocharRow
                              key={planet.id}
                              planet={planet}
                              natalPlanet={natalPlanet}
                              colorClass={colorClass}
                              sameSign={sameSign}
                              t={t}
                              language={language}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Natal reference */}
                  {chart && (
                    <div className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 space-y-2">
                      <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                        {t.gochar.natalReference}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                        <div className="text-xs text-content-muted">
                          <span className="text-content-subtle">{t.chart.lagnaLabel}:</span>{' '}
                          <span className="text-content">{translateSign(chart.ascendant.sign, language)}</span>
                        </div>
                        {chart.planets.map(p => (
                          <div key={p.id} className="text-xs text-content-muted">
                            <span className="text-content-subtle">{translatePlanet(p.id, language)}:</span>{' '}
                            <span className="text-content">{translateSign(p.sign, language)} H{p.house}</span>
                            {p.isRetrograde && <span className="text-violet-400 ml-1">℞</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </PageContent>
          </div>
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}

function GocharRow({
  planet, natalPlanet, colorClass, sameSign, t, language,
}: {
  planet: GocharPlanet;
  natalPlanet?: { sign: string; house: number; signIndex: number } | null;
  colorClass: string;
  sameSign: boolean;
  t: ReturnType<typeof import('@/hooks/use-translation').useTranslation>;
  language: 'en' | 'hi';
}) {
  const symbol = PLANET_SYMBOLS[planet.id as keyof typeof PLANET_SYMBOLS] ?? '';
  const isSpecial = planet.natalHouse === 1 || planet.natalHouse === 4 ||
    planet.natalHouse === 7 || planet.natalHouse === 10;

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
      isSpecial
        ? 'border-accent-muted/50 bg-accent-subtle/10'
        : 'border-surface-border bg-surface-elevated',
    )}>
      {/* Planet symbol + name */}
      <div className="flex items-center gap-2 w-28 shrink-0">
        <span className={cn('text-lg', colorClass)} aria-hidden="true">{symbol}</span>
        <div>
          <div className={cn('text-sm font-semibold', colorClass)}>{translatePlanet(planet.id, language)}</div>
          {planet.isRetrograde && (
            <div className="text-2xs text-violet-400">{t.gochar.retrograde}</div>
          )}
        </div>
      </div>

      {/* Current transit sign + house */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-content font-medium">
          {translateSign(planet.sign, language)} {planet.degree}°
        </div>
        <div className="text-2xs text-content-muted">{translateNakshatra(planet.nakshatra, language)}</div>
      </div>

      {/* Transit house arrow */}
      <div className="flex items-center gap-2 text-xs">
        {natalPlanet && (
          <span className="text-content-subtle">
            {t.gochar.natalHouse(natalPlanet.house)}
          </span>
        )}
        <span className="text-content-subtle">→</span>
        <span className={cn(
          'font-semibold',
          isSpecial ? 'text-accent' : 'text-content',
        )}>
          {t.gochar.transitHouse(planet.natalHouse)}
        </span>
      </div>

      {/* Special badge */}
      {sameSign && <Badge variant="gold">{t.gochar.returnLabel}</Badge>}
      {isSpecial && !sameSign && (
        <Badge variant="accent">{t.gochar.kendraLabel}</Badge>
      )}
    </div>
  );
}
