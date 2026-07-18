/**
 * Individual strength dimension — per-person foundation for the relationship.
 */

import type { CanonicalChart } from '@luckyray/shared';
import { SIGN_IDS } from '@luckyray/shared';
import { getPlanet, dignityScore, clampScore } from '../helpers';

function signIndexFromId(sign: string): number {
  return SIGN_IDS.indexOf(sign as (typeof SIGN_IDS)[number]);
}

export function computeIndividualStrength(chart: CanonicalChart): number {
  const moon = getPlanet(chart, 'Moon');
  const venus = getPlanet(chart, 'Venus');
  const house7 = chart.houses[6]!;
  const lord7 = getPlanet(chart, house7.lord);

  let score = 0;
  let count = 0;

  if (moon) { score += dignityScore(moon); count++; }
  if (venus) { score += dignityScore(venus); count++; }
  if (lord7) { score += dignityScore(lord7); count++; }

  // D9 ascendant lord dignity
  const d9Asc = chart.divisionalCharts.D9.ascendant;
  const d9AscIdx = signIndexFromId(d9Asc);
  const d9LordId = chart.houses.find(h => h.signIndex === d9AscIdx)?.lord;
  if (d9LordId) {
    const d9Lord = getPlanet(chart, d9LordId);
    if (d9Lord) {
      score += dignityScore(d9Lord);
      count++;
    }
  }

  // Current dasha dignity
  const mdLord = getPlanet(chart, chart.dashas.currentMahadasha.planet);
  if (mdLord) {
    score += dignityScore(mdLord);
    count++;
  }

  return count > 0 ? clampScore(score / count) : 50;
}
