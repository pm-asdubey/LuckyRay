'use client';

import { useState } from 'react';
import type { CanonicalChart, DivisionalChart, DivisionalChartPlanet, PlanetId } from '@luckyray/shared';
import { SIGN_IDS, PLANET_ABBREVIATIONS, PLANET_SYMBOLS } from '@luckyray/shared';
import { getNorthIndianHouseGeometry, SIGN_ABBREVIATIONS } from '@/lib/chart-geometry';
import { cn } from '@/lib/utils';

interface DivisionalViewProps {
  chart: CanonicalChart;
}

type DivKey = 'D9' | 'D10';

const DIV_INFO: Record<DivKey, { name: string; sanskrit: string; theme: string }> = {
  D9: { name: 'Navamsa', sanskrit: 'Navamsha', theme: 'Marriage, dharma, spiritual strength' },
  D10: { name: 'Dashamsa', sanskrit: 'Dashamsha', theme: 'Career, profession, achievements' },
};

export function DivisionalView({ chart }: DivisionalViewProps) {
  const [activeDiv, setActiveDiv] = useState<DivKey>('D9');
  const d9 = chart.divisionalCharts.D9;
  const d10 = chart.divisionalCharts.D10;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-elevated px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-content">Divisional Charts (Vargas)</h2>
          <p className="text-2xs text-content-muted mt-0.5">
            D9 Navamsa and D10 Dashamsa computed from the natal longitudes.
          </p>
        </div>
        <div className="flex rounded-lg border border-surface-border overflow-hidden text-2xs">
          {(['D9', 'D10'] as const).map(d => (
            <button
              key={d}
              onClick={() => setActiveDiv(d)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                activeDiv === d ? 'bg-accent-subtle text-accent' : 'text-content-muted hover:text-content',
              )}
            >
              {d} — {DIV_INFO[d].name}
            </button>
          ))}
        </div>
      </div>

      {activeDiv === 'D9' && <DivSection div={d9} natalPlanets={chart.planets} />}
      {activeDiv === 'D10' && <DivSection div={d10} natalPlanets={chart.planets} />}

      <p className="text-2xs text-content-subtle bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
        <strong>How it is calculated:</strong> for a D-N chart, the longitude within the birth sign is
        multiplied by N and wrapped into 30-degree segments. D9 uses element-based starting signs
        (Fire → Aries, Earth → Capricorn, Air → Libra, Water → Cancer). D10 odd signs start from
        themselves; even signs start from the 9th sign. Houses are then counted from the divisional
        ascendant. See <code className="text-content-muted">packages/jyotish/src/divisional.ts</code>.
      </p>
    </div>
  );
}

function DivSection({
  div,
  natalPlanets,
}: {
  div: DivisionalChart;
  natalPlanets: CanonicalChart['planets'];
}) {
  const info = DIV_INFO[div.division as DivKey];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 text-xs text-content-muted space-y-1">
        <p className="font-semibold text-content">
          {info.name} ({div.division}) · Ascendant: {div.ascendant}
        </p>
        <p>{info.theme}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mini chart */}
        <MiniDivisionalChart div={div} />

        {/* Planet table */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">
            Planet Positions
          </div>
          <div className="rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full text-2xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated">
                  <th className="text-left px-3 py-2 text-content-muted font-medium">Planet</th>
                  <th className="text-left px-3 py-2 text-content-muted font-medium">Natal</th>
                  <th className="text-left px-3 py-2 text-content-muted font-medium">{info.sanskrit}</th>
                  <th className="text-right px-3 py-2 text-content-muted font-medium">House</th>
                </tr>
              </thead>
              <tbody>
                {div.planets.map((p, i) => {
                  const natal = natalPlanets.find(np => np.id === p.id);
                  const changedSign = natal?.sign !== p.sign;
                  return (
                    <tr key={p.id} className={cn('border-b border-surface-border/50', i % 2 === 1 && 'bg-surface-elevated/30')}>
                      <td className="px-3 py-1.5 text-content">
                        <span className="inline-block w-5 text-center text-content-muted" aria-hidden>
                          {PLANET_SYMBOLS[p.id as PlanetId]}
                        </span>
                        {p.id}
                      </td>
                      <td className="px-3 py-1.5 text-content-subtle">
                        {natal ? `${natal.sign} H${natal.house}` : '—'}
                      </td>
                      <td className={cn('px-3 py-1.5 text-content', changedSign && 'text-accent font-medium')}>
                        {p.sign}
                      </td>
                      <td className="px-3 py-1.5 text-right text-content">H{p.house}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniDivisionalChart({ div }: { div: DivisionalChart }) {
  const housePlanets = new Map<number, DivisionalChartPlanet[]>();
  for (const p of div.planets) {
    const arr = housePlanets.get(p.house) ?? [];
    arr.push(p);
    housePlanets.set(p.house, arr);
  }

  const ascSignIndex = SIGN_IDS.indexOf(div.ascendant);
  const W = 320;
  const cx = W / 2;
  const cy = W / 2;
  const houses = getNorthIndianHouseGeometry(W);
  const getSign = (housePos: number) => SIGN_ABBREVIATIONS[(ascSignIndex + housePos - 1 + 12) % 12] ?? '';

  return (
    <div className="flex justify-center rounded-xl border border-surface-border bg-surface-elevated p-4">
      <svg viewBox={`0 0 ${W} ${W}`} className="w-full max-w-[320px]" aria-label={`${div.name} chart`}>
        <rect x="0" y="0" width={W} height={W} fill="hsl(258 25% 7%)" rx="4" />
        {houses.map(({ house: h, points, cx: hcx, cy: hcy }) => {
          const planets = housePlanets.get(h) ?? [];
          const sign = getSign(h);
          return (
            <g key={h}>
              <polygon points={points} fill="transparent" stroke="hsl(258 30% 18%)" strokeWidth="1" />
              <text x={hcx} y={hcy - 8} textAnchor="middle" fontSize="7" fill="hsl(258 20% 40%)" fontFamily="system-ui">{h}</text>
              <text x={hcx} y={hcy + 2} textAnchor="middle" fontSize="8" fill="hsl(258 20% 45%)" fontFamily="system-ui" fontStyle="italic">{sign}</text>
              {planets.map((p, i) => (
                <text
                  key={p.id}
                  x={hcx}
                  y={hcy + 13 + i * 10}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="hsl(220 15% 78%)"
                  fontFamily="system-ui"
                >
                  {PLANET_ABBREVIATIONS[p.id as PlanetId] ?? p.id.slice(0, 2)}
                </text>
              ))}
            </g>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill="hsl(258 60% 55%)" fontFamily="system-ui" fontWeight="500">
          {div.ascendant.slice(0, 3).toUpperCase()}
        </text>
        <text x={cx} y={cy + 7} textAnchor="middle" fontSize="6" fill="hsl(258 30% 38%)" fontFamily="system-ui" letterSpacing="1">
          {div.division}
        </text>
      </svg>
    </div>
  );
}
