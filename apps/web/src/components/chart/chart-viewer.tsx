'use client';

import { useState } from 'react';
import type { CanonicalChart, PlanetPosition, HouseData } from '@luckyray/shared';
import { PLANET_ABBREVIATIONS, SIGN_ABBREVIATIONS } from '@luckyray/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChartViewerProps {
  chart: CanonicalChart;
}

// North Indian Kundali — true diamond format
// The chart is a 320×320 square with an inner diamond.
// Houses 1-12 are fixed triangular/trapezoidal compartments.
// H1 (Lagna) is always the TOP diamond compartment.
// Houses proceed CLOCKWISE: 1→2→3→4→...→12.
//
// Compartment centroids (for text placement):
//   H1  = top triangle     center ~ (160,  44)
//   H2  = top-left tri     center ~ ( 60,  60)
//   H3  = left tri         center ~ ( 44, 160)
//   H4  = bottom-left tri  center ~ ( 60, 260)
//   H5  = bottom tri       center ~ (160, 276)
//   H6  = bottom-right tri center ~ (260, 260)
//   H7  = right tri        center ~ (276, 160)   [opposite H1]
//   H8  = top-right tri    center ~ (260,  60)
//   H9  = corner top-right center ~ (220,  40)   actually top-right corner
//   ...etc — using the classic format with 4 corner squares + 8 triangular wedges

// Classic North Indian Kundali layout uses a 4×4 grid divided by diagonals.
// The 12 compartments are:
//   4 corner squares (H2 top-left, H11 top-right, H8 bottom-right, H5 bottom-left)
//   4 edge diamonds split diagonally:
//     top center → H1 (top) + H12 (right of top) or...
//
// Actually the CORRECT North Indian format:
//   Top center diamond = H1 (Lagna)
//   Going clockwise: H12, H11, H10, H9, H8, H7, H6, H5, H4, H3, H2
//   i.e. H2 is top-left corner, H3 is left diamond, etc.
//
// The layout (0,0 = top-left, 320×320):
//   Outer square: (0,0)→(320,320)
//   Inner square (diamond): vertices at (160,0),(320,160),(160,320),(0,160)
//
// 12 house regions (defined by clipping polygons):

const S = 320; // SVG size
const C = S / 2; // center = 160

// Diamond vertices
const TOP   = [C, 0];
const RIGHT = [S, C];
const BOT   = [C, S];
const LEFT  = [0, C];

// Corner points
const TL = [0,   0  ];
const TR = [S,   0  ];
const BR = [S,   S  ];
const BL = [0,   S  ];

// Mid points of each diamond edge
const T_MID  = [C, 0 ];   // same as TOP
const R_MID  = [S, C ];   // same as RIGHT
const B_MID  = [C, S ];   // same as BOT
const L_MID  = [0, C ];   // same as LEFT

// Quarter points along outer edge (for inner corner triangles)
const TL_Q = [0,    0];   // top-left corner
const TR_Q = [S,    0];   // top-right corner
const BR_Q = [S,    S];   // bottom-right corner
const BL_Q = [0,    S];   // bottom-left corner

// Each house = polygon in SVG coords
// H1 = top center triangle (Lagna)
// Houses go CLOCKWISE from H1

type HousePolygon = {
  points: number[][];
  cx: number;  // text center x
  cy: number;  // text center y
};

const HOUSE_POLYGONS: HousePolygon[] = [
  // H1 — top center diamond compartment
  { points: [[C,0],[S/4*3,S/4],[C,S/2],[S/4,S/4]],               cx: C,     cy: 50 },
  // H2 — top-left corner square / triangle
  { points: [[0,0],[S/2,0],[S/4,S/4],[0,S/2]],                    cx: 60,    cy: 60  },
  // H3 — left center diamond compartment
  { points: [[0,0],[S/4,S/4],[C,C],[S/4,S/4*3],[0,S]],           cx: 50,    cy: C   },
  // H4 — bottom-left corner
  { points: [[0,S/2],[S/4,S/4*3],[C,S],[0,S]],                    cx: 60,    cy: 260 },
  // H5 — bottom center diamond compartment
  { points: [[S/4,S/4*3],[S/4*3,S/4*3],[C,S]],                    cx: C,     cy: 276 },
  // H6 — bottom-right corner
  { points: [[C,S],[S/4*3,S/4*3],[S,S/2],[S,S]],                  cx: 260,   cy: 260 },
  // H7 — right center diamond compartment
  { points: [[S,0],[S,S],[S/4*3,S/4*3],[C,C],[S/4*3,S/4]],       cx: 276,   cy: C   },
  // H8 — top-right corner
  { points: [[C,0],[S,0],[S,S/2],[S/4*3,S/4]],                    cx: 260,   cy: 60  },
  // H9 — splitting top-right area further: actually in N.Indian, H9 is at top-right
  // Redesign using the standard 12-house N. Indian layout below
  { points: [[C,C],[S/4*3,S/4],[S/4*3,S/4*3]],                   cx: 230,   cy: 130 },
  // H10 top center-right area
  { points: [[C,0],[S/4*3,S/4],[C,C],[S/4,S/4]],                 cx: C,     cy: 50 },
  { points: [[S/4,S/4],[C,0],[S/4*3,S/4]],                       cx: C,     cy: 90 },
  { points: [[S/4,S/4*3],[C,C],[S/4*3,S/4*3]],                   cx: C,     cy: 230 },
];

// The CORRECT classic North Indian Kundali SVG layout:
// Think of it as a square divided into 12 cells by:
// - Outer boundary square
// - Inner diamond (rhombus) connecting midpoints of the 4 sides
// - Two diagonals of the inner diamond
// This creates exactly 12 triangular/trapezoidal cells.

// Using the correct geometry:
// Cell centers and polygons for each house (H1 at top):

const W = 320;
const H = 320;
const cx = W / 2;  // 160
const cy = H / 2;  // 160

// Key points
const pts = {
  tl:  [0,     0    ],
  tc:  [cx,    0    ],
  tr:  [W,     0    ],
  ml:  [0,     cy   ],
  mc:  [cx,    cy   ],
  mr:  [W,     cy   ],
  bl:  [0,     H    ],
  bc:  [cx,    H    ],
  br:  [W,     H    ],
  // Quarter mid-points (for H2, H8, H5, H11 corner squares)
  tlc: [cx/2,  cy/2 ],  // center of top-left square
  trc: [cx*1.5,cy/2 ],  // center of top-right square
  blc: [cx/2,  cy*1.5], // center of bottom-left square
  brc: [cx*1.5,cy*1.5], // center of bottom-right square
};

const p = (arr: number[]): string => `${arr[0]},${arr[1]}`;

// House polygons — correct North Indian Kundali geometry
// H1 = top diamond (Lagna)
// H2 = top-left corner box → then counterclockwise in the classic format, but
//      actually houses go: H1 top, H2 top-left, H3 left, H4 bottom-left, H5 bottom,
//      H6 bottom-right, H7 right (opposite), H8 top-right, H9→H12 filling inner wedges
//
// In the STANDARD North Indian format:
//   The square is divided into 12 compartments by drawing:
//   1. The 4 outer midpoints connected (inner diamond)
//   2. The 4 diagonals from outer corners to center
//
// Resulting in:
//   4 corner triangles: top-left, top-right, bottom-right, bottom-left
//   4 edge trapezoids: top, right, bottom, left  (split by vertical/horizontal through center)
//   → wait, this is only 8 compartments.
//
// Real North Indian: The inner diamond is subdivided by 2 diagonals into 4 triangles.
// Combined with 4 outer corner triangles + 4 side triangles = 12 compartments.

const HOUSES: Array<{ poly: string; cx: number; cy: number }> = [
  // H1 — top diamond triangle (Lagna, top)
  { poly: `${p([cx,0])} ${p([W,cy])} ${p([cx,cy])} ${p([0,cy])}`,  cx: cx, cy: 40 },
  // H2 — top-left corner triangle
  { poly: `${p([0,0])} ${p([cx,0])} ${p([0,cy])}`,                  cx: 52, cy: 52 },
  // H3 — left diamond triangle
  { poly: `${p([0,0])} ${p([0,cy])} ${p([cx,cy])} ${p([0,H])}`,    cx: 40, cy: cy },
  // H4 — bottom-left corner triangle
  { poly: `${p([0,cy])} ${p([cx,H])} ${p([0,H])}`,                  cx: 52, cy: H-52 },
  // H5 — bottom diamond triangle
  { poly: `${p([0,cy])} ${p([cx,cy])} ${p([W,cy])} ${p([cx,H])}`,  cx: cx, cy: H-40 },
  // H6 — bottom-right corner triangle
  { poly: `${p([cx,H])} ${p([W,cy])} ${p([W,H])}`,                  cx: W-52, cy: H-52 },
  // H7 — right diamond triangle (opposite H1)
  { poly: `${p([cx,0])} ${p([W,0])} ${p([W,H])} ${p([cx,cy])} ${p([W,cy])}`, cx: W-40, cy: cy },
  // H8 — top-right corner triangle
  { poly: `${p([cx,0])} ${p([W,0])} ${p([W,cy])}`,                  cx: W-52, cy: 52 },
  // Inner 4 (split the inner diamond into 4 triangles):
  // H9 — right inner triangle
  { poly: `${p([cx,0])} ${p([W,cy])} ${p([cx,cy])}`,               cx: cx+52, cy: cy-52 },
  // H10 — bottom inner triangle (MC)
  { poly: `${p([W,cy])} ${p([cx,H])} ${p([cx,cy])}`,               cx: cx+52, cy: cy+52 },
  // H11 — left inner triangle
  { poly: `${p([cx,H])} ${p([0,cy])} ${p([cx,cy])}`,               cx: cx-52, cy: cy+52 },
  // H12 — top inner triangle
  { poly: `${p([0,cy])} ${p([cx,0])} ${p([cx,cy])}`,               cx: cx-52, cy: cy-52 },
];

export function ChartViewer({ chart }: ChartViewerProps) {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  const housePlanets = new Map<number, PlanetPosition[]>();
  for (const planet of chart.planets) {
    const existing = housePlanets.get(planet.house) ?? [];
    existing.push(planet);
    housePlanets.set(planet.house, existing);
  }

  const ascSignIndex = chart.ascendant.signIndex;

  // North Indian chart: house positions are FIXED (not rotating).
  // Signs rotate — the sign assigned to H1 position is always the Lagna sign.
  // House N's sign = (ascSignIndex + N - 1) % 12
  const getHouseSign = (housePos: number): string => {
    const signIndex = (ascSignIndex + housePos - 1) % 12;
    const signs = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
    return signs[signIndex] ?? '';
  };

  const stroke = 'hsl(258 30% 18%)';
  const strokeHover = 'hsl(258 84% 70% / 0.6)';

  return (
    <div className="space-y-4">
      <div className="relative max-w-[340px] mx-auto">
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full"
          aria-label="North Indian birth chart"
        >
          {/* Background */}
          <rect x="0" y="0" width="320" height="320" fill="hsl(258 25% 7%)" rx="4" />

          {/* House compartments */}
          {HOUSES.map(({ poly, cx: hcx, cy: hcy }, idx) => {
            const houseNum = idx + 1;
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
                  points={poly}
                  fill={isHov ? 'hsl(258 40% 14%)' : 'transparent'}
                  stroke={isHov ? strokeHover : stroke}
                  strokeWidth="1"
                />

                {/* House number — small, top of cell */}
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

                {/* Planets */}
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
            x="160" y="162"
            textAnchor="middle"
            fontSize="7.5"
            fill="hsl(258 60% 55%)"
            fontFamily="system-ui"
            letterSpacing="0.8"
            fontWeight="500"
          >
            {chart.ascendant.sign.slice(0,3).toUpperCase()}
          </text>
          <text
            x="160" y="172"
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
  if (planet.isExalted)    return 'hsl(43 80% 62%)';
  if (planet.isDebilitated) return 'hsl(0 72% 58%)';
  if (planet.isCombust)    return 'hsl(220 10% 48%)';
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
