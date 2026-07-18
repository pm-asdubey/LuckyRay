'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, MessageCircle, Download, Edit2, CalendarDays, FileText, Flame } from 'lucide-react';
import { getProfile, getLatestChart, saveChart } from '@luckyray/storage';
import type { Profile, StoredChart } from '@luckyray/shared';
import { generateChart } from '@luckyray/jyotish';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav, Avatar } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { ChartViewer } from '@/components/chart/chart-viewer';
import { PlanetCard } from '@/components/chart/planet-card';
import { DashaTimeline } from '@/components/chart/dasha-timeline';
import { YogaList } from '@/components/chart/yoga-list';
import { ShadbalTable } from '@/components/chart/shadbal-table';
import { ManglikView } from '@/components/chart/manglik-view';
import { DivisionalView } from '@/components/chart/divisional-view';
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { formatShortDate, downloadJson, formatDegrees } from '@/lib/utils';
import { exportChartAsJson } from '@luckyray/storage';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { translateSign, translatePlanet, translateNakshatra } from '@/lib/i18n';

type TabId = 'chart' | 'planets' | 'dashas' | 'yogas' | 'kp' | 'shadbal' | 'manglik' | 'divisional';

export default function ChartPage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('chart');
  const { addToast, setActiveProfile, setActiveChart, isGeneratingChart, setIsGeneratingChart } = useAppStore();
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
      if (!p) {
        setError('Profile not found');
        return;
      }
      setProfile(p);
      setActiveProfile(p);
      if (c) {
        setStoredChart(c);
        setActiveChart(c);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [params.profileId, setActiveProfile, setActiveChart]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateChart = async () => {
    if (!profile || generating) return;
    setGenerating(true);
    setIsGeneratingChart(true);
    setError(null);

    try {
      const result = generateChart({
        profile: { id: profile.id, name: profile.name, gender: profile.gender },
        birthDetails: profile.birthDetails,
      });

      if (!result.success) {
        setError(result.error + (result.details ? `: ${result.details}` : ''));
        return;
      }

      const now = new Date().toISOString();
      const stored: StoredChart = {
        id: crypto.randomUUID(),
        profileId: profile.id,
        schemaVersion: '1.0',
        chart: result.chart,
        generatedAt: now,
        engineVersion: '1.0.0',
      };

      await saveChart(stored);
      setStoredChart(stored);
      setActiveChart(stored);
      addToast({ type: 'success', message: `Chart generated in ${result.durationMs}ms` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chart generation failed';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setGenerating(false);
      setIsGeneratingChart(false);
    }
  };

  const handleExport = () => {
    if (!storedChart) return;
    const json = exportChartAsJson(storedChart);
    downloadJson(json, `luckyray-chart-${profile?.name?.replace(/\s+/g, '-') ?? 'export'}-${new Date().toISOString().slice(0, 10)}.json`);
    addToast({ type: 'success', message: 'Chart exported' });
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-64 w-64 rounded-xl" />
              <Skeleton lines={5} />
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
              <ErrorCard
                title={t.chart.profileNotFound}
                message={t.chart.profileDeleted}
                onRetry={load}
              />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  const chart = storedChart?.chart;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'chart',       label: t.chart.tabs.chart },
    { id: 'planets',     label: t.chart.tabs.planets },
    { id: 'dashas',      label: t.chart.tabs.dashas },
    { id: 'yogas',       label: t.chart.tabs.yogas },
    { id: 'kp',          label: t.chart.tabs.kp },
    { id: 'manglik',     label: t.chart.tabs.manglik },
    { id: 'divisional',  label: t.chart.tabs.divisional },
  ];

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader
            title={profile.name}
            description={`${formatShortDate(profile.birthDetails.date)} · ${profile.birthDetails.place}`}
            back={
              <Link href="/profiles">
                <Button variant="icon" size="sm" aria-label={t.newProfile.backToProfiles}>
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
            actions={
              <div className="flex items-center gap-2">
                {chart && (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download size={14} />
                      <span className="hidden sm:inline">{t.chart.export}</span>
                    </Button>
                    <Link href={`/dasha/${profile.id}`}>
                      <Button variant="ghost" size="sm">
                        <CalendarDays size={14} />
                        <span className="hidden sm:inline">{t.chart.dashas}</span>
                      </Button>
                    </Link>
                    <Link href={`/reports/${profile.id}`}>
                      <Button variant="ghost" size="sm">
                        <FileText size={14} />
                        <span className="hidden sm:inline">{t.chart.reports}</span>
                      </Button>
                    </Link>
                    <Link href={`/chat/${profile.id}`}>
                      <Button variant="secondary" size="sm">
                        <MessageCircle size={14} />
                        <span className="hidden sm:inline">{t.chart.chat}</span>
                      </Button>
                    </Link>
                  </>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  loading={generating}
                  onClick={handleGenerateChart}
                >
                  <RefreshCw size={14} />
                  <span className="hidden sm:inline">{chart ? t.chart.regenerate : t.chart.generateChart}</span>
                </Button>
                <Link href={`/profiles/${profile.id}/edit`}>
                  <Button variant="icon" size="sm" aria-label={t.common.edit}>
                    <Edit2 size={14} />
                  </Button>
                </Link>
              </div>
            }
          />

          {error && (
            <div className="px-6 pt-4">
              <ErrorCard
                title={t.chart.generationFailed}
                message={error}
                onRetry={handleGenerateChart}
              />
            </div>
          )}

          {!chart && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-accent-subtle border border-accent-muted flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-accent">
                  <path d="M16 2L19 12H29L21 18L24 28L16 22L8 28L11 18L3 12H13L16 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-content">{t.chart.generateYourChart}</h2>
                <p className="text-sm text-content-muted max-w-xs leading-relaxed">
                  {t.chart.generateDesc}
                </p>
              </div>
              <Button variant="primary" loading={generating} onClick={handleGenerateChart}>
                {t.chart.generateChart}
              </Button>
            </div>
          )}

          {chart && (
            <div className="flex-1 overflow-auto pb-24 md:pb-0">
              {/* Ascendant header */}
              <div className="px-6 pt-4 pb-3 border-b border-surface-border">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={profile.name} />
                  <div>
                    <div className="text-xs text-content-muted">{t.chart.lagna}</div>
                    <div className="text-sm font-semibold text-content">
                      {translateSign(chart.ascendant.sign, language)} {formatDegrees(chart.ascendant.degree, chart.ascendant.minute)}
                      <span className="text-xs text-content-muted font-normal ml-2">
                        {translateNakshatra(chart.ascendant.nakshatra, language)} Pada {chart.ascendant.pada}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {chart.yogas.filter(y => y.detected).length > 0 && (
                      <Badge variant="gold">
                        {chart.yogas.filter(y => y.detected).length} Yoga{chart.yogas.filter(y => y.detected).length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Badge variant="default">
                      {chart.metadata.assumptions[0]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0 border-b border-surface-border px-6">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-3 text-sm border-b-2 transition-colors -mb-px',
                      activeTab === tab.id
                        ? 'border-accent text-accent'
                        : 'border-transparent text-content-muted hover:text-content',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'chart' && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-80 flex-shrink-0">
                      <ChartViewer chart={chart} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <HouseSummary houses={chart.houses} />
                    </div>
                  </div>
                )}

                {activeTab === 'planets' && (
                  <div className="space-y-3 max-w-2xl">
                    {chart.planets.map(planet => (
                      <PlanetCard key={planet.id} planet={planet} />
                    ))}
                  </div>
                )}

                {activeTab === 'dashas' && (
                  <div className="max-w-xl">
                    <DashaTimeline dashas={chart.dashas} profileId={profile.id} />
                  </div>
                )}

                {activeTab === 'yogas' && (
                  <div className="max-w-2xl">
                    <YogaList yogas={chart.yogas} />
                  </div>
                )}

                {activeTab === 'kp' && (
                  <KPView kp={chart.kp} />
                )}

                {activeTab === 'shadbal' && (
                  <ShadbalTable planets={chart.planets} />
                )}

                {activeTab === 'manglik' && (
                  <ManglikView chart={chart} />
                )}

                {activeTab === 'divisional' && (
                  <DivisionalView chart={chart} />
                )}
              </div>
            </div>
          )}
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}

// ─── KP View ─────────────────────────────────────────────────────────────────

const LEVEL_COLORS = [
  'text-violet-400',   // L1
  'text-blue-400',     // L2
  'text-teal-400',     // L3
  'text-slate-400',    // L4
];

function KPView({ kp }: { kp: import('@luckyray/shared').KPData | null | undefined }) {
  const [sigView, setSigView] = useState<'by-house' | 'by-planet'>('by-house');
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const kpT = t.chart.kp;

  if (!kp) {
    return (
      <div className="text-sm text-content-muted p-4 rounded-xl border border-dashed border-surface-border">
        {kpT.notAvailable}
      </div>
    );
  }

  const hasLevelData = kp.significators.length > 0 && Array.isArray(kp.significators[0]?.level1);

  const planetDetailMap = new Map<string, { house: number; level: 1|2|3|4 }[]>();
  for (const hs of kp.significators) {
    const add = (p: string, lvl: 1|2|3|4) => {
      const arr = planetDetailMap.get(p) ?? [];
      arr.push({ house: hs.house, level: lvl });
      planetDetailMap.set(p, arr);
    };
    (hs.level1 ?? []).forEach(p => add(p, 1));
    (hs.level2 ?? []).forEach(p => add(p, 2));
    (hs.level3 ?? []).forEach(p => add(p, 3));
    (hs.level4 ?? []).forEach(p => add(p, 4));
    if (!hasLevelData) {
      (hs.significators ?? []).forEach(p => add(p, 3));
    }
  }

  const levelLegend = [
    ['L1', kpT.l1Desc, 0],
    ['L2', kpT.l2Desc, 1],
    ['L3', kpT.l3Desc, 2],
    ['L4', kpT.l4Desc, 3],
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      {!hasLevelData && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 px-3 py-2 text-2xs text-amber-400">
          {kpT.oldDataBanner}
          <strong className="text-amber-300"> {kpT.oldDataAction}</strong> {kpT.oldDataSuffix}
        </div>
      )}

      <p className="text-2xs text-content-subtle bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
        {kpT.systemNote}
      </p>

      {/* House Cusps */}
      <section>
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-3">
          {kpT.placidusHouseCusps}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {kp.cusps.map(cusp => {
            const deg = Math.floor(cusp.degreesInSign);
            const min = Math.round((cusp.degreesInSign - deg) * 60);
            return (
              <div key={cusp.house} className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-md bg-accent-subtle flex items-center justify-center text-2xs font-bold text-accent flex-shrink-0">
                    {cusp.house}
                  </span>
                  <span className="text-xs font-medium text-content">{translateSign(cusp.sign, language)} {deg}°{String(min).padStart(2,'0')}'</span>
                </div>
                <div className="text-2xs text-content-subtle leading-tight">{translateNakshatra(cusp.nakshatra, language)}</div>
                <div className="text-2xs text-content-muted leading-tight">
                  ⋆ {translatePlanet(cusp.nakshatraLord, language)} &nbsp;·&nbsp; Sub: {translatePlanet(cusp.subLord, language)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4-Level Significator Table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
            {kpT.houseSignificators}
          </h3>
          <div className="flex rounded-lg border border-surface-border overflow-hidden text-2xs">
            {(['by-house', 'by-planet'] as const).map(v => (
              <button
                key={v}
                onClick={() => setSigView(v)}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  sigView === v ? 'bg-accent-subtle text-accent' : 'text-content-muted hover:text-content',
                )}
              >
                {v === 'by-house' ? kpT.byHouse : kpT.byPlanet}
              </button>
            ))}
          </div>
        </div>

        {/* Level legend */}
        <div className="flex flex-wrap gap-3 mb-3 text-2xs">
          {levelLegend.map(([label, desc, idx]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={cn('font-bold', LEVEL_COLORS[idx])}>{label}</span>
              <span className="text-content-subtle">{desc}</span>
            </span>
          ))}
        </div>

        {sigView === 'by-house' ? (
          <div className="rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full text-2xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated">
                  <th className="text-left px-3 py-2 text-content-muted font-medium w-10">H</th>
                  <th className={cn('text-left px-3 py-2 font-medium', LEVEL_COLORS[0])}>{kpT.l1Occupants}</th>
                  <th className={cn('text-left px-3 py-2 font-medium', LEVEL_COLORS[1])}>{kpT.l2Star}</th>
                  <th className={cn('text-left px-3 py-2 font-medium', LEVEL_COLORS[2])}>{kpT.l3SignLord}</th>
                  <th className={cn('text-left px-3 py-2 font-medium', LEVEL_COLORS[3])}>{kpT.l4StarOfLord}</th>
                </tr>
              </thead>
              <tbody>
                {kp.significators.map((hs, i) => (
                  <tr key={hs.house} className={cn('border-b border-surface-border/50', i % 2 === 1 && 'bg-surface-elevated/30')}>
                    <td className="px-3 py-1.5 font-bold text-accent">{hs.house}</td>
                    <td className={cn('px-3 py-1.5', LEVEL_COLORS[0])}>{(hs.level1 ?? []).map(p => translatePlanet(p, language)).join(', ') || '—'}</td>
                    <td className={cn('px-3 py-1.5', LEVEL_COLORS[1])}>{(hs.level2 ?? []).map(p => translatePlanet(p, language)).join(', ') || '—'}</td>
                    <td className={cn('px-3 py-1.5', LEVEL_COLORS[2])}>{(hs.level3 ?? []).map(p => translatePlanet(p, language)).join(', ') || '—'}</td>
                    <td className={cn('px-3 py-1.5', LEVEL_COLORS[3])}>{(hs.level4 ?? []).map(p => translatePlanet(p, language)).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full text-2xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated">
                  <th className="text-left px-3 py-2 text-content-muted font-medium">{kpT.planet}</th>
                  <th className="text-left px-3 py-2 text-content-muted font-medium">{kpT.signifies}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(planetDetailMap.entries()).map(([planet, detail], i) => (
                  <tr key={planet} className={cn('border-b border-surface-border/50', i % 2 === 1 && 'bg-surface-elevated/30')}>
                    <td className="px-3 py-1.5 font-semibold text-content">{translatePlanet(planet, language)}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex flex-wrap gap-1">
                        {detail.sort((a,b) => a.house - b.house).map((d, j) => (
                          <span key={j} className={cn('rounded px-1 py-0.5 font-mono', LEVEL_COLORS[d.level - 1])}>
                            H{d.house}<span className="opacity-60">·L{d.level}</span>
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ruling Planets */}
      <section>
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-2">
          {kpT.rulingPlanets}
        </h3>
        <div className="flex flex-wrap gap-2 text-xs text-content-muted">
          {[
            [kpT.ascStarLord, kp.rulingPlanets.ascStarLord],
            [kpT.ascSubLord, kp.rulingPlanets.ascSubLord],
            [kpT.moonStar, kp.rulingPlanets.moonStarLord],
            [kpT.moonSub, kp.rulingPlanets.moonSubLord],
            [kpT.dayLord, kp.rulingPlanets.dayLord],
          ].map(([label, value]) => (
            <span key={label} className="rounded-md bg-surface-elevated border border-surface-border px-2 py-1">
              {label}: <strong className="text-content">{translatePlanet(value ?? '', language)}</strong>
            </span>
          ))}
        </div>
      </section>

    </div>
  );
}

function HouseSummary({ houses }: { houses: import('@luckyray/shared').HouseData[] }) {
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
        {t.chart.houseSummary}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {houses.map(house => (
          <div
            key={house.number}
            className="flex items-start gap-2.5 rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5"
          >
            <div className="flex-shrink-0 h-6 w-6 rounded-md bg-accent-subtle flex items-center justify-center text-2xs font-bold text-accent">
              {house.number}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-content">
                {translateSign(house.sign, language)}
                <span className="text-content-muted font-normal ml-1">· {t.chart.lord}: {translatePlanet(house.lord, language)}</span>
              </div>
              {house.occupants.length > 0 && (
                <div className="text-2xs text-content-muted mt-0.5">
                  {house.occupants.map(p => translatePlanet(p, language)).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
