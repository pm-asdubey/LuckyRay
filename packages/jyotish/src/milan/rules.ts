/**
 * Milan scoring rules, weights, and verdict thresholds.
 */

import type { CompatibilityVerdict } from '@luckyray/shared';

export interface DimensionWeight {
  id: string;
  weight: number;
}

export const DIMENSION_WEIGHTS: DimensionWeight[] = [
  { id: 'emotional',  weight: 0.25 },
  { id: 'romantic',   weight: 0.15 },
  { id: 'marriage',   weight: 0.20 },
  { id: 'conflict',   weight: 0.10 },
  { id: 'timing',     weight: 0.10 },
  { id: 'doshas',     weight: 0.10 },
  { id: 'individual', weight: 0.10 },
];

export function getVerdict(finalScore: number): CompatibilityVerdict {
  if (finalScore >= 9.0) return 'Exceptional';
  if (finalScore >= 8.5) return 'Excellent';
  if (finalScore >= 8.0) return 'Strong';
  if (finalScore >= 7.5) return 'Good';
  if (finalScore >= 7.0) return 'Conditional';
  if (finalScore >= 6.0) return 'Weak';
  return 'No-Go';
}

export function map36to100(score36: number): number {
  return (score36 / 36) * 100;
}

export function scoreFromDistanceCategory(category: import('./helpers').SignDistanceCategory): number {
  switch (category) {
    case 'same': return 70;
    case 'trine': return 90;
    case 'sextil': return 75;
    case 'square': return 50;
    case 'opposition': return 45;
    case 'shadAshtak': return 25;
    case 'neutral': return 60;
    default: return 50;
  }
}
