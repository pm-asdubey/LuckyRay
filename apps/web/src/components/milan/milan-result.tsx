'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Heart, BarChart3, Flame, Home, Clock, Sparkles, AlertCircle,
} from 'lucide-react';
import type { CompatibilityResult, CanonicalChart } from '@luckyray/shared';
import { buildChartContext } from '@luckyray/ai';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TabId = 'summary' | 'ashtakoot' | 'chemistry' | 'marriage' | 'timing' | 'ai';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'summary', label: 'Summary', icon: <Heart size={14} /> },
  { id: 'ashtakoot', label: 'Ashtakoot', icon: <BarChart3 size={14} /> },
  { id: 'chemistry', label: 'Chemistry', icon: <Flame size={14} /> },
  { id: 'marriage', label: 'Marriage', icon: <Home size={14} /> },
  { id: 'timing', label: 'Timing', icon: <Clock size={14} /> },
  { id: 'ai', label: 'AI Report', icon: <Sparkles size={14} /> },
];

interface MilanResultProps {
  result: CompatibilityResult;
  chartA: CanonicalChart;
  chartB: CanonicalChart;
}

export function MilanResult({ result, chartA, chartB }: MilanResultProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center gap-5 rounded-xl border border-surface-border bg-surface-elevated p-5">
        <ScoreGauge score={result.finalScore} />
        <div className="flex-1 text-center sm:text-left">
          <div className="text-sm text-content-muted">
            {result.profileA.name} & {result.profileB.name}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
            <Badge variant={verdictBadgeVariant(result.verdict)}>{result.verdict}</Badge>
            <span className="text-2xs text-content-subtle">Composite {result.compositeScore}/100</span>
          </div>
        </div>
      </div>

      <div className="flex gap-0 border-b border-surface-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-content-muted hover:text-content',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'summary' && <SummaryTab result={result} />}
        {activeTab === 'ashtakoot' && <AshtakootTab result={result} />}
        {activeTab === 'chemistry' && <ChemistryTab result={result} />}
        {activeTab === 'marriage' && <MarriageTab result={result} />}
        {activeTab === 'timing' && <TimingTab result={result} />}
        {activeTab === 'ai' && <AIReportTab result={result} chartA={chartA} chartB={chartB} />}
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#a78bfa' : pct >= 45 ? '#facc15' : '#f87171';
  const circumference = 2 * Math.PI * 42;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
        <span className="text-2xs text-content-subtle">/ 100</span>
      </div>
    </div>
  );
}

function verdictBadgeVariant(verdict: CompatibilityResult['verdict']) {
  switch (verdict) {
    case 'Exceptional':
    case 'Excellent':
      return 'success';
    case 'Strong':
    case 'Good':
      return 'accent';
    case 'Conditional':
      return 'warning';
    case 'Weak':
    case 'No-Go':
      return 'error';
    default:
      return 'default';
  }
}

function SummaryTab({ result }: { result: CompatibilityResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-content-muted mb-3">Individual Strength</div>
              <StrengthBar label={result.profileA.name} value={result.individualStrengthA} />
              <StrengthBar label={result.profileB.name} value={result.individualStrengthB} />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-content-muted mb-1">Composite Score</div>
                <div className="text-2xl font-semibold text-content">
                  {result.compositeScore}<span className="text-sm text-content-subtle">/100</span>
                </div>
              </div>
              {result.hardFilters.length > 0 && (
                <div className="rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
                  Hard filters: {result.hardFilters.join(', ')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            {result.strengths.length === 0 ? (
              <p className="text-xs text-content-muted">No major strengths highlighted.</p>
            ) : (
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-content-muted">
                    <span className="text-success mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Risks</CardTitle>
          </CardHeader>
          <CardContent>
            {result.risks.length === 0 ? (
              <p className="text-xs text-content-muted">No major risks highlighted.</p>
            ) : (
              <ul className="space-y-2">
                {result.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-content-muted">
                    <span className="text-error mt-0.5">−</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StrengthBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-content-muted truncate">{label}</span>
        <span className="text-content font-medium">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            pct >= 70 ? 'bg-success' : pct >= 45 ? 'bg-warning' : 'bg-error',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AshtakootTab({ result }: { result: CompatibilityResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ashtakoot Score</CardTitle>
        <CardDescription>{result.ashtakoot.total} / {result.ashtakoot.max}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-content-muted border-b border-surface-border">
                <th className="text-left py-2 font-medium">Koota</th>
                <th className="text-left py-2 font-medium">Detail</th>
                <th className="text-right py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {result.ashtakoot.kootas.map(k => (
                <tr key={k.name}>
                  <td className="py-2 text-content font-medium">{k.name}</td>
                  <td className="py-2 text-content-muted">{k.detail}</td>
                  <td className="py-2 text-right">
                    <span className={cn(
                      'font-semibold',
                      k.score === k.max ? 'text-success' : k.score === 0 ? 'text-error' : 'text-content',
                    )}>
                      {k.score}
                    </span>
                    <span className="text-content-subtle">/{k.max}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ChemistryTab({ result }: { result: CompatibilityResult }) {
  const romantic = result.dimensions.find(d => d.id === 'romantic');
  if (!romantic) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Romantic & Sexual Chemistry</CardTitle>
        <CardDescription>Score: {romantic.score}/100</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-content-muted mb-2">Venus & Mars dynamics</h4>
          <ul className="space-y-2">
            {romantic.evidence.map((e, i) => (
              <li key={i} className="text-xs text-content-muted">{e}</li>
            ))}
          </ul>
        </div>
        {romantic.risks.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-content-muted mb-2">Risks</h4>
            <ul className="space-y-2">
              {romantic.risks.map((r, i) => (
                <li key={i} className="text-xs text-content-muted">{r}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarriageTab({ result }: { result: CompatibilityResult }) {
  const marriage = result.dimensions.find(d => d.id === 'marriage');
  if (!marriage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marriage Structure</CardTitle>
        <CardDescription>Score: {marriage.score}/100</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-content-muted mb-2">7th house, lords & D9 ascendants</h4>
          <ul className="space-y-2">
            {marriage.evidence.map((e, i) => (
              <li key={i} className="text-xs text-content-muted">{e}</li>
            ))}
          </ul>
        </div>
        {marriage.risks.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-content-muted mb-2">Risks</h4>
            <ul className="space-y-2">
              {marriage.risks.map((r, i) => (
                <li key={i} className="text-xs text-content-muted">{r}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimingTab({ result }: { result: CompatibilityResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dasha Timing Alignment</CardTitle>
        <CardDescription>Current score: {result.timing.currentScore}/100</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.timing.windows.length === 0 ? (
          <p className="text-xs text-content-muted">No upcoming favorable joint dasha windows found.</p>
        ) : (
          <div className="space-y-3">
            {result.timing.windows.map((w, i) => (
              <div key={i} className="rounded-lg border border-surface-border bg-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-content">{w.startDate} → {w.endDate}</span>
                  <span className="text-xs font-semibold text-content">{w.score}/100</span>
                </div>
                <p className="text-2xs text-content-muted">{w.reason}</p>
                <p className="text-2xs text-content-subtle mt-1">
                  A: {w.mahadashaA}/{w.antardashaA} · B: {w.mahadashaB}/{w.antardashaB}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIReportTab({ result, chartA, chartB }: { result: CompatibilityResult; chartA: CanonicalChart; chartB: CanonicalChart }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleGenerate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText('');
    setStatus('streaming');

    const chart1Context = buildChartContext(chartA, 'relationship');
    const chart2Context = buildChartContext(chartB, 'relationship');
    const gunaMilanSummary = [
      `Final Compatibility Score: ${result.finalScore}/100 — Verdict: ${result.verdict}`,
      `Composite Score: ${result.compositeScore}/100`,
      `Ashtakoot Guna Milan: ${result.ashtakoot.total}/${result.ashtakoot.max}`,
      `Individual Strength: ${result.profileA.name} ${result.individualStrengthA}%, ${result.profileB.name} ${result.individualStrengthB}%`,
      `Top Strengths: ${result.strengths.slice(0, 5).join('; ')}`,
      `Top Risks: ${result.risks.slice(0, 5).join('; ')}`,
    ].join('\n');

    try {
      const res = await fetch('/api/ai/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chart1Context,
          chart2Context,
          gunaMilanSummary,
          person1Name: result.profileA.name,
          person2Name: result.profileB.name,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          for (const line of event.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content ?? '';
              if (delta) setText(prev => prev + delta);
            } catch { /* ignore malformed chunks */ }
          }
        }
      }

      setStatus(prev => prev === 'streaming' ? 'done' : prev);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatus('error');
      }
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>AI Compatibility Report</CardTitle>
            <CardDescription>Stream a detailed .kdel v2.0 analysis</CardDescription>
          </div>
          {status === 'streaming' ? (
            <Button variant="secondary" size="sm" onClick={() => abortRef.current?.abort()}>
              Stop
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleGenerate}>
              <Sparkles size={13} />
              {status === 'done' ? 'Regenerate' : 'Generate'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {text ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            {status === 'streaming' && <span className="stream-cursor" aria-hidden="true" />}
          </div>
        ) : status === 'error' ? (
          <div className="flex items-center gap-2 text-xs text-error">
            <AlertCircle size={14} />
            Report generation failed. Try again.
          </div>
        ) : (
          <p className="text-xs text-content-muted">Click Generate to stream the AI report.</p>
        )}
      </CardContent>
    </Card>
  );
}
