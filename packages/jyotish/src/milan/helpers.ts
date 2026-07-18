/**
 * Shared helpers for the Milan compatibility engine.
 */

import type { CanonicalChart, PlanetId, PlanetPosition, AspectData } from '@luckyray/shared';
import { SIGN_IDS, SIGN_ELEMENT } from '@luckyray/shared';
import { NATURAL_FRIENDSHIPS, SIGN_LORDS } from '@luckyray/shared';

export type SignDistanceCategory =
  | 'same'
  | 'trine'
  | 'sextil'
  | 'square'
  | 'opposition'
  | 'shadAshtak'
  | 'neutral';

export function getPlanet(chart: CanonicalChart, id: PlanetId): PlanetPosition | undefined {
  return chart.planets.find(p => p.id === id);
}

export function getD9Planet(chart: CanonicalChart, id: PlanetId) {
  return chart.divisionalCharts.D9.planets.find(p => p.id === id);
}

export function signName(signIndex: number): string {
  return SIGN_IDS[signIndex] ?? String(signIndex);
}

/**
 * How many signs B is ahead of A (1–12).
 * A in Aries (0), B in Aries (0) → 1 (same sign).
 */
export function signDistance(aSignIndex: number, bSignIndex: number): number {
  return ((bSignIndex - aSignIndex + 12) % 12) + 1;
}

export function distanceCategory(distance: number): SignDistanceCategory {
  if (distance === 1) return 'same';
  if ([5, 9].includes(distance)) return 'trine';
  if ([3, 11].includes(distance)) return 'sextil';
  if ([4, 10].includes(distance)) return 'square';
  if (distance === 7) return 'opposition';
  if ([6, 8, 12].includes(distance)) return 'shadAshtak';
  if ([2].includes(distance)) return 'neutral';
  return 'neutral';
}

export function sameElement(aSignIndex: number, bSignIndex: number): boolean {
  return SIGN_ELEMENT[SIGN_IDS[aSignIndex]!] === SIGN_ELEMENT[SIGN_IDS[bSignIndex]!];
}

export function signLord(signIndex: number): PlanetId {
  return SIGN_LORDS[signIndex]!;
}

export function areLordsFriendly(aSignIndex: number, bSignIndex: number): boolean {
  const lordA = signLord(aSignIndex);
  const lordB = signLord(bSignIndex);
  const status = NATURAL_FRIENDSHIPS[lordA]?.[lordB];
  return status === 'friend';
}

export function lordFriendshipStatus(aSignIndex: number, bSignIndex: number): 'friend' | 'neutral' | 'enemy' {
  const lordA = signLord(aSignIndex);
  const lordB = signLord(bSignIndex);
  return NATURAL_FRIENDSHIPS[lordA]?.[lordB] ?? 'neutral';
}

export function dignityScore(planet: PlanetPosition | undefined): number {
  if (!planet) return 50;
  switch (planet.dignity) {
    case 'Exalted': return 100;
    case 'Moolatrikona': return 90;
    case 'OwnSign': return 80;
    case 'FriendlySign': return 70;
    case 'NeutralSign': return 50;
    case 'EnemySign': return 30;
    case 'Debilitated': return 10;
    default: return 50;
  }
}

export function planetAspectsOnTarget(
  chart: CanonicalChart,
  target: PlanetId,
  sources?: PlanetId[],
): AspectData[] {
  return chart.aspects.filter(a => {
    if (a.targetPlanets.includes(target)) {
      if (!sources) return true;
      return sources.includes(a.sourcePlanet);
    }
    return false;
  });
}

export function planetAspectsOnHouse(
  chart: CanonicalChart,
  house: number,
  sources?: PlanetId[],
): AspectData[] {
  return chart.aspects.filter(a => {
    if (a.targetHouse === house) {
      if (!sources) return true;
      return sources.includes(a.sourcePlanet);
    }
    return false;
  });
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n));
}
