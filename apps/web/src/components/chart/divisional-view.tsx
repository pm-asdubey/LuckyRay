'use client';

import { useState } from 'react';
import type { CanonicalChart, DivisionalChart, DivisionalChartPlanet, PlanetId } from '@luckyray/shared';
import { SIGN_IDS, PLANET_ABBREVIATIONS, PLANET_SYMBOLS } from '@luckyray/shared';
import { getNorthIndianHouseGeometry, SIGN_ABBREVIATIONS } from '@/lib/chart-geometry';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateSign, translatePlanetAbbr, translateSignAbbr } from '@/lib/i18n';

interface DivisionalViewProps {
  chart: CanonicalChart;
}

type DivKey = 'D9' | 'D10';

const DIV_NAMES: Record<DivKey, { name: string; sanskrit: string }> = {
  D9: { name: 'Navamsa', sanskrit: 'Navamsha' },
  D10: { name: 'Dashamsa', sanskrit: 'Dashamsha' },
};

export function DivisionalView({ chart }: DivisionalViewProps) {
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const [activeDiv, setActiveDiv] = useState<DivKey>('D9');
  const d9 = chart.divisionalCharts.D9;
  const d10 = chart.divisionalCharts.D10;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-elevated px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-content">{t.divisionalChart.title}</h2>
          <p className="text-2xs text-content-muted mt-0.5">
            {t.divisionalChart.description}
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
              {d} — {DIV_NAMES[d].name}
            </button>
          ))}
        </div>
      </div>

      {activeDiv === 'D9' && <DivSection div={d9} natalPlanets={chart.planets} t={t} language={language} />}
      {activeDiv === 'D10' && <DivSection div={d10} natalPlanets={chart.planets} t={t} language={language} />}
    </div>
  );
}

function DivSection({
  div,
  natalPlanets,
  t,
  language,
}: {
  div: DivisionalChart;
  natalPlanets: CanonicalChart['planets'];
  t: ReturnType<typeof import('@/hooks/use-translation').useTranslation>;
  language: 'en' | 'hi';
}) {
  const divNames = DIV_NAMES[div.division as DivKey];
  const theme = div.division === 'D9' ? t.divisionalChart.navamshaTheme : t.divisionalChart.dashamsha;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 text-xs text-content-muted space-y-1">
        <p className="font-semibold text-content">
          {divNames.name} ({div.division}) · {t.divisional.ascendant}: {translateSign(div.ascendant, language)}
        </p>
        <p>{theme}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mini chart */}
        <MiniDivisionalChart div={div} language={language} />

        {/* Planet table */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">
            {t.divisionalChart.planetPositions}
          </div>
          <div className="rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full text-2xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated">
                  <th className="text-left px-3 py-2 text-content-muted font-medium">{t.manglik.planet}</th>
                  <th className="text-left px-3 py-2 text-content-muted font-medium">{t.manglik.natal}</th>
                  <th className="text-left px-3 py-2 text-content-muted font-medium">{divNames.sanskrit}</th>
                  <th className="text-right px-3 py-2 text-content-muted font-medium">{t.manglik.house}</th>
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
                        {translatePlanet(p.id, language)}
                      </td>
                      <td className="px-3 py-1.5 text-content-subtle">
                        {natal ? `${translateSign(natal.sign, language)} H${natal.house}` : '—'}
                      </td>
                      <td className={cn('px-3 py-1.5 text-content', changedSign && 'text-accent font-medium')}>
                        {translateSign(p.sign, language)}
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

function MiniDivisionalChart({ div, language }: { div: DivisionalChart; language: 'en' | 'hi' }) {
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
  const getSign = (housePos: number) => {
    const signId = SIGN_IDS[(ascSignIndex + housePos - 1 + 12) % 12];
    if (!signId) return '';
    return translateSignAbbr(signId, language);
  };
  const lagnaAbbr = translateSignAbbr(div.ascendant, language);
  const signFontSize = language === 'hi' ? 7 : 8;

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
              <text x={hcx} y={hcy + 2} textAnchor="middle" fontSize={signFontSize} fill="hsl(258 20% 45%)" fontFamily="system-ui" fontStyle="italic">{sign}</text>
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
                  {translatePlanetAbbr(p.id, language)}
                </text>
              ))}
            </g>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill="hsl(258 60% 55%)" fontFamily="system-ui" fontWeight="500">
          {lagnaAbbr}
        </text>
        <text x={cx} y={cy + 7} textAnchor="middle" fontSize="6" fill="hsl(258 30% 38%)" fontFamily="system-ui" letterSpacing="1">
          {div.division}
        </text>
      </svg>
    </div>
  );
}
