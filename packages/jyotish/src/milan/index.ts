/**
 * Kundli Milan / Compatibility Engine
 *
 * Computes a deterministic compatibility analysis from two canonical charts.
 * Scoring is reproducible from chart data; the AI layer only narrates.
 */

import type { CanonicalChart, CompatibilityResult, CompatibilityDimension } from '@luckyray/shared';
import { computeGunaMilan, getMoonDataFromLongitude } from '../guna-milan';
import { getPlanet } from './helpers';
import { DIMENSION_WEIGHTS, getVerdict } from './rules';
import { computeEmotional } from './dimensions/emotional';
import { computeRomantic } from './dimensions/romantic';
import { computeMarriage } from './dimensions/marriage';
import { computeConflict } from './dimensions/conflict';
import { computeTiming } from './dimensions/timing';
import { computeDoshas } from './dimensions/doshas';
import { computeIndividualStrength } from './dimensions/individual';

export interface MilanInput {
  chartA: CanonicalChart;
  chartB: CanonicalChart;
}

export function computeCompatibility(input: MilanInput): CompatibilityResult {
  const { chartA, chartB } = input;

  const emotional = computeEmotional(chartA, chartB);
  const romantic = computeRomantic(chartA, chartB);
  const marriage = computeMarriage(chartA, chartB);
  const conflict = computeConflict(chartA, chartB);
  const timing = computeTiming(chartA, chartB);
  const doshas = computeDoshas(chartA, chartB);

  const individualA = computeIndividualStrength(chartA);
  const individualB = computeIndividualStrength(chartB);

  const dimensions: CompatibilityDimension[] = [emotional, romantic, marriage, conflict, timing, doshas];

  const compositeScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) /
    dimensions.reduce((sum, d) => sum + d.weight, 0);

  const avgIndividual = (individualA + individualB) / 2;
  const finalScore = compositeScore * 0.70 + avgIndividual * 0.30;
  const verdict = getVerdict(finalScore / 10); // finalScore is 0–100, scale to 0–10

  // Aggregate strengths and risks
  const strengths: string[] = [];
  const risks: string[] = [];
  for (const d of dimensions) {
    if (d.score >= 80) strengths.push(`${d.name}: strong`);
    else if (d.score <= 45) risks.push(`${d.name}: weak`);
    strengths.push(...d.evidence.filter(e => !e.startsWith('Ashtakoot') || d.score >= 70).slice(0, 3));
    risks.push(...d.risks.slice(0, 3));
  }

  // Ashtakoot snapshot
  const moonA = getPlanet(chartA, 'Moon')!;
  const moonB = getPlanet(chartB, 'Moon')!;
  const ashtakoot = computeGunaMilan({
    person1Name: chartA.profile.name,
    person1NakshatraIndex: getMoonDataFromLongitude(moonA.siderealLongitude).nakshatraIndex,
    person1SignIndex: moonA.signIndex,
    person2Name: chartB.profile.name,
    person2NakshatraIndex: getMoonDataFromLongitude(moonB.siderealLongitude).nakshatraIndex,
    person2SignIndex: moonB.signIndex,
  });

  return {
    profileA: chartA.profile,
    profileB: chartB.profile,
    dimensions,
    compositeScore: Math.round(compositeScore * 10) / 10,
    finalScore: Math.round(finalScore * 10) / 10,
    verdict,
    individualStrengthA: Math.round(individualA),
    individualStrengthB: Math.round(individualB),
    strengths: [...new Set(strengths)].slice(0, 8),
    risks: [...new Set(risks)].slice(0, 8),
    hardFilters: doshas.risks.filter(r =>
      r.toLowerCase().includes('manglik') ||
      r.toLowerCase().includes('nadi') ||
      r.toLowerCase().includes('bhakoot'),
    ),
    ashtakoot: {
      total: ashtakoot.totalScore,
      max: ashtakoot.maxScore,
      kootas: ashtakoot.kootas.map(k => ({ name: k.koota, score: k.score, max: k.maxPoints, detail: k.detail })),
    },
    timing: {
      currentScore: timing.score,
      windows: (timing.metadata?.windows as import('@luckyray/shared').CoupleDashaWindow[]) ?? [],
    },
    computedAt: new Date().toISOString(),
  };
}

export { computeIndividualStrength };
export { computeEmotional, computeRomantic, computeMarriage, computeConflict, computeTiming, computeDoshas };
