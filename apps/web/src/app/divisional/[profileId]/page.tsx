'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart, DivisionalChart, DivisionalChartPlanet } from '@luckyray/shared';
import { PLANET_ABBREVIATIONS, PLANET_SYMBOLS } from '@luckyray/shared';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getNorthIndianHouseGeometry, SIGN_ABBREVIATIONS } from '@/lib/chart-geometry';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateSign } from '@/lib/i18n';

export default function DivisionalPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDiv, setActiveDiv] = useState<'D9' | 'D10'>('D9');

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
  const div = chart?.divisionalCharts[activeDiv];

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader
            title={t.divisional.title}
            description={profile.name}
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label={t.common.back}>
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
          />

          <div className="flex-1 overflow-auto pb-24 md:pb-0">
            <PageContent className="max-w-3xl space-y-5">
              {!chart ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <p className="text-content-muted text-sm">{t.divisional.noChart}</p>
                  <Link href={`/chart/${profile.id}`}>
                    <Button variant="primary">{t.divisional.generateChartFirst}</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex rounded-xl bg-surface-elevated border border-surface-border p-1 gap-1 w-fit">
                    {(['D9', 'D10'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setActiveDiv(d)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                          activeDiv === d
                            ? 'bg-accent-subtle text-accent'
                            : 'text-content-muted hover:text-content',
                        )}
                      >
                        {d} {d === 'D9' ? '— Navamsha' : '— Dashamsha'}
                      </button>
                    ))}
                  </div>

                  {div && (
                    <>
                      {/* Description */}
                      <div className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 text-xs text-content-muted space-y-1">
                        <p className="font-semibold text-content">
                          {div.name} · {t.divisional.ascendant}: {translateSign(div.ascendant, language)}
                        </p>
                        {activeDiv === 'D9' && (
                          <p>{t.divisional.navamshaDesc}</p>
                        )}
                        {activeDiv === 'D10' && (
                          <p>{t.divisional.dashamshaDec}</p>
                        )}
                      </div>

                      {/* Mini chart wheel */}
                      <MiniDivisionalChart div={div} />

                      {/* Planet table */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                          {t.divisional.planetPositions(div.name)}
                        </div>
                        <div className="grid gap-2">
                          {div.planets.map(p => {
                            const natalPlanet = chart.planets.find(np => np.id === p.id);
                            const changedSign = natalPlanet?.sign !== p.sign;
                            return (
                              <div
                                key={p.id}
                                className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated px-4 py-3"
                              >
                                <span className="text-lg text-content-muted w-6 text-center" aria-hidden>
                                  {PLANET_SYMBOLS[p.id as keyof typeof PLANET_SYMBOLS] ?? ''}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-content">{translatePlanet(p.id, language)}</div>
                                  {natalPlanet && (
                                    <div className="text-2xs text-content-subtle">
                                      {t.divisional.natal}: {translateSign(natalPlanet.sign, language)} H{natalPlanet.house}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-content">{translateSign(p.sign, language)}</div>
                                  <div className="text-2xs text-content-muted">{t.divisional.house} {p.house}</div>
                                </div>
                                {changedSign && (
                                  <Badge variant="accent">{t.divisional.shifted}</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
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

function MiniDivisionalChart({ div }: { div: DivisionalChart }) {
  // Group planets by house
  const housePlanets = new Map<number, DivisionalChartPlanet[]>();
  for (const p of div.planets) {
    const arr = housePlanets.get(p.house) ?? [];
    arr.push(p);
    housePlanets.set(p.house, arr);
  }

  const ascSignIndex = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(div.ascendant);

  const W = 280;
  const cx = W / 2;
  const cy = W / 2;

  // Shared North Indian geometry, scaled to the divisional card size.
  const getSign = (housePos: number) => SIGN_ABBREVIATIONS[(ascSignIndex + housePos - 1) % 12] ?? '';
  const houses = getNorthIndianHouseGeometry(W);

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${W} ${W}`} className="w-full max-w-[280px]" aria-label={`${div.name} chart`}>
        <rect x="0" y="0" width={W} height={W} fill="hsl(258 25% 7%)" rx="4" />
        {houses.map(({ house: h, points, cx: hcx, cy: hcy }) => {
          const planets = housePlanets.get(h) ?? [];
          const sign = getSign(h);
          return (
            <g key={h}>
              <polygon points={points} fill="transparent" stroke="hsl(258 30% 18%)" strokeWidth="1" />
              <text x={hcx} y={hcy - 6} textAnchor="middle" fontSize="6.5" fill="hsl(258 20% 40%)" fontFamily="system-ui">{h}</text>
              <text x={hcx} y={hcy + 2} textAnchor="middle" fontSize="7" fill="hsl(258 20% 45%)" fontFamily="system-ui" fontStyle="italic">{sign}</text>
              {planets.map((p, i) => (
                <text key={p.id} x={hcx} y={hcy + 11 + i * 9} textAnchor="middle" fontSize="8" fontWeight="600" fill="hsl(220 15% 78%)" fontFamily="system-ui">
                  {PLANET_ABBREVIATIONS[p.id] ?? p.id.slice(0,2)}
                </text>
              ))}
            </g>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="7" fill="hsl(258 60% 55%)" fontFamily="system-ui" fontWeight="500">{div.ascendant.slice(0,3).toUpperCase()}</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="5.5" fill="hsl(258 30% 38%)" fontFamily="system-ui" letterSpacing="1">{div.division}</text>
      </svg>
    </div>
  );
}
