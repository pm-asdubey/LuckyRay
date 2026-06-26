'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, MessageCircle, Download, Edit2, CalendarDays, FileText } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { formatShortDate, downloadJson, formatDegrees } from '@/lib/utils';
import { exportChartAsJson } from '@luckyray/storage';
import { cn } from '@/lib/utils';

type TabId = 'chart' | 'planets' | 'dashas' | 'yogas' | 'kp';

const TABS: { id: TabId; label: string }[] = [
  { id: 'chart',   label: 'Chart' },
  { id: 'planets', label: 'Planets' },
  { id: 'dashas',  label: 'Dashas' },
  { id: 'yogas',   label: 'Yogas' },
  { id: 'kp',      label: 'KP' },
];

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
                title="Profile not found"
                message="This profile may have been deleted."
                onRetry={load}
              />
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
            title={profile.name}
            description={`${formatShortDate(profile.birthDetails.date)} · ${profile.birthDetails.place}`}
            back={
              <Link href="/profiles">
                <Button variant="icon" size="sm" aria-label="Back to profiles">
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
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Link href={`/dasha/${profile.id}`}>
                      <Button variant="ghost" size="sm">
                        <CalendarDays size={14} />
                        <span className="hidden sm:inline">Dashas</span>
                      </Button>
                    </Link>
                    <Link href={`/reports/${profile.id}`}>
                      <Button variant="ghost" size="sm">
                        <FileText size={14} />
                        <span className="hidden sm:inline">Reports</span>
                      </Button>
                    </Link>
                    <Link href={`/chat/${profile.id}`}>
                      <Button variant="secondary" size="sm">
                        <MessageCircle size={14} />
                        <span className="hidden sm:inline">Chat</span>
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
                  <span className="hidden sm:inline">{chart ? 'Regenerate' : 'Generate chart'}</span>
                </Button>
                <Link href={`/profiles/${profile.id}/edit`}>
                  <Button variant="icon" size="sm" aria-label="Edit profile">
                    <Edit2 size={14} />
                  </Button>
                </Link>
              </div>
            }
          />

          {error && (
            <div className="px-6 pt-4">
              <ErrorCard
                title="Generation failed"
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
                <h2 className="text-base font-semibold text-content">Generate your chart</h2>
                <p className="text-sm text-content-muted max-w-xs leading-relaxed">
                  Click Generate chart to compute planetary positions and begin your Jyotish analysis.
                </p>
              </div>
              <Button variant="primary" loading={generating} onClick={handleGenerateChart}>
                Generate chart
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
                    <div className="text-xs text-content-muted">Lagna (Ascendant)</div>
                    <div className="text-sm font-semibold text-content">
                      {chart.ascendant.sign} {formatDegrees(chart.ascendant.degree, chart.ascendant.minute)}
                      <span className="text-xs text-content-muted font-normal ml-2">
                        {chart.ascendant.nakshatra} Pada {chart.ascendant.pada}
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

const PROMISE_COLORS = {
  true:  'text-green-400 border-green-900/40 bg-green-950/20',
  false: 'text-red-400 border-red-900/40 bg-red-950/20',
};

const CONFIDENCE_COLORS = {
  high:   'bg-green-900/30 text-green-400 border border-green-800/30',
  medium: 'bg-amber-900/30 text-amber-400 border border-amber-800/30',
  low:    'bg-surface-elevated text-content-muted border border-surface-border',
};

const TOPIC_LABELS: Record<string, string> = {
  career:   'Career & Profession',
  marriage: 'Love & Marriage',
  wealth:   'Wealth & Finance',
  health:   'Health & Vitality',
  children: 'Children',
  foreign:  'Foreign / Travel',
};

function KPView({ kp }: { kp: import('@luckyray/shared').KPData | null | undefined }) {
  const [openTopic, setOpenTopic] = useState<string | null>('career');

  if (!kp) {
    return (
      <div className="text-sm text-content-muted p-4 rounded-xl border border-dashed border-surface-border">
        KP data not available. Regenerate the chart to compute KP analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* System note */}
      <p className="text-2xs text-content-subtle bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
        KP uses <strong className="text-content-muted">Placidus cusps</strong> (not Whole Sign). Planet house positions here may differ from the main chart.
        Sub lords are computed from the Vimshottari table — deterministically, not by AI.
      </p>

      {/* House Cusps */}
      <section>
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-3">
          Placidus House Cusps
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
                  <span className="text-xs font-medium text-content">{cusp.sign} {deg}°{String(min).padStart(2,'0')}'</span>
                </div>
                <div className="text-2xs text-content-subtle leading-tight">
                  {cusp.nakshatra}
                </div>
                <div className="text-2xs text-content-muted leading-tight">
                  ⋆ {cusp.nakshatraLord} &nbsp;·&nbsp; Sub: {cusp.subLord}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ruling Planets */}
      <section>
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-2">
          Ruling Planets
        </h3>
        <div className="flex flex-wrap gap-2 text-xs text-content-muted">
          <span className="rounded-md bg-surface-elevated border border-surface-border px-2 py-1">
            Asc Star Lord: <strong className="text-content">{kp.rulingPlanets.ascStarLord}</strong>
          </span>
          <span className="rounded-md bg-surface-elevated border border-surface-border px-2 py-1">
            Asc Sub Lord: <strong className="text-content">{kp.rulingPlanets.ascSubLord}</strong>
          </span>
          <span className="rounded-md bg-surface-elevated border border-surface-border px-2 py-1">
            Moon Star: <strong className="text-content">{kp.rulingPlanets.moonStarLord}</strong>
          </span>
          <span className="rounded-md bg-surface-elevated border border-surface-border px-2 py-1">
            Moon Sub: <strong className="text-content">{kp.rulingPlanets.moonSubLord}</strong>
          </span>
          <span className="rounded-md bg-surface-elevated border border-surface-border px-2 py-1">
            Day Lord: <strong className="text-content">{kp.rulingPlanets.dayLord}</strong>
          </span>
        </div>
      </section>

      {/* Event Promise & Periods */}
      <section>
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-3">
          Event Promise Analysis
        </h3>
        <p className="text-2xs text-content-subtle mb-3">
          A promise exists when the sub lord of the primary cusp signifies the relevant houses.
          Predicted periods are computed deterministically — no AI required.
        </p>
        <div className="space-y-2">
          {kp.events.map(ev => (
            <div key={ev.topic} className="rounded-xl border border-surface-border overflow-hidden">
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-elevated/50 transition-colors"
                onClick={() => setOpenTopic(openTopic === ev.topic ? null : ev.topic)}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold border',
                    ev.isPromised ? PROMISE_COLORS.true : PROMISE_COLORS.false,
                  )}>
                    {ev.isPromised ? 'PROMISED' : 'UNCLEAR'}
                  </span>
                  <span className="text-sm font-medium text-content">
                    {TOPIC_LABELS[ev.topic] ?? ev.topic}
                  </span>
                  <span className="text-2xs text-content-subtle">
                    H{ev.relevantHouses.join(', H')}
                  </span>
                </div>
                <span className="text-content-subtle text-xs">
                  {openTopic === ev.topic ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded */}
              {openTopic === ev.topic && (
                <div className="border-t border-surface-border px-4 py-4 space-y-4 bg-surface">
                  {/* Promise detail */}
                  <div className="space-y-1">
                    <div className="text-2xs text-content-muted">
                      <strong>H{ev.primaryHouse} Sub Lord:</strong> {ev.primaryCuspSubLord}
                      {' · Signifies: '}
                      {ev.sublordSignifies.length > 0 ? ev.sublordSignifies.map(h => `H${h}`).join(', ') : 'none'}
                    </div>
                    <div className="text-2xs text-content-muted">{ev.promiseReason}</div>
                    <div className="text-2xs text-content-subtle">
                      Significators: {ev.significators.join(' · ') || '—'}
                    </div>
                  </div>

                  {/* Predicted periods */}
                  {ev.predictedPeriods.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-2xs font-semibold text-content-muted uppercase tracking-wider">
                        Predicted Favorable Periods
                      </div>
                      {ev.predictedPeriods.map((period, i) => (
                        <div key={i} className="rounded-lg border border-surface-border p-3 space-y-1 bg-surface-elevated">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-2xs font-semibold rounded px-1.5 py-0.5', CONFIDENCE_COLORS[period.confidence])}>
                              {period.confidence.toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-content">
                              {period.mahadasha} MD / {period.antardasha} AD
                            </span>
                          </div>
                          <div className="text-2xs text-content-subtle">
                            {period.startDate} — {period.endDate}
                          </div>
                          <div className="text-2xs text-content-muted leading-relaxed">
                            {period.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-2xs text-content-muted italic">
                      {ev.isPromised
                        ? 'No upcoming favorable periods found in visible dasha span.'
                        : 'Event not clearly promised — no periods predicted.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HouseSummary({ houses }: { houses: import('@luckyray/shared').HouseData[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
        House summary
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
                {house.sign}
                <span className="text-content-muted font-normal ml-1">· Lord: {house.lord}</span>
              </div>
              {house.occupants.length > 0 && (
                <div className="text-2xs text-content-muted mt-0.5">
                  {house.occupants.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
