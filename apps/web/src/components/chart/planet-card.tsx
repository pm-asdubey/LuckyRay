'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PlanetPosition } from '@luckyray/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDegrees } from '@/lib/utils';

interface PlanetCardProps {
  planet: PlanetPosition;
}

const dignityBadge: Record<string, { variant: 'gold' | 'success' | 'accent' | 'default' | 'error' | 'warning'; label: string }> = {
  Exalted:       { variant: 'gold',    label: 'Exalted' },
  Moolatrikona:  { variant: 'success', label: 'Moolatrikona' },
  OwnSign:       { variant: 'accent',  label: 'Own sign' },
  FriendlySign:  { variant: 'default', label: 'Friendly' },
  NeutralSign:   { variant: 'default', label: 'Neutral' },
  EnemySign:     { variant: 'warning', label: 'Enemy' },
  Debilitated:   { variant: 'error',   label: 'Debilitated' },
};

export function PlanetCard({ planet }: PlanetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const dignity = dignityBadge[planet.dignity] ?? { variant: 'default' as const, label: planet.dignity };

  return (
    <div
      className={cn(
        'rounded-xl border border-surface-border bg-surface-elevated',
        'transition-colors hover:border-surface-overlay',
      )}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`planet-${planet.id}-details`}
      >
        <div className="flex-shrink-0 text-xl w-7 text-center" aria-hidden="true">
          {planet.symbol}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-content">{planet.name}</span>
            <span className="text-2xs text-content-subtle">({planet.sanskritName})</span>
            {planet.isRetrograde && <Badge variant="accent">℞</Badge>}
            {planet.isCombust && <Badge variant="warning">Combust</Badge>}
          </div>
          <div className="text-xs text-content-muted mt-0.5">
            {planet.sign} · House {planet.house} · {formatDegrees(planet.degreesInSign, planet.minutesInSign)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={dignity.variant}>{dignity.label}</Badge>
          {expanded ? <ChevronUp size={14} className="text-content-subtle" /> : <ChevronDown size={14} className="text-content-subtle" />}
        </div>
      </button>

      {expanded && (
        <div
          id={`planet-${planet.id}-details`}
          className="px-4 pb-4 pt-0 border-t border-surface-border"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <InfoItem label="Nakshatra" value={`${planet.nakshatra} (P${planet.pada})`} />
            <InfoItem label="Sign" value={planet.sign} />
            <InfoItem label="House" value={planet.house.toString()} />
            <InfoItem label="Degree" value={formatDegrees(planet.degreesInSign, planet.minutesInSign)} />
            <InfoItem label="Sidereal Long." value={`${planet.siderealLongitude.toFixed(2)}°`} />
            <InfoItem
              label="Retrograde"
              value={planet.isRetrograde ? 'Yes' : 'No'}
              highlight={planet.isRetrograde}
            />
            <InfoItem
              label="Combust"
              value={planet.isCombust ? 'Yes' : 'No'}
              highlight={planet.isCombust}
            />
            <InfoItem
              label="Exalted"
              value={planet.isExalted ? 'Yes' : 'No'}
              positive={planet.isExalted}
            />
            <InfoItem
              label="Debilitated"
              value={planet.isDebilitated ? 'Yes' : 'No'}
              highlight={planet.isDebilitated}
            />
            <InfoItem label="Nature" value={planet.naturalBenefic ? 'Natural Benefic' : 'Natural Malefic'} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div>
      <div className="text-2xs text-content-subtle font-medium uppercase tracking-wider">{label}</div>
      <div className={cn(
        'text-xs font-medium mt-0.5',
        highlight ? 'text-warning' : positive ? 'text-gold' : 'text-content',
      )}>
        {value}
      </div>
    </div>
  );
}
