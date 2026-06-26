'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Users, Sparkles, ChevronDown, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getAllProfiles, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart } from '@luckyray/shared';
import { computeGunaMilan, getMoonDataFromLongitude } from '@luckyray/jyotish';
import type { GunaMilanResult, KootaScore } from '@luckyray/jyotish';
import { buildChartContext } from '@luckyray/ai';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProfileWithChart {
  profile: Profile;
  chart: StoredChart | null;
}

// ─── Score Gauge ──────────────────────────────────────────────────────────

function ScoreGauge({ score, max = 36 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color = pct >= 88 ? '#4ade80' : pct >= 66 ? '#a78bfa' : pct >= 50 ? '#facc15' : '#f87171';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${pct * 2.51} ${251 - pct * 2.51}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-2xs text-content-subtle">/ {max}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Koota Row ────────────────────────────────────────────────────────────

function KootaRow({ koota }: { koota: KootaScore }) {
  const pct = koota.score / koota.maxPoints;
  const color = pct >= 0.8 ? 'bg-green-500' : pct >= 0.5 ? 'bg-violet-500' : pct >= 0.25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-28 text-xs font-medium text-content shrink-0">{koota.koota}</div>
      <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="w-12 text-right text-xs text-content-muted shrink-0">
        {koota.score}<span className="text-content-subtle">/{koota.maxPoints}</span>
      </div>
      <div className="w-44 text-2xs text-content-subtle hidden sm:block truncate">{koota.detail}</div>
    </div>
  );
}

// ─── Profile Selector ─────────────────────────────────────────────────────

function ProfileSelector({
  label,
  profiles,
  selectedId,
  onSelect,
  excludeId,
}: {
  label: string;
  profiles: ProfileWithChart[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const selected = profiles.find(p => p.profile.id === selectedId);

  return (
    <div className="relative">
      <label className="text-2xs text-content-subtle uppercase tracking-wider block mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm text-left transition-colors',
          'bg-surface-elevated border-surface-border hover:border-accent-muted',
          open && 'border-accent-muted',
        )}
      >
        {selected ? (
          <span className="text-content font-medium">{selected.profile.name}
            {!selected.chart && <span className="ml-2 text-2xs text-amber-400">(no chart)</span>}
          </span>
        ) : (
          <span className="text-content-subtle">Select a profile…</span>
        )}
        <ChevronDown size={14} className={cn('shrink-0 text-content-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-surface-border bg-surface shadow-xl overflow-hidden">
          {profiles.filter(p => p.profile.id !== excludeId).map(p => (
            <button
              key={p.profile.id}
              type="button"
              onClick={() => { onSelect(p.profile.id); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-surface-elevated transition-colors',
                selectedId === p.profile.id && 'bg-accent-subtle text-accent',
              )}
            >
              <span>{p.profile.name}</span>
              {!p.chart && <span className="text-2xs text-amber-400">no chart</span>}
            </button>
          ))}
          {profiles.filter(p => p.profile.id !== excludeId).length === 0 && (
            <p className="px-3 py-2.5 text-xs text-content-muted">No other profiles</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Elaborate Streaming Analysis ────────────────────────────────────────

const MAX_CONTINUATION = 6;

async function streamElaborate(
  body: object,
  onToken: (t: string) => void,
): Promise<{ done: boolean; finishReason: string | null; text: string }> {
  const res = await fetch('/api/ai/matchmaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream');
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  let finishReason: string | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.trim();
      if (!line || line === 'data: [DONE]') continue;
      if (!line.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(line.slice(6));
        const choice = json.choices?.[0];
        const delta = choice?.delta?.content;
        if (delta) { text += delta; onToken(delta); }
        if (choice?.finish_reason && choice.finish_reason !== 'null') {
          finishReason = choice.finish_reason;
        }
      } catch { /* ignore */ }
    }
  }
  return { done: true, finishReason, text };
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function GunaMilanPage() {
  const [profiles, setProfiles] = useState<ProfileWithChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [id1, setId1] = useState<string | null>(null);
  const [id2, setId2] = useState<string | null>(null);
  const [result, setResult] = useState<GunaMilanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Elaborate mode
  const [elaborateText, setElaborateText] = useState('');
  const [elaborateStatus, setElaborateStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const elaborateRef = useRef<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllProfiles().then(async ps => {
      const items = await Promise.all(
        ps.map(async profile => ({ profile, chart: (await getLatestChart(profile.id)) ?? null })),
      );
      setProfiles(items);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [elaborateText]);

  const compute = useCallback(() => {
    setError(null);
    setResult(null);
    setElaborateText('');
    setElaborateStatus('idle');

    const p1 = profiles.find(p => p.profile.id === id1);
    const p2 = profiles.find(p => p.profile.id === id2);
    if (!p1 || !p2) return;

    if (!p1.chart || !p2.chart) {
      setError('Both profiles must have a generated chart. Go to the Chart page for each profile first.');
      return;
    }

    const moon1 = p1.chart.chart.planets.find(p => p.id === 'Moon');
    const moon2 = p2.chart.chart.planets.find(p => p.id === 'Moon');

    if (!moon1 || !moon2) {
      setError('Could not find Moon data in one of the charts.');
      return;
    }

    const data1 = getMoonDataFromLongitude(moon1.siderealLongitude);
    const data2 = getMoonDataFromLongitude(moon2.siderealLongitude);

    setResult(computeGunaMilan({
      person1Name: p1.profile.name,
      person1NakshatraIndex: data1.nakshatraIndex,
      person1SignIndex: data1.signIndex,
      person2Name: p2.profile.name,
      person2NakshatraIndex: data2.nakshatraIndex,
      person2SignIndex: data2.signIndex,
    }));
  }, [profiles, id1, id2]);

  const generateElaborate = useCallback(async () => {
    if (!id1 || !id2) return;
    const p1 = profiles.find(p => p.profile.id === id1);
    const p2 = profiles.find(p => p.profile.id === id2);
    if (!p1?.chart || !p2?.chart || !result) return;

    setElaborateStatus('generating');
    setElaborateText('');
    elaborateRef.current = '';

    const chart1Context = buildChartContext(p1.chart.chart, 'general');
    const chart2Context = buildChartContext(p2.chart.chart, 'general');
    const gunaSummary = [
      `Total Guna Score: ${result.totalScore}/36 — ${result.verdict}`,
      result.kootas.map(k => `${k.koota}: ${k.score}/${k.maxPoints} — ${k.detail}`).join('\n'),
      result.hasNadiDosha ? 'WARNING: Nadi Dosha present.' : '',
      result.hasBhakootDosha ? 'WARNING: Bhakoot Dosha present.' : '',
    ].filter(Boolean).join('\n');

    const baseBody = { chart1Context, chart2Context, gunaMilanSummary: gunaSummary, person1Name: p1.profile.name, person2Name: p2.profile.name };

    try {
      let conversationMessages: { role: 'user' | 'assistant'; content: string }[] = [];
      let allText = '';

      for (let pass = 0; pass < MAX_CONTINUATION; pass++) {
        const bodyToSend = pass === 0
          ? baseBody
          : { ...baseBody, continuationMessages: [...conversationMessages, { role: 'user' as const, content: 'Continue the analysis from where you left off.' }] };

        const { text, finishReason } = await streamElaborate(bodyToSend, token => {
          elaborateRef.current += token;
          setElaborateText(elaborateRef.current);
        });

        allText += text;

        if (finishReason !== 'length') break;

        // Token limit hit — set up continuation context
        if (pass === 0) {
          conversationMessages = [
            { role: 'user', content: `Perform .kdel v2.0 analysis for ${p1.profile.name} and ${p2.profile.name}.` },
            { role: 'assistant', content: text },
          ];
        } else {
          const lastUser = conversationMessages[conversationMessages.length - 1];
          if (lastUser?.role === 'user') {
            conversationMessages = [
              ...conversationMessages.slice(0, -1),
              { role: 'assistant', content: text },
            ];
          }
          conversationMessages.push({ role: 'user', content: 'Continue the analysis from where you left off.' });
          conversationMessages.push({ role: 'assistant', content: text });
        }
      }

      elaborateRef.current = allText;
      setElaborateText(allText);
      setElaborateStatus('done');
    } catch (err) {
      setElaborateStatus('error');
      console.error(err);
    }
  }, [id1, id2, profiles, result]);

  const canCompute = id1 && id2 && id1 !== id2;
  const verdictColors = {
    Excellent: 'text-green-400 border-green-900/40 bg-green-950/20',
    Good:      'text-violet-400 border-violet-900/40 bg-violet-950/20',
    Average:   'text-amber-400 border-amber-900/40 bg-amber-950/20',
    Poor:      'text-red-400 border-red-900/40 bg-red-950/20',
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton lines={3} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8 pb-32 md:pb-8 space-y-8">

            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-accent-subtle border border-accent-muted flex items-center justify-center">
                  <Users size={16} className="text-accent" />
                </div>
                <h1 className="text-xl font-semibold text-content">Kundali Milan</h1>
              </div>
              <p className="text-sm text-content-muted">
                Traditional Ashtakoot matching + AI-powered elaborate compatibility analysis.
              </p>
            </div>

            {profiles.length < 2 && (
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 px-4 py-3 text-sm text-amber-400">
                At least 2 profiles with generated charts are required. Create profiles on the{' '}
                <a href="/profiles" className="underline hover:no-underline">Profiles page</a>.
              </div>
            )}

            {/* Profile Selectors */}
            <div className="grid sm:grid-cols-2 gap-4">
              <ProfileSelector
                label="Person 1"
                profiles={profiles}
                selectedId={id1}
                onSelect={setId1}
                excludeId={id2}
              />
              <ProfileSelector
                label="Person 2"
                profiles={profiles}
                selectedId={id2}
                onSelect={setId2}
                excludeId={id1}
              />
            </div>

            <Button
              variant="primary"
              onClick={compute}
              disabled={!canCompute}
              className="w-full"
            >
              Calculate Ashtakoot Score
            </Button>

            {error && (
              <div className="rounded-xl border border-red-900/40 bg-red-950/10 px-4 py-3 flex items-start gap-2 text-sm text-red-400">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Ashtakoot Results */}
            {result && (
              <div className="space-y-6">
                {/* Score header */}
                <div className="rounded-2xl border border-surface-border bg-surface-elevated p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ScoreGauge score={result.totalScore} max={36} />
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="text-content-subtle text-xs uppercase tracking-wider">
                        {result.person1Name} & {result.person2Name}
                      </div>
                      <div className={cn(
                        'inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold',
                        verdictColors[result.verdict],
                      )}>
                        {result.verdict}
                      </div>
                      <p className="text-xs text-content-muted leading-relaxed">{result.verdictDetail}</p>
                      <div className="flex gap-3 text-2xs text-content-subtle flex-wrap justify-center sm:justify-start">
                        <span>Moon 1: <strong className="text-content">{result.person1Nakshatra}</strong> in {result.person1MoonSign}</span>
                        <span>Moon 2: <strong className="text-content">{result.person2Nakshatra}</strong> in {result.person2MoonSign}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dosha warnings */}
                  {(result.hasNadiDosha || result.hasBhakootDosha) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.hasNadiDosha && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-red-900/40 bg-red-950/10 px-2 py-0.5 text-2xs text-red-400">
                          <AlertTriangle size={10} /> Nadi Dosha
                        </span>
                      )}
                      {result.hasBhakootDosha && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/10 px-2 py-0.5 text-2xs text-amber-400">
                          <AlertTriangle size={10} /> Bhakoot Dosha
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Koota breakdown */}
                <div className="rounded-2xl border border-surface-border bg-surface-elevated px-4 py-4">
                  <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-4">
                    Ashtakoot Breakdown
                  </h3>
                  <div className="divide-y divide-surface-border/50">
                    {result.kootas.map(k => (
                      <KootaRow key={k.koota} koota={k} />
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                    <span className="text-content-subtle">Total score</span>
                    <span className="font-bold text-content">{result.totalScore} / 36</span>
                  </div>
                </div>

                {/* Elaborate Analysis */}
                <div className="rounded-2xl border border-surface-border bg-surface-elevated overflow-hidden">
                  <div className="px-4 py-4 border-b border-surface-border flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-content">Elaborate Analysis</h3>
                      <p className="text-2xs text-content-muted mt-0.5">
                        AI-powered .kdel v2.0 compatibility engine — full psychological + astrological analysis
                      </p>
                    </div>
                    {elaborateStatus !== 'generating' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={generateElaborate}
                      >
                        <Sparkles size={13} />
                        {elaborateStatus === 'done' ? 'Regenerate' : 'Generate'}
                      </Button>
                    )}
                    {elaborateStatus === 'generating' && (
                      <div className="flex items-center gap-1.5 text-xs text-content-muted">
                        <Loader2 size={13} className="animate-spin" />
                        Analysing…
                      </div>
                    )}
                  </div>

                  {elaborateText ? (
                    <div className="px-5 py-5">
                      <div className="prose-chat">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{elaborateText}</ReactMarkdown>
                        {elaborateStatus === 'generating' && (
                          <span className="stream-cursor" aria-hidden="true" />
                        )}
                      </div>
                      {elaborateStatus === 'done' && (
                        <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-1.5 text-2xs text-content-subtle">
                          <CheckCircle2 size={12} className="text-green-500" />
                          Analysis complete
                        </div>
                      )}
                      {elaborateStatus === 'error' && (
                        <div className="mt-3 text-2xs text-red-400">
                          Analysis interrupted. Click Generate to retry.
                        </div>
                      )}
                    </div>
                  ) : elaborateStatus === 'idle' ? (
                    <div className="px-4 py-8 text-center text-sm text-content-muted">
                      Click Generate to run the full .kdel v2.0 analysis.
                      <br />
                      <span className="text-2xs text-content-subtle mt-1 block">
                        This analyses emotional compatibility, psychological dynamics, temporal alignment, and more.
                      </span>
                    </div>
                  ) : null}
                </div>

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    </AppShell>
  );
}
