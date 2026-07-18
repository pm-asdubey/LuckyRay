'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PlanetPosition } from '@luckyray/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDegrees } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateSign, translateNakshatra, translateDignity } from '@/lib/i18n';

interface PlanetCardProps {
  planet: PlanetPosition;
}

const dignityVariant: Record<string, 'gold' | 'success' | 'accent' | 'default' | 'error' | 'warning'> = {
  Exalted: 'gold',
  Moolatrikona: 'success',
  OwnSign: 'accent',
  FriendlySign: 'default',
  NeutralSign: 'default',
  EnemySign: 'warning',
  Debilitated: 'error',
};

export function PlanetCard({ planet }: PlanetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const pc = t.chart.planetCard;

  const dignityLabel = translateDignity(planet.dignity, language);
  const variant = dignityVariant[planet.dignity] ?? 'default';

  const planetName = translatePlanet(planet.name, language);
  const signName = translateSign(planet.sign, language);
  const nakshatraName = translateNakshatra(planet.nakshatra, language);

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
            <span className="text-sm font-semibold text-content">{planetName}</span>
            <span className="text-2xs text-content-subtle">({planet.sanskritName})</span>
            {planet.isRetrograde && <Badge variant="accent">℞</Badge>}
            {planet.isCombust && <Badge variant="warning">{pc.combust}</Badge>}
          </div>
          <div className="text-xs text-content-muted mt-0.5">
            {signName} · {pc.house} {planet.house} · {formatDegrees(planet.degreesInSign, planet.minutesInSign)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={variant}>{dignityLabel}</Badge>
          {expanded ? <ChevronUp size={14} className="text-content-subtle" /> : <ChevronDown size={14} className="text-content-subtle" />}
        </div>
      </button>

      {expanded && (
        <div
          id={`planet-${planet.id}-details`}
          className="px-4 pb-4 pt-0 border-t border-surface-border"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <InfoItem label={pc.nakshatra} value={`${nakshatraName} (P${planet.pada})`} />
            <InfoItem label={pc.sign} value={signName} />
            <InfoItem label={pc.house} value={planet.house.toString()} />
            <InfoItem label={pc.degree} value={formatDegrees(planet.degreesInSign, planet.minutesInSign)} />
            <InfoItem label={pc.siderealLong} value={`${planet.siderealLongitude.toFixed(2)}°`} />
            <InfoItem
              label={pc.retrograde}
              value={planet.isRetrograde ? pc.yes : pc.no}
              highlight={planet.isRetrograde}
            />
            <InfoItem
              label={pc.combust}
              value={planet.isCombust ? pc.yes : pc.no}
              highlight={planet.isCombust}
            />
            <InfoItem
              label={pc.exalted}
              value={planet.isExalted ? pc.yes : pc.no}
              positive={planet.isExalted}
            />
            <InfoItem
              label={pc.debilitated}
              value={planet.isDebilitated ? pc.yes : pc.no}
              highlight={planet.isDebilitated}
            />
            <InfoItem
              label={pc.nature}
              value={planet.naturalBenefic ? pc.naturalBenefic : pc.naturalMalefic}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label, value, highlight, positive,
}: {
  label: string; value: string; highlight?: boolean; positive?: boolean;
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
