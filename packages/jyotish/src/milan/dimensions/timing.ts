/**
 * Temporal / dasha alignment dimension.
 */

import type { CanonicalChart, CompatibilityDimension, CoupleDashaWindow, DashaPeriod, PlanetId } from '@luckyray/shared';
import { getPlanet, dignityScore, clampScore } from '../helpers';

const MARRIAGE_HOUSES = new Set([5, 7, 11]);
const STRESS_HOUSES = new Set([6, 8, 12]);

function planetSignifiesMarriage(chart: CanonicalChart, planet: PlanetId): boolean {
  const p = getPlanet(chart, planet);
  if (!p) return false;
  if (MARRIAGE_HOUSES.has(p.house)) return true;
  // sign lord of 5/7/11
  for (const h of [5, 7, 11]) {
    const house = chart.houses[h - 1];
    if (house && house.lord === planet) return true;
  }
  return false;
}

function planetInStressHouse(chart: CanonicalChart, planet: PlanetId): boolean {
  const p = getPlanet(chart, planet);
  return p ? STRESS_HOUSES.has(p.house) : false;
}

function scorePeriods(chart: CanonicalChart, maha: DashaPeriod, antar: DashaPeriod | null): number {
  const mahaP = getPlanet(chart, maha.planet);
  const antarP = antar ? getPlanet(chart, antar.planet) : null;
  let score = 0;
  if (mahaP) score += dignityScore(mahaP) * 0.5;
  if (antarP) score += dignityScore(antarP) * 0.5;
  else score += 25;

  if (planetSignifiesMarriage(chart, maha.planet)) score += 15;
  if (antar && planetSignifiesMarriage(chart, antar.planet)) score += 15;
  if (planetInStressHouse(chart, maha.planet)) score -= 15;
  if (antar && planetInStressHouse(chart, antar.planet)) score -= 15;

  return clampScore(score);
}

function overlapDates(startA: string, endA: string, startB: string, endB: string): { start: Date; end: Date } | null {
  const sA = new Date(startA);
  const eA = new Date(endA);
  const sB = new Date(startB);
  const eB = new Date(endB);
  const start = sA > sB ? sA : sB;
  const end = eA < eB ? eA : eB;
  if (start >= end) return null;
  return { start, end };
}

export function computeTiming(
  chartA: CanonicalChart,
  chartB: CanonicalChart,
): CompatibilityDimension {
  const evidence: string[] = [];
  const windows: CoupleDashaWindow[] = [];

  const currentA = scorePeriods(chartA, chartA.dashas.currentMahadasha, chartA.dashas.currentAntardasha);
  const currentB = scorePeriods(chartB, chartB.dashas.currentMahadasha, chartB.dashas.currentAntardasha);

  evidence.push(
    `${chartA.profile.name} current dasha score: ${currentA.toFixed(0)}/100`,
    `${chartB.profile.name} current dasha score: ${currentB.toFixed(0)}/100`,
  );

  // Penalty if both are in stressful periods simultaneously
  let score = (currentA + currentB) / 2;
  const bothStressful =
    planetInStressHouse(chartA, chartA.dashas.currentMahadasha.planet) &&
    planetInStressHouse(chartB, chartB.dashas.currentMahadasha.planet);
  if (bothStressful) {
    score -= 20;
    evidence.push('Both are currently in stressful (6/8/12) Mahadashas');
  }

  // Find upcoming windows where both charts activate 5/7/11
  const now = new Date();
  for (const mahaA of chartA.dashas.allPeriods) {
    for (const antarA of mahaA.antardasha ?? []) {
      if (new Date(antarA.endDate) <= now) continue;
      const aGood = planetSignifiesMarriage(chartA, mahaA.planet) || planetSignifiesMarriage(chartA, antarA.planet);
      if (!aGood) continue;

      for (const mahaB of chartB.dashas.allPeriods) {
        for (const antarB of mahaB.antardasha ?? []) {
          if (new Date(antarB.endDate) <= now) continue;
          const bGood = planetSignifiesMarriage(chartB, mahaB.planet) || planetSignifiesMarriage(chartB, antarB.planet);
          if (!bGood) continue;

          const overlap = overlapDates(antarA.startDate, antarA.endDate, antarB.startDate, antarB.endDate);
          if (!overlap) continue;

          const windowScore = clampScore(
            (dignityScore(getPlanet(chartA, mahaA.planet)) + dignityScore(getPlanet(chartB, mahaB.planet))) / 2,
          );

          windows.push({
            startDate: overlap.start.toISOString().slice(0, 10),
            endDate: overlap.end.toISOString().slice(0, 10),
            mahadashaA: mahaA.planet,
            antardashaA: antarA.planet,
            mahadashaB: mahaB.planet,
            antardashaB: antarB.planet,
            score: windowScore,
            reason: `Both charts activate marriage houses (5/7/11): ${mahaA.planet}/${antarA.planet} and ${mahaB.planet}/${antarB.planet}`,
          });

          if (windows.length >= 5) break;
        }
        if (windows.length >= 5) break;
      }
      if (windows.length >= 5) break;
    }
    if (windows.length >= 5) break;
  }

  if (windows.length > 0) {
    evidence.push(`${windows.length} upcoming favorable joint dasha window(s) found`);
  }

  return {
    id: 'timing',
    name: 'Dasha Timing Alignment',
    weight: 0.10,
    score: clampScore(score),
    maxScore: 100,
    evidence,
    risks: bothStressful ? ['Both partners are in stressful dasha periods simultaneously'] : [],
    metadata: { windows },
  };
}
