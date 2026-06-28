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

const SIGNS = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];

export default function DivisionalPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDiv, setActiveDiv] = useState<'D9' | 'D10'>('D9');

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
            title="Divisional Charts"
            description={profile.name}
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label="Back to chart">
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
          />

          <div className="flex-1 overflow-auto pb-24 md:pb-0">
            <PageContent className="max-w-3xl space-y-5">
              {!chart ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <p className="text-content-muted text-sm">No chart generated yet.</p>
                  <Link href={`/chart/${profile.id}`}>
                    <Button variant="primary">Generate Chart First</Button>
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
                          {div.name} · Ascendant: {div.ascendant}
                        </p>
                        {activeDiv === 'D9' && (
                          <p>The Navamsha chart reveals the inner strength of the soul, marriage prospects, and spiritual path. It amplifies or weakens the promise of the natal chart.</p>
                        )}
                        {activeDiv === 'D10' && (
                          <p>The Dashamsha chart (D10) is the primary chart for career, profession, and achievements in the outer world. Strong D10 planets indicate professional success.</p>
                        )}
                      </div>

                      {/* Mini chart wheel */}
                      <MiniDivisionalChart div={div} />

                      {/* Planet table */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                          Planet Positions in {div.name}
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
                                  <div className="text-sm font-semibold text-content">{p.id}</div>
                                  {natalPlanet && (
                                    <div className="text-2xs text-content-subtle">
                                      Natal: {natalPlanet.sign} H{natalPlanet.house}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-content">{p.sign}</div>
                                  <div className="text-2xs text-content-muted">House {p.house}</div>
                                </div>
                                {changedSign && (
                                  <Badge variant="accent">Shifted</Badge>
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

  const W = 280, H = 280, cx = W/2, cy = H/2;

  // Same geometry as ChartViewer but smaller
  const getSign = (housePos: number) => SIGNS[(ascSignIndex + housePos - 1) % 12] ?? '';

  const HOUSES = [
    { poly: `${cx},0 ${W},${cy} ${cx},${cy} 0,${cy}`,  hcx: cx,    hcy: 36 },
    { poly: `0,0 ${cx},0 0,${cy}`,                       hcx: 46,    hcy: 46  },
    { poly: `0,0 0,${cy} ${cx},${cy} 0,${H}`,           hcx: 36,    hcy: cy  },
    { poly: `0,${cy} ${cx},${H} 0,${H}`,                 hcx: 46,    hcy: H-46},
    { poly: `0,${cy} ${cx},${cy} ${W},${cy} ${cx},${H}`,hcx: cx,    hcy: H-36},
    { poly: `${cx},${H} ${W},${cy} ${W},${H}`,           hcx: W-46,  hcy: H-46},
    { poly: `${cx},0 ${W},0 ${W},${H} ${cx},${cy} ${W},${cy}`, hcx: W-36, hcy: cy},
    { poly: `${cx},0 ${W},0 ${W},${cy}`,                 hcx: W-46,  hcy: 46  },
    { poly: `${cx},0 ${W},${cy} ${cx},${cy}`,            hcx: cx+44, hcy: cy-44},
    { poly: `${W},${cy} ${cx},${H} ${cx},${cy}`,         hcx: cx+44, hcy: cy+44},
    { poly: `${cx},${H} 0,${cy} ${cx},${cy}`,            hcx: cx-44, hcy: cy+44},
    { poly: `0,${cy} ${cx},0 ${cx},${cy}`,               hcx: cx-44, hcy: cy-44},
  ];

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px]" aria-label={`${div.name} chart`}>
        <rect x="0" y="0" width={W} height={H} fill="hsl(258 25% 7%)" rx="4" />
        {HOUSES.map(({ poly, hcx, hcy }, idx) => {
          const h = idx + 1;
          const planets = housePlanets.get(h) ?? [];
          const sign = getSign(h);
          return (
            <g key={h}>
              <polygon points={poly} fill="transparent" stroke="hsl(258 30% 18%)" strokeWidth="1" />
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
