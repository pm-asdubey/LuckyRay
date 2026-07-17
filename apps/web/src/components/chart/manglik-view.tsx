'use client';

import { computeManglikScoreFromPlanets } from '@luckyray/jyotish';
import type { ManglikScoreResult, ManglikPlanetScore } from '@luckyray/jyotish';
import type { CanonicalChart } from '@luckyray/shared';
import { SIGN_IDS, SIGN_SANSKRIT } from '@luckyray/shared';
import { cn } from '@/lib/utils';

interface ManglikViewProps {
  chart: CanonicalChart;
}

const REFERENCE_LABEL: Record<string, string> = {
  Lagna: 'Lagna (×1)',
  Moon: 'Chandra (×½)',
  Venus: 'Shukra (×¼)',
};

function signLabel(sign1Based: number): string {
  const id = SIGN_IDS[sign1Based - 1];
  if (!id) return String(sign1Based);
  return `${SIGN_SANSKRIT[id]} (${id})`;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function ManglikView({ chart }: ManglikViewProps) {
  const stored = chart.doshas.find(d => d.id === 'manglik')?.metadata
    ?.manglikScore as ManglikScoreResult | undefined;

  const result = stored ?? computeManglikScoreFromPlanets(
    chart.ascendant.signIndex,
    chart.planets.find(p => p.id === 'Moon')!,
    chart.planets.find(p => p.id === 'Venus')!,
    chart.planets.find(p => p.id === 'Mars')!,
    chart.planets.find(p => p.id === 'Saturn')!,
    chart.planets.find(p => p.id === 'Rahu')!,
    chart.planets.find(p => p.id === 'Ketu')!,
    chart.planets.find(p => p.id === 'Sun')!,
  );

  const dosha = chart.doshas.find(d => d.id === 'manglik');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-elevated px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-content">Manglik Dosh Weighted Score</h2>
          <p className="text-2xs text-content-muted mt-0.5">
            Deterministic scoring from Lagna, Chandra, and Shukra. No AI judgment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dosha && (
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-1 text-2xs font-semibold',
                dosha.detected
                  ? 'border-red-900/40 bg-red-950/20 text-red-400'
                  : 'border-green-900/40 bg-green-950/20 text-green-400',
              )}
            >
              {dosha.detected ? `Detected — ${dosha.severity ?? 'Moderate'}` : 'Not Detected'}
            </span>
          )}
          <div className="text-right">
            <div className="text-2xs text-content-muted uppercase tracking-wider">Total Score</div>
            <div className="text-xl font-bold text-accent leading-none">{formatNum(result.total)}</div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <section>
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-3">
          Inputs (occupied signs)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Lagna', result.input.lagnaSign],
            ['Chandra', result.input.moonSign],
            ['Shukra', result.input.venusSign],
            ['Mangal', result.input.marsSign],
            ['Shani', result.input.saturnSign],
            ['Rahu', result.input.rahuSign],
            ['Ketu', result.input.ketuSign],
            ['Surya', result.input.sunSign],
          ].map(([label, sign]) => (
            <div
              key={label}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2"
            >
              <div className="text-2xs text-content-muted">{label}</div>
              <div className="text-xs font-medium text-content">{signLabel(sign as number)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cancellations / evidence */}
      {dosha && (dosha.cancellations.length > 0 || dosha.evidence.length > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dosha.evidence.length > 0 && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5">
              <div className="text-2xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
                Evidence
              </div>
              <ul className="space-y-1">
                {dosha.evidence.map((e, i) => (
                  <li key={i} className="text-2xs text-content">• {e}</li>
                ))}
              </ul>
            </div>
          )}
          {dosha.cancellations.length > 0 && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5">
              <div className="text-2xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
                Cancellations / Mitigations
              </div>
              <ul className="space-y-1">
                {dosha.cancellations.map((c, i) => (
                  <li key={i} className="text-2xs text-content">• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Per-planet breakdown */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
          Full Calculation Trace
        </h3>
        {result.planets.map((planet: ManglikPlanetScore) => (
          <div
            key={planet.planet}
            className="rounded-xl border border-surface-border overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-elevated border-b border-surface-border">
              <div className="text-sm font-semibold text-content">{planet.planet}</div>
              <div className="text-2xs text-content-muted">
                Subtotal: <span className="font-semibold text-content">{formatNum(planet.subtotal)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-2xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-elevated/50">
                    <th className="text-left px-3 py-2 text-content-muted font-medium">Reference</th>
                    <th className="text-left px-3 py-2 text-content-muted font-medium">Occupied Sign</th>
                    <th className="text-left px-3 py-2 text-content-muted font-medium">House</th>
                    <th className="text-left px-3 py-2 text-content-muted font-medium">House Group</th>
                    <th className="text-left px-3 py-2 text-content-muted font-medium">Dignity</th>
                    <th className="text-right px-3 py-2 text-content-muted font-medium">Raw</th>
                    <th className="text-right px-3 py-2 text-content-muted font-medium">Weight</th>
                    <th className="text-right px-3 py-2 text-content-muted font-medium">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {planet.details.map((d, i) => (
                    <tr key={d.reference} className={cn('border-b border-surface-border/50', i % 2 === 1 && 'bg-surface-elevated/30')}>
                      <td className="px-3 py-1.5 text-content">{REFERENCE_LABEL[d.reference]}</td>
                      <td className="px-3 py-1.5 text-content">{signLabel(d.occupiedSign)}</td>
                      <td className="px-3 py-1.5 text-content">{d.house}</td>
                      <td className="px-3 py-1.5 text-content">{d.houseGroup ?? '—'}</td>
                      <td className="px-3 py-1.5 text-content">{d.dignity}</td>
                      <td className="px-3 py-1.5 text-right text-content">{formatNum(d.rawScore)}</td>
                      <td className="px-3 py-1.5 text-right text-content">{d.weight}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-content">{formatNum(d.weightedScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* Score interpretation note */}
      <p className="text-2xs text-content-subtle bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
        Higher totals indicate stronger Manglik indications. The score is computed deterministically
        from the table in <code className="text-content-muted">packages/jyotish/src/manglik-score.ts</code>.
        Classical cancellations and the full chart context should always be considered before drawing conclusions.
      </p>
    </div>
  );
}
