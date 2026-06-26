'use client';

import { useState } from 'react';
import type { YogaData } from '@luckyray/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, CheckCircle, Circle } from 'lucide-react';

interface YogaListProps {
  yogas: YogaData[];
}

export function YogaList({ yogas }: YogaListProps) {
  const detected = yogas.filter(y => y.detected);
  const undetected = yogas.filter(y => !y.detected);

  return (
    <div className="space-y-2">
      {detected.length > 0 && (
        <div className="space-y-2">
          {detected.map(yoga => (
            <YogaCard key={yoga.id} yoga={yoga} />
          ))}
        </div>
      )}
      {detected.length === 0 && (
        <div className="text-xs text-content-muted text-center py-6">
          No classical yogas detected in this chart.
        </div>
      )}
    </div>
  );
}

function YogaCard({ yoga }: { yoga: YogaData }) {
  const [expanded, setExpanded] = useState(false);

  const strengthBadge = yoga.strength === 'Strong'
    ? 'gold'
    : yoga.strength === 'Moderate'
    ? 'accent'
    : 'default';

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      yoga.detected
        ? 'border-surface-border bg-surface-elevated hover:border-accent-muted/50'
        : 'border-surface-border/50 bg-surface-elevated/50',
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {yoga.detected ? (
          <CheckCircle size={15} className="text-success flex-shrink-0" />
        ) : (
          <Circle size={15} className="text-content-subtle flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-sm font-semibold',
              yoga.detected ? 'text-content' : 'text-content-muted',
            )}>
              {yoga.name}
            </span>
            {yoga.strength && (
              <Badge variant={strengthBadge as 'gold' | 'accent' | 'default'}>{yoga.strength}</Badge>
            )}
            <Badge variant="default">{yoga.category}</Badge>
          </div>
        </div>

        {(yoga.description || yoga.evidence.length > 0) && (
          <ChevronDown
            size={14}
            className={cn(
              'text-content-subtle flex-shrink-0 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-border space-y-3 mt-1 pt-3">
          {yoga.description && (
            <p className="text-xs text-content-muted leading-relaxed">{yoga.description}</p>
          )}
          {yoga.evidence.length > 0 && (
            <div>
              <div className="text-2xs font-semibold text-content-subtle uppercase tracking-wider mb-1.5">
                Chart evidence
              </div>
              <ul className="space-y-1">
                {yoga.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-content-muted">
                    <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {yoga.reference && (
            <div className="text-2xs text-content-subtle italic">
              Source: {yoga.reference}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
