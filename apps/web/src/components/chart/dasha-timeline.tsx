'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DashaData, DashaPeriod } from '@luckyray/shared';
import { PLANET_SYMBOLS } from '@luckyray/shared';
import { formatDashaDuration } from '@luckyray/jyotish';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { translatePlanet, translateNakshatra } from '@/lib/i18n';

interface DashaTimelineProps {
  dashas: DashaData;
  profileId?: string;
}

export function DashaTimeline({ dashas, profileId }: DashaTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(dashas.currentMahadasha.planet);
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const d = t.chart.dasha;
  const now = new Date();

  const currentPlanet = translatePlanet(dashas.currentMahadasha.planet, language);
  const birthNakshatra = translateNakshatra(dashas.birthNakshatra, language);
  const birthNakshatraLord = translatePlanet(dashas.birthNakshatraLord, language);

  return (
    <div className="space-y-3">
      {/* Current period summary */}
      <div className="rounded-xl border border-accent-muted bg-accent-subtle p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {PLANET_SYMBOLS[dashas.currentMahadasha.planet] ?? ''}
          </span>
          <div className="flex-1">
            <div className="text-xs text-accent font-medium uppercase tracking-wider">
              {d.currentMahadasha}
            </div>
            <div className="text-sm font-semibold text-content">
              {currentPlanet}
            </div>
          </div>
          {profileId && (
            <Link href={`/dasha/${profileId}`} className="text-2xs text-accent hover:underline flex items-center gap-1">
              {d.fullView} <ExternalLink size={10} />
            </Link>
          )}
        </div>
        {dashas.currentAntardasha && (
          <div className="text-xs text-content-muted">
            {d.antardasha}: <span className="text-content font-medium">{translatePlanet(dashas.currentAntardasha.planet, language)}</span>
            {' '}· {d.until} {formatDate(dashas.currentAntardasha.endDate)}
          </div>
        )}
        {dashas.currentPratyantar && (
          <div className="text-xs text-content-muted">
            {d.pratyantar}: <span className="text-content font-medium">{translatePlanet(dashas.currentPratyantar.planet, language)}</span>
            {' '}· {d.until} {formatDate(dashas.currentPratyantar.endDate)}
          </div>
        )}
        <div className="text-2xs text-content-subtle">
          {d.moonIn} {birthNakshatra} {d.atBirth} · {d.nakshatraLord}: {birthNakshatraLord}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {dashas.allPeriods.map((period) => {
          const isCurrent = new Date(period.startDate) <= now && new Date(period.endDate) >= now;
          const isPast = new Date(period.endDate) < now;
          const isExpanded = expanded === period.planet;

          return (
            <DashaPeriodRow
              key={`${period.planet}-${period.startDate}`}
              period={period}
              isCurrent={isCurrent}
              isPast={isPast}
              isExpanded={isExpanded}
              onToggle={() => setExpanded(isExpanded ? null : period.planet)}
            />
          );
        })}
      </div>
    </div>
  );
}

function DashaPeriodRow({
  period, isCurrent, isPast, isExpanded, onToggle,
}: {
  period: DashaPeriod; isCurrent: boolean; isPast: boolean; isExpanded: boolean; onToggle: () => void;
}) {
  const now = new Date();
  const t = useTranslation();
  const language = useAppStore(s => s.language);
  const d = t.chart.dasha;
  const planetName = translatePlanet(period.planet, language);

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      isCurrent ? 'border-accent-muted bg-accent-subtle/30' : 'border-surface-border bg-surface-elevated',
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className="text-base w-6 text-center flex-shrink-0" aria-hidden="true">
          {PLANET_SYMBOLS[period.planet] ?? ''}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-semibold',
              isCurrent ? 'text-accent' : isPast ? 'text-content-subtle' : 'text-content',
            )}>
              {planetName}
            </span>
            {isCurrent && <Badge variant="accent">{d.current}</Badge>}
          </div>
          <div className="text-2xs text-content-muted mt-0.5">
            {formatDate(period.startDate)} — {formatDate(period.endDate)} · {formatDashaDuration(period.durationYears)}
          </div>
        </div>
        {period.antardasha && period.antardasha.length > 0 && (
          <ChevronDown
            size={14}
            className={cn(
              'text-content-subtle flex-shrink-0 transition-transform',
              isExpanded && 'rotate-180',
            )}
          />
        )}
      </button>

      {/* Antardasha breakdown */}
      {isExpanded && period.antardasha && (
        <div className="px-4 pb-3 border-t border-surface-border">
          <div className="mt-3 space-y-1">
            {period.antardasha.map((anti) => {
              const isAntiCurrent = new Date(anti.startDate) <= now && new Date(anti.endDate) >= now;
              return (
                <div
                  key={`${anti.planet}-${anti.startDate}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg',
                    isAntiCurrent && 'bg-accent-subtle',
                  )}
                >
                  <span className="text-sm w-5 text-center text-content-muted" aria-hidden="true">
                    {PLANET_SYMBOLS[anti.planet] ?? ''}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-xs font-medium',
                      isAntiCurrent ? 'text-accent' : 'text-content-muted',
                    )}>
                      {translatePlanet(anti.planet, language)}
                    </span>
                    <span className="text-2xs text-content-subtle ml-2">
                      {formatDate(anti.startDate)} — {formatDate(anti.endDate)}
                    </span>
                  </div>
                  {isAntiCurrent && <Badge variant="accent">{d.now}</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
