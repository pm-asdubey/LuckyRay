'use client';

import { useState } from 'react';
import type { CanonicalChart, PlanetPosition, HouseData } from '@luckyray/shared';
import { Badge } from '@/components/ui/badge';
import { getNorthIndianHouseGeometry } from '@/lib/chart-geometry';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateSign, SIGN_ABBR_HINDI, PLANET_ABBR_HINDI } from '@/lib/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { PLANET_ABBREVIATIONS, SIGN_IDS } from '@luckyray/shared';

interface ChartViewerProps {
  chart: CanonicalChart;
}

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;

// English abbreviations for signs
const SIGN_ABBR_EN: Record<string, string> = {
  Aries: 'Ar', Taurus: 'Ta', Gemini: 'Ge', Cancer: 'Ca',
  Leo: 'Le', Virgo: 'Vi', Libra: 'Li', Scorpio: 'Sc',
  Sagittarius: 'Sg', Capricorn: 'Cp', Aquarius: 'Aq', Pisces: 'Pi',
};

export function ChartViewer({ chart }: ChartViewerProps) {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);
  const language = useAppStore(s => s.language);
  const t = useTranslation();

  const housePlanets = new Map<number, PlanetPosition[]>();
  for (const planet of chart.planets) {
    const existing = housePlanets.get(planet.house) ?? [];
    existing.push(planet);
    housePlanets.set(planet.house, existing);
  }

  const ascSignIndex = chart.ascendant.signIndex;

  const getHouseSignAbbr = (housePos: number): string => {
    const signIndex = (ascSignIndex + housePos - 1) % 12;
    const signName = SIGN_IDS[signIndex] ?? '';
    if (language === 'hi') return SIGN_ABBR_HINDI[signName] ?? signName.slice(0, 2);
    return SIGN_ABBR_EN[signName] ?? signName.slice(0, 2);
  };

  const getPlanetAbbr = (planet: PlanetPosition): string => {
    if (language === 'hi') return PLANET_ABBR_HINDI[planet.id] ?? planet.id.slice(0, 2);
    return PLANET_ABBREVIATIONS[planet.id] ?? planet.id.slice(0, 2);
  };

  const lagnaLabel = t.chart.lagnaLabel;
  const lagnaSign = language === 'hi'
    ? (SIGN_ABBR_HINDI[chart.ascendant.sign] ?? chart.ascendant.sign.slice(0, 3))
    : chart.ascendant.sign.slice(0, 3).toUpperCase();

  const houses = getNorthIndianHouseGeometry(SIZE);
  const stroke = 'hsl(258 30% 18%)';
  const strokeHover = 'hsl(258 84% 70% / 0.6)';

  return (
    <div className="space-y-4">
      <div className="relative max-w-[340px] mx-auto">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-full"
          aria-label="North Indian birth chart"
        >
          {/* Background */}
          <rect x="0" y="0" width={SIZE} height={SIZE} fill="hsl(258 25% 7%)" rx="4" />

          {/* House compartments */}
          {houses.map(({ house: houseNum, points, cx: hcx, cy: hcy }) => {
            const isHov = hoveredHouse === houseNum;
            const planets = housePlanets.get(houseNum) ?? [];
            const signAbbr = getHouseSignAbbr(houseNum);
            const houseData = chart.houses.find(h => h.number === houseNum);

            return (
              <g
                key={houseNum}
                onMouseEnter={() => setHoveredHouse(houseNum)}
                onMouseLeave={() => setHoveredHouse(null)}
                style={{ cursor: 'default' }}
                role="button"
                aria-label={`House ${houseNum}: ${houseData?.sign ?? ''}`}
                tabIndex={0}
              >
                <polygon
                  points={points}
                  fill={isHov ? 'hsl(258 40% 14%)' : 'transparent'}
                  stroke={isHov ? strokeHover : stroke}
                  strokeWidth="1"
                />

                {/* House number */}
                <text
                  x={hcx} y={hcy - 10}
                  textAnchor="middle"
                  fontSize="7.5"
                  fill="hsl(258 30% 40%)"
                  fontFamily="system-ui"
                >
                  {houseNum}
                </text>

                {/* Sign abbreviation */}
                <text
                  x={hcx} y={hcy}
                  textAnchor="middle"
                  fontSize={language === 'hi' ? '7' : '8.5'}
                  fill={isHov ? 'hsl(258 60% 60%)' : 'hsl(258 20% 45%)'}
                  fontFamily="system-ui"
                  fontStyle="italic"
                >
                  {signAbbr}
                </text>

                {/* Planets */}
                {planets.slice(0, 4).map((planet, i) => (
                  <text
                    key={planet.id}
                    x={hcx}
                    y={hcy + 12 + i * 11}
                    textAnchor="middle"
                    fontSize={language === 'hi' ? '8' : '9.5'}
                    fontWeight="600"
                    fill={getPlanetColor(planet)}
                    fontFamily="system-ui"
                  >
                    {getPlanetAbbr(planet)}{planet.isRetrograde ? '℞' : ''}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Lagna marker */}
          <text
            x={CX} y={CY - 2}
            textAnchor="middle"
            fontSize="7.5"
            fill="hsl(258 60% 55%)"
            fontFamily="system-ui"
            letterSpacing="0.8"
            fontWeight="500"
          >
            {lagnaSign}
          </text>
          <text
            x={CX} y={CY + 8}
            textAnchor="middle"
            fontSize="6"
            fill="hsl(258 30% 38%)"
            fontFamily="system-ui"
            letterSpacing="1.5"
          >
            {lagnaLabel}
          </text>
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredHouse !== null && (() => {
        const house = chart.houses.find(h => h.number === hoveredHouse);
        if (!house) return null;
        return (
          <HouseTooltip
            house={house}
            planets={housePlanets.get(hoveredHouse) ?? []}
          />
        );
      })()}
    </div>
  );
}

function getPlanetColor(planet: PlanetPosition): string {
  if (planet.isExalted) return 'hsl(43 80% 62%)';
  if (planet.isDebilitated) return 'hsl(0 72% 58%)';
  if (planet.isCombust) return 'hsl(220 10% 48%)';
  if (planet.isRetrograde) return 'hsl(280 60% 68%)';
  if (planet.naturalBenefic) return 'hsl(142 60% 52%)';
  return 'hsl(220 15% 80%)';
}

function HouseTooltip({ house, planets }: { house: HouseData; planets: PlanetPosition[] }) {
  const language = useAppStore(s => s.language);
  const t = useTranslation();
  const signName = translateSign(house.sign, language);
  const lordName = translatePlanet(house.lord, language);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-content">
          {t.chart.house} {house.number} · {signName}
        </span>
        <span className="text-2xs text-content-muted">{t.chart.lord}: {lordName}</span>
      </div>
      {planets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {planets.map(p => (
            <Badge
              key={p.id}
              variant={p.isExalted ? 'gold' : p.isDebilitated ? 'error' : 'default'}
            >
              {translatePlanet(p.id, language)}{p.isRetrograde ? ' ℞' : ''}
            </Badge>
          ))}
        </div>
      )}
      {house.themes.length > 0 && (
        <p className="text-2xs text-content-muted leading-relaxed">
          {house.themes.slice(0, 3).join(' · ')}
        </p>
      )}
    </div>
  );
}
