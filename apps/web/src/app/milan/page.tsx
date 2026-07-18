'use client';

import { useEffect, useState } from 'react';
import { Heart, Users } from 'lucide-react';
import { getAllProfiles, getLatestChart, saveMatch } from '@luckyray/storage';
import { computeCompatibility } from '@luckyray/jyotish';
import type { Profile, StoredChart, CompatibilityResult, CanonicalChart } from '@luckyray/shared';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorCard } from '@/components/ui/error-card';
import { useAppStore } from '@/store/app-store';
import { MilanResult } from '@/components/milan/milan-result';
import { useTranslation } from '@/hooks/use-translation';

interface ProfileWithChart {
  profile: Profile;
  chart: StoredChart | null;
}

export default function MilanPage() {
  const [profiles, setProfiles] = useState<ProfileWithChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [personA, setPersonA] = useState('');
  const [personB, setPersonB] = useState('');
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<{ chartA: CanonicalChart; chartB: CanonicalChart } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToast = useAppStore(s => s.addToast);
  const t = useTranslation();

  useEffect(() => {
    getAllProfiles().then(async (profs) => {
      const withCharts = await Promise.all(
        profs.map(async (p) => ({
          profile: p,
          chart: (await getLatestChart(p.id)) ?? null,
        })),
      );
      setProfiles(withCharts);
      setLoading(false);
    });
  }, []);

  const handleAnalyze = async () => {
    const pA = profiles.find(p => p.profile.id === personA);
    const pB = profiles.find(p => p.profile.id === personB);
    if (!pA?.chart || !pB?.chart) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setSelectedCharts(null);

    try {
      const compatibility = computeCompatibility({ chartA: pA.chart.chart, chartB: pB.chart.chart });
      const now = new Date().toISOString();
      await saveMatch({
        id: crypto.randomUUID(),
        profileAId: pA.profile.id,
        profileBId: pB.profile.id,
        result: compatibility,
        createdAt: now,
        updatedAt: now,
      });
      setResult(compatibility);
      setSelectedCharts({ chartA: pA.chart.chart, chartB: pB.chart.chart });
      addToast({ type: 'success', message: 'Compatibility analysis saved' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Compatibility analysis failed';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setAnalyzing(false);
    }
  };

  const chartedProfiles = profiles.filter(p => p.chart);
  const options = chartedProfiles.map(p => ({
    value: p.profile.id,
    label: p.profile.name,
  }));

  const canAnalyze = personA && personB && personA !== personB;

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader title={t.milan.title} description={t.milan.description} />
          <PageContent className="max-w-3xl mx-auto space-y-6">
            {loading ? (
              <Skeleton lines={4} />
            ) : chartedProfiles.length < 2 ? (
              <EmptyState
                icon={<Users size={40} />}
                title={t.milan.noProfiles}
                description={t.milan.noProfilesDesc}
                action={{ label: t.profiles.createProfile, onClick: () => { window.location.href = '/profiles/new'; } }}
              />
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    label={t.milan.personA}
                    value={personA}
                    onChange={(e) => {
                      setPersonA(e.target.value);
                      setResult(null);
                    }}
                    options={[{ value: '', label: `${t.milan.selectProfile}…` }, ...options]}
                  />
                  <Select
                    label={t.milan.personB}
                    value={personB}
                    onChange={(e) => {
                      setPersonB(e.target.value);
                      setResult(null);
                    }}
                    options={[{ value: '', label: `${t.milan.selectProfile}…` }, ...options]}
                  />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={!canAnalyze}
                  loading={analyzing}
                  onClick={handleAnalyze}
                  className="w-full"
                >
                  <Heart size={16} />
                  {analyzing ? t.milan.analyzing : t.milan.analyze}
                </Button>

                {error && <ErrorCard title="Analysis failed" message={error} />}

                {result && selectedCharts && (
                  <MilanResult
                    result={result}
                    chartA={selectedCharts.chartA}
                    chartB={selectedCharts.chartB}
                  />
                )}
              </>
            )}
          </PageContent>
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}
