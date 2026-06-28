'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Users, Sparkles, ChevronDown, Loader2, BarChart3, Brain } from 'lucide-react';
import { getAllProfiles, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart } from '@luckyray/shared';
import { computeGunaMilan, getMoonDataFromLongitude } from '@luckyray/jyotish';
import type { GunaMilanResult, KootaScore } from '@luckyray/jyotish';
import { buildChartContext, serializeChartContext } from '@luckyray/ai';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProfileWithChart {
  profile: Profile;
  chart: StoredChart | null;
}

type MatchMode = 'traditional' | 'ai';

export default function MatchmakingPage() {
  const [profiles, setProfiles] = useState<ProfileWithChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [person1, setPerson1] = useState('');
  const [person2, setPerson2] = useState('');
  const [result, setResult] = useState<GunaMilanResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('traditional');
  const [aiResponse, setAiResponse] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const getP = (id: string) => profiles.find(p => p.profile.id === id);

  const handleTraditionalMatch = async () => {
    const p1 = getP(person1);
    const p2 = getP(person2);
    if (!p1?.chart || !p2?.chart) return;
    setMatching(true);
    setResult(null);
    setAiResponse('');
    try {
      const moon1 = p1.chart.chart.planets.find(p => p.id === 'Moon');
      const moon2 = p2.chart.chart.planets.find(p => p.id === 'Moon');
      if (!moon1 || !moon2) return;
      const d1 = getMoonDataFromLongitude(moon1.siderealLongitude);
      const d2 = getMoonDataFromLongitude(moon2.siderealLongitude);
      const r = computeGunaMilan({
        person1Name: p1.profile.name,
        person1NakshatraIndex: d1.nakshatraIndex,
        person1SignIndex: d1.signIndex,
        person2Name: p2.profile.name,
        person2NakshatraIndex: d2.nakshatraIndex,
        person2SignIndex: d2.signIndex,
      });
      setResult(r);
    } finally {
      setMatching(false);
    }
  };

  const handleAiMatch = async () => {
    const p1 = getP(person1);
    const p2 = getP(person2);
    if (!p1?.chart || !p2?.chart) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAiStreaming(true);
    setAiResponse('');
    setResult(null);
    try {
      const ctx1 = serializeChartContext(buildChartContext(p1.chart.chart, `Chart for ${p1.profile.name}`));
      const ctx2 = serializeChartContext(buildChartContext(p2.chart.chart, `Chart for ${p2.profile.name}`));
      const prompt = `Perform a comprehensive Jyotish matchmaking analysis between:

PERSON 1 — ${p1.profile.name}:
${ctx1}

PERSON 2 — ${p2.profile.name}:
${ctx2}

Provide: 1) Compatibility assessment (Moon nakshatra, 7th house lords, Venus-Mars), 2) Marriage timing window, 3) Overall verdict direct and specific, 4) Key challenges, 5) Long-term prognosis. No disclaimers.`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemMode: 'astrologer',
          stream: true,
        }),
        signal: ctrl.signal,
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value);
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            setAiResponse(prev => prev + delta);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setAiResponse('Analysis failed. Please try again.');
      }
    } finally {
      setAiStreaming(false);
    }
  };

  const canMatch = person1 && person2 && person1 !== person2 &&
    getP(person1)?.chart && getP(person2)?.chart;

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader title="Matchmaking" description="Jyotish compatibility analysis" />
          <div className="flex-1 overflow-auto pb-24 md:pb-0">
            <PageContent className="max-w-3xl space-y-6">
              {loading ? (
                <Skeleton lines={4} />
              ) : profiles.length < 2 ? (
                <div className="text-center py-16 space-y-3">
                  <Users size={36} className="mx-auto text-content-subtle" />
                  <p className="text-content-muted text-sm">Add at least two profiles to compare compatibility.</p>
                  <Button variant="primary" onClick={() => { window.location.href = '/profiles/new'; }}>Create Profile</Button>
                </div>
              ) : (
                <>
                  {/* Mode selection */}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { mode: 'traditional' as MatchMode, icon: <BarChart3 size={20} className="text-accent mb-2" />, title: 'Traditional', desc: 'Ashtakoot Guna Milan — deterministic 36-point system' },
                      { mode: 'ai' as MatchMode, icon: <Brain size={20} className="text-accent mb-2" />, title: 'AI Model', desc: 'Deep chart synastry with Dasha, KP, and timing analysis' },
                    ]).map(({ mode, icon, title, desc }) => (
                      <button
                        key={mode}
                        onClick={() => setMatchMode(mode)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          matchMode === mode
                            ? 'border-accent bg-accent-subtle/20'
                            : 'border-surface-border bg-surface-elevated hover:border-accent-muted',
                        )}
                      >
                        {icon}
                        <div className="text-sm font-semibold text-content">{title}</div>
                        <div className="text-xs text-content-muted mt-1">{desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Profile selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <ProfileSelector label="Person 1" value={person1} onChange={setPerson1} profiles={profiles} excludeId={person2} />
                    <ProfileSelector label="Person 2" value={person2} onChange={setPerson2} profiles={profiles} excludeId={person1} />
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!canMatch || matching || aiStreaming}
                    loading={matching || aiStreaming}
                    onClick={matchMode === 'traditional' ? handleTraditionalMatch : handleAiMatch}
                    className="w-full"
                  >
                    {matchMode === 'traditional' ? (
                      <><BarChart3 size={16} /> Calculate Compatibility</>
                    ) : (
                      <><Sparkles size={16} /> Analyse with AI</>
                    )}
                  </Button>

                  {result && matchMode === 'traditional' && <TraditionalResult result={result} />}

                  {(aiResponse || aiStreaming) && matchMode === 'ai' && (
                    <div className="rounded-xl border border-surface-border bg-surface-elevated p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain size={16} className="text-accent" />
                        <span className="text-sm font-semibold text-content">AI Compatibility Analysis</span>
                        {aiStreaming && <Loader2 size={14} className="text-accent animate-spin" />}
                      </div>
                      <div className="prose prose-sm prose-invert max-w-none text-content-muted prose-headings:text-content prose-strong:text-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown>
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

function ProfileSelector({ label, value, onChange, profiles, excludeId }: {
  label: string; value: string; onChange: (v: string) => void;
  profiles: ProfileWithChart[]; excludeId: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-content-muted uppercase tracking-wider">{label}</label>
      <div className="space-y-2">
        {profiles.filter(p => p.profile.id !== excludeId).map(p => (
          <button
            key={p.profile.id}
            onClick={() => onChange(p.profile.id)}
            disabled={!p.chart}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-left transition-colors',
              value === p.profile.id
                ? 'border-accent bg-accent-subtle/20'
                : 'border-surface-border bg-surface-elevated hover:border-accent-muted',
              !p.chart && 'opacity-40 cursor-not-allowed',
            )}
          >
            <div className="text-sm font-medium text-content">{p.profile.name}</div>
            {!p.chart
              ? <div className="text-2xs text-content-subtle">No chart — generate chart first</div>
              : <div className="text-2xs text-content-subtle">
                  {p.chart.chart.ascendant.sign} · Moon {p.chart.chart.planets.find(pl => pl.id === 'Moon')?.sign}
                </div>
            }
          </button>
        ))}
      </div>
    </div>
  );
}

function TraditionalResult({ result }: { result: GunaMilanResult }) {
  const [expanded, setExpanded] = useState(false);
  const pct = (result.totalScore / 36) * 100;
  const verdictColor = result.verdict === 'Excellent' ? 'text-emerald-400'
    : result.verdict === 'Good' ? 'text-green-400'
    : result.verdict === 'Average' ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-content-muted font-semibold uppercase tracking-wider">Ashtakoot Score</div>
          <div className={cn('text-3xl font-bold mt-1', verdictColor)}>
            {result.totalScore} / {result.maxScore}
          </div>
          <Badge
            variant={result.verdict === 'Excellent' || result.verdict === 'Good' ? 'success' : result.verdict === 'Average' ? 'warning' : 'error'}
            className="mt-1"
          >
            {result.verdict}
          </Badge>
        </div>
        <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={pct >= 72 ? '#4ade80' : pct >= 50 ? '#facc15' : '#f87171'}
            strokeWidth="10"
            strokeDasharray={`${pct * 2.51} ${251 - pct * 2.51}`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {result.verdictDetail && (
        <p className="text-sm text-content-muted leading-relaxed">{result.verdictDetail}</p>
      )}

      {result.hasNadiDosha && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          ⚠ Nadi Dosha present — consider remedies
        </div>
      )}
      {result.hasBhakootDosha && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
          ⚠ Bhakoot Dosha present — Moon sign compatibility tension
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-content-muted hover:text-content transition-colors"
      >
        <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Hide' : 'Show'} Koota breakdown ({result.kootas.length} kootas)
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {result.kootas.map((k: KootaScore) => (
            <div key={k.koota} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
              <div>
                <div className="text-xs font-medium text-content">{k.koota}</div>
                {k.detail && (
                  <div className="text-2xs text-content-subtle">{k.detail}</div>
                )}
              </div>
              <div className="text-right">
                <span className={cn(
                  'text-sm font-bold',
                  k.score === k.maxPoints ? 'text-emerald-400' : k.score === 0 ? 'text-red-400' : 'text-content',
                )}>
                  {k.score}
                </span>
                <span className="text-content-subtle text-2xs">/{k.maxPoints}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
