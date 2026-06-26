'use client';

import { useState } from 'react';
import type { CanonicalChart, PlanetPosition, HouseData } from '@luckyray/shared';
import { PLANET_ABBREVIATIONS, SIGN_ABBREVIATIONS } from '@luckyray/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChartViewerProps {
  chart: CanonicalChart;
}

// North Indian chart house order (clockwise from top-left)
// The Lagna (Ascendant) house is always drawn at top-center
const NORTH_INDIAN_POSITIONS = [
  // [row, col] in a 4x4 grid, houses 1-12
  { r: 0, c: 1 }, // H1 (Lagna) - top center
  { r: 0, c: 0 }, // H2 - top left
  { r: 1, c: 0 }, // H3 - left
  { r: 2, c: 0 }, // H4 - bottom left area
  { r: 3, c: 0 }, // H5 - bottom left
  { r: 3, c: 1 }, // H6 - bottom center
  { r: 3, c: 2 }, // H7 - bottom center right
  { r: 3, c: 3 }, // H8 - bottom right
  { r: 2, c: 3 }, // H9 - right
  { r: 1, c: 3 }, // H10 - right upper
  { r: 0, c: 3 }, // H11 - top right
  { r: 0, c: 2 }, // H12 - top center right
];

export function ChartViewer({ chart }: ChartViewerProps) {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetPosition | null>(null);

  // Build grid representation
  // North Indian style: 4x4 grid, center 2x2 is empty
  const housePlanets = new Map<number, PlanetPosition[]>();
  for (const planet of chart.planets) {
    const existing = housePlanets.get(planet.house) ?? [];
    existing.push(planet);
    housePlanets.set(planet.house, existing);
  }

  return (
    <div className="space-y-4">
      {/* Chart grid */}
      <div className="relative aspect-square max-w-[320px] mx-auto">
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full"
          aria-label="North Indian birth chart"
        >
          {/* Outer border */}
          <rect x="0" y="0" width="320" height="320" fill="none" stroke="hsl(220 13% 18%)" strokeWidth="1.5" rx="2" />

          {/* Grid lines */}
          {/* Outer 4x4 grid */}
          <line x1="80" y1="0" x2="80" y2="320" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="160" y1="0" x2="160" y2="320" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="240" y1="0" x2="240" y2="320" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="0" y1="80" x2="320" y2="80" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="0" y1="160" x2="320" y2="160" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="0" y1="240" x2="320" y2="240" stroke="hsl(220 13% 18%)" strokeWidth="1" />

          {/* Center diamond lines */}
          <line x1="80" y1="80" x2="160" y2="160" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="240" y1="80" x2="160" y2="160" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="80" y1="240" x2="160" y2="160" stroke="hsl(220 13% 18%)" strokeWidth="1" />
          <line x1="240" y1="240" x2="160" y2="160" stroke="hsl(220 13% 18%)" strokeWidth="1" />

          {/* House cells */}
          {chart.houses.map((house) => {
            const houseNumber = house.number;
            // Map house number to grid position
            const gridPos = getGridPosition(houseNumber, chart.ascendant.signIndex);
            if (!gridPos) return null;

            const { x, y, w, h, labelX, labelY, contentX, contentY } = gridPos;
            const isHovered = hoveredHouse === houseNumber;
            const planets = housePlanets.get(houseNumber) ?? [];

            return (
              <g
                key={houseNumber}
                onMouseEnter={() => setHoveredHouse(houseNumber)}
                onMouseLeave={() => setHoveredHouse(null)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`House ${houseNumber}: ${house.sign}`}
              >
                {/* Highlight on hover */}
                {isHovered && (
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill="hsl(258 40% 30% / 0.2)"
                    stroke="hsl(258 84% 70%)"
                    strokeWidth="1"
                  />
                )}

                {/* House number */}
                <text
                  x={labelX} y={labelY}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isHovered ? 'hsl(258 84% 70%)' : 'hsl(220 10% 40%)'}
                  fontFamily="system-ui"
                >
                  {houseNumber}
                </text>

                {/* Sign abbreviation */}
                <text
                  x={contentX}
                  y={contentY - 3}
                  textAnchor="middle"
                  fontSize="8"
                  fill="hsl(220 10% 40%)"
                  fontFamily="system-ui"
                  fontStyle="italic"
                >
                  {SIGN_ABBREVIATIONS[house.sign as keyof typeof SIGN_ABBREVIATIONS] ?? house.sign.slice(0, 2)}
                </text>

                {/* Planet abbreviations */}
                {planets.slice(0, 4).map((planet, i) => (
                  <text
                    key={planet.id}
                    x={contentX}
                    y={contentY + 10 + i * 11}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="500"
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

          {/* Center — Lagna sign */}
          <text
            x="160" y="154"
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="hsl(220 15% 65%)"
            fontFamily="system-ui"
          >
            {chart.ascendant.sign.slice(0, 3).toUpperCase()}
          </text>
          <text
            x="160" y="167"
            textAnchor="middle"
            fontSize="8"
            fill="hsl(220 10% 40%)"
            fontFamily="system-ui"
          >
            Lagna
          </text>
        </svg>
      </div>

      {/* House tooltip on hover */}
      {hoveredHouse !== null && (
        <HouseTooltip
          house={chart.houses.find(h => h.number === hoveredHouse)!}
          planets={housePlanets.get(hoveredHouse) ?? []}
        />
      )}
    </div>
  );
}

/**
 * Calculate grid coordinates for each house in the North Indian chart.
 * The Lagna always starts at house 1, and we rotate accordingly.
 */
function getGridPosition(
  houseNumber: number,
  ascendantSignIndex: number,
) {
  // North Indian chart positions (fixed layout, sign fills rotate)
  // Using a simplified 4-column layout
  const cells: Record<number, { x: number; y: number; w: number; h: number; labelDx: number; labelDy: number; contentDx: number; contentDy: number }> = {
    // Using the fixed North Indian diamond pattern
    1:  { x: 80,  y: 0,   w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    2:  { x: 0,   y: 0,   w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    3:  { x: 0,   y: 80,  w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    4:  { x: 0,   y: 160, w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    5:  { x: 0,   y: 240, w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    6:  { x: 80,  y: 240, w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    7:  { x: 160, y: 240, w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    8:  { x: 240, y: 240, w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    9:  { x: 240, y: 160, w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    10: { x: 240, y: 80,  w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    11: { x: 240, y: 0,   w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
    12: { x: 160, y: 0,   w: 80,  h: 80,  labelDx: 5,  labelDy: 12, contentDx: 40, contentDy: 35 },
  };

  const cell = cells[houseNumber];
  if (!cell) return null;

  return {
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
    labelX: cell.x + cell.labelDx + 5,
    labelY: cell.y + cell.labelDy,
    contentX: cell.x + cell.contentDx,
    contentY: cell.y + cell.contentDy - 5,
  };
}

function getPlanetColor(planet: PlanetPosition): string {
  if (planet.isExalted) return 'hsl(43 80% 60%)';
  if (planet.isDebilitated) return 'hsl(0 72% 55%)';
  if (planet.isCombust) return 'hsl(220 10% 50%)';
  if (planet.isRetrograde) return 'hsl(280 60% 65%)';
  if (planet.naturalBenefic) return 'hsl(142 71% 50%)';
  return 'hsl(220 15% 78%)';
}

function HouseTooltip({ house, planets }: { house: HouseData; planets: PlanetPosition[] }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-content">
          House {house.number} — {house.sign}
        </span>
        <span className="text-2xs text-content-muted">
          Lord: {house.lord}
        </span>
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
        <p className="text-2xs text-content-muted">
          {house.themes.slice(0, 3).join(' · ')}
        </p>
      )}
    </div>
  );
}
