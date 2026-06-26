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

type TabId = 'chart' | 'planets' | 'dashas' | 'yogas';

const TABS: { id: TabId; label: string }[] = [
  { id: 'chart', label: 'Chart' },
  { id: 'planets', label: 'Planets' },
  { id: 'dashas', label: 'Dashas' },
  { id: 'yogas', label: 'Yogas' },
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
              </div>
            </div>
          )}
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
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
