'use client';

import { useState } from 'react';
import type { CanonicalChart, PlanetPosition, HouseData } from '@luckyray/shared';
import { PLANET_ABBREVIATIONS } from '@luckyray/shared';
import { Badge } from '@/components/ui/badge';
import { getNorthIndianHouseGeometry, SIGN_ABBREVIATIONS } from '@/lib/chart-geometry';

interface ChartViewerProps {
  chart: CanonicalChart;
}

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;

export function ChartViewer({ chart }: ChartViewerProps) {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  const housePlanets = new Map<number, PlanetPosition[]>();
  for (const planet of chart.planets) {
    const existing = housePlanets.get(planet.house) ?? [];
    existing.push(planet);
    housePlanets.set(planet.house, existing);
  }

  const ascSignIndex = chart.ascendant.signIndex;

  // North Indian chart: house positions are FIXED. Signs rotate counter-clockwise
  // starting with the ascendant sign in the H1 (top) compartment.
  const getHouseSign = (housePos: number): string => {
    const signIndex = (ascSignIndex + housePos - 1) % 12;
    return SIGN_ABBREVIATIONS[signIndex] ?? '';
  };

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
            const sign = getHouseSign(houseNum);
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

                {/* House number — small, above the sign abbreviation */}
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
                  fontSize="8.5"
                  fill={isHov ? 'hsl(258 60% 60%)' : 'hsl(258 20% 45%)'}
                  fontFamily="system-ui"
                  fontStyle="italic"
                >
                  {sign}
                </text>

                {/* Planets (up to 4 to avoid overflowing small compartments) */}
                {planets.slice(0, 4).map((planet, i) => (
                  <text
                    key={planet.id}
                    x={hcx}
                    y={hcy + 12 + i * 11}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="600"
                    fill={getPlanetColor(planet)}
                    fontFamily="system-ui"
                  >
                    {PLANET_ABBREVIATIONS[planet.id] ?? planet.id.slice(0, 2)}
                    {planet.isRetrograde ? '℞' : ''}
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
            {chart.ascendant.sign.slice(0, 3).toUpperCase()}
          </text>
          <text
            x={CX} y={CY + 8}
            textAnchor="middle"
            fontSize="6"
            fill="hsl(258 30% 38%)"
            fontFamily="system-ui"
            letterSpacing="1.5"
          >
            LAGNA
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
  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-content">
          House {house.number} · {house.sign}
        </span>
        <span className="text-2xs text-content-muted">Lord: {house.lord}</span>
      </div>
      {planets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {planets.map(p => (
            <Badge
              key={p.id}
              variant={p.isExalted ? 'gold' : p.isDebilitated ? 'error' : 'default'}
            >
              {p.id}{p.isRetrograde ? ' ℞' : ''}
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
