'use client';

/**
 * Shadbal — Planetary Strength Table
 *
 * Shadbal (6 types of strength) is the classical Parashari method for measuring
 * planetary strength. A simplified display based on available chart data:
 *  - Sthana Bala (positional strength): Exalted, Moolatrikona, Own, Friendly, Enemy, Debilitated
 *  - Dig Bala (directional strength): based on house position
 *  - Kala Bala (temporal strength): day/night planets, retrograde bonus
 *  - Chesta Bala (motional strength): retrograde/combust
 *  - Naisargika Bala (natural strength): fixed hierarchy
 *  - Drik Bala (aspectual strength): based on dignity and aspects
 *
 * This is a qualitative display; exact Shadbal requires astronomical precision
 * beyond the current scope. Displayed as a strength score 0-100.
 */

import type { PlanetPosition } from '@luckyray/shared';
import { PLANET_SYMBOLS } from '@luckyray/shared';
import { cn } from '@/lib/utils';

interface ShadbalTableProps {
  planets: PlanetPosition[];
}

// Naisargika (natural) strength hierarchy: Sun > Moon > Venus > Jupiter > Mercury > Mars > Saturn
const NATURAL_STRENGTH: Record<string, number> = {
  Sun: 60, Moon: 51, Venus: 45, Jupiter: 39, Mercury: 34, Mars: 28, Saturn: 17, Rahu: 20, Ketu: 20,
};

// Dig Bala: each planet has a preferred house (direction)
const DIG_BALA_HOUSE: Record<string, number> = {
  Sun: 10, Moon: 4, Mars: 10, Mercury: 1, Jupiter: 1, Venus: 4, Saturn: 7,
};

function computeStrength(p: PlanetPosition): {
  sthana: number; dig: number; kala: number; chesta: number; naisargika: number; total: number;
} {
  // Sthana Bala (0-100)
  let sthana = 30; // base
  if (p.isExalted)          sthana = 100;
  else if (p.isInMoolatrikona) sthana = 85;
  else if (p.isInOwnSign)   sthana = 75;
  else if (p.dignity === 'FriendlySign') sthana = 55;
  else if (p.dignity === 'NeutralSign') sthana = 40;
  else if (p.dignity === 'EnemySign') sthana = 25;
  else if (p.isDebilitated)  sthana = 10;

  // Dig Bala (0-100): based on how close house is to preferred house
  const preferredH = DIG_BALA_HOUSE[p.id] ?? 1;
  const hDist = Math.min(
    Math.abs(p.house - preferredH),
    12 - Math.abs(p.house - preferredH),
  );
  const dig = Math.max(0, 100 - hDist * (100 / 6));

  // Kala Bala (0-100): temporal factors
  let kala = 50;
  const benefics = ['Moon', 'Mercury', 'Jupiter', 'Venus'];
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  kala += benefics.includes(p.id) ? 15 : 0;
  kala -= malefics.includes(p.id) ? 5 : 0;
  kala = Math.max(0, Math.min(100, kala));

  // Chesta Bala (0-100): motional strength
  let chesta = 50;
  if (p.isRetrograde) chesta = 80; // retrograde = stronger chesta
  if (p.isCombust)    chesta = 10; // combust = very weak

  // Naisargika (0-100): natural strength (normalize to 100 scale)
  const naisargika = Math.round(((NATURAL_STRENGTH[p.id] ?? 30) / 60) * 100);

  // Total weighted: sthana(40%) + dig(15%) + kala(15%) + chesta(15%) + naisargika(15%)
  const total = Math.round(
    sthana * 0.40 + dig * 0.15 + kala * 0.15 + chesta * 0.15 + naisargika * 0.15,
  );

  return { sthana, dig, kala, chesta, naisargika, total };
}

function StrengthBar({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-accent' : value >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-2xs text-content-muted w-7 text-right">{value}</span>
    </div>
  );
}

export function ShadbalTable({ planets }: ShadbalTableProps) {
  const visiblePlanets = planets.filter(p => !['Rahu', 'Ketu'].includes(p.id));

  return (
    <div className="space-y-3">
      <div className="text-xs text-content-muted leading-relaxed bg-surface-elevated border border-surface-border rounded-xl px-4 py-3">
        <span className="font-semibold text-content">Shadbal</span> — qualitative planetary strength across 5 dimensions.
        Sthana (position) · Dig (direction) · Kala (time) · Chesta (motion) · Naisargika (nature).
      </div>

      {/* Header */}
      <div className="hidden md:grid grid-cols-[80px_1fr_80px_80px_80px_80px_80px] gap-2 px-4 py-2 text-2xs font-semibold text-content-muted uppercase tracking-wider">
        <span>Planet</span>
        <span>Sthana</span>
        <span className="text-center">Dig</span>
        <span className="text-center">Kala</span>
        <span className="text-center">Chesta</span>
        <span className="text-center">Naisa.</span>
        <span className="text-right">Total</span>
      </div>

      {visiblePlanets.map(planet => {
        const { sthana, dig, kala, chesta, naisargika, total } = computeStrength(planet);
        const symbol = PLANET_SYMBOLS[planet.id as keyof typeof PLANET_SYMBOLS] ?? '';

        return (
          <div
            key={planet.id}
            className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 space-y-2 md:space-y-0 md:grid md:grid-cols-[80px_1fr_80px_80px_80px_80px_80px] md:gap-2 md:items-center"
          >
            {/* Planet name */}
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden>{symbol}</span>
              <div>
                <div className="text-xs font-semibold text-content">{planet.id}</div>
                <div className="text-2xs text-content-muted">{planet.dignity}</div>
              </div>
            </div>

            {/* Sthana bar (shown full-width) */}
            <div className="space-y-0.5">
              <div className="text-2xs text-content-subtle md:hidden">Sthana (position)</div>
              <StrengthBar value={sthana} />
            </div>

            {/* Compact scores */}
            <CompactScore label="Dig" value={dig} />
            <CompactScore label="Kala" value={kala} />
            <CompactScore label="Chesta" value={chesta} />
            <CompactScore label="Naisa." value={naisargika} />

            {/* Total */}
            <div className="text-right">
              <span className={cn(
                'text-sm font-bold',
                total >= 75 ? 'text-emerald-400' : total >= 50 ? 'text-accent' : total >= 30 ? 'text-yellow-400' : 'text-red-400',
              )}>
                {total}
              </span>
              <span className="text-2xs text-content-subtle">/100</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompactScore({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? 'text-emerald-400' : value >= 50 ? 'text-accent' : value >= 30 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center md:text-center">
      <div className="text-2xs text-content-subtle md:hidden">{label}</div>
      <div className={cn('text-xs font-semibold', color)}>{value}</div>
    </div>
  );
}
