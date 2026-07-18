/**
 * Temperament & conflict dimension — Gana, Mars, Mercury, malefic aspects.
 */

import type { CanonicalChart, CompatibilityDimension } from '@luckyray/shared';
import { GANA } from '../../guna-milan';
import {
  getPlanet,
  signDistance,
  distanceCategory,
  dignityScore,
  planetAspectsOnTarget,
  clampScore,
} from '../helpers';

export function computeConflict(
  chartA: CanonicalChart,
  chartB: CanonicalChart,
): CompatibilityDimension {
  const moonA = getPlanet(chartA, 'Moon')!;
  const moonB = getPlanet(chartB, 'Moon')!;
  const marsA = getPlanet(chartA, 'Mars')!;
  const marsB = getPlanet(chartB, 'Mars')!;
  const mercuryA = getPlanet(chartA, 'Mercury')!;
  const mercuryB = getPlanet(chartB, 'Mercury')!;
  const venusA = getPlanet(chartA, 'Venus')!;
  const venusB = getPlanet(chartB, 'Venus')!;

  const evidence: string[] = [];
  const risks: string[] = [];

  let score = 70;

  // Gana match
  const ganaA = GANA[moonA.nakshatraIndex];
  const ganaB = GANA[moonB.nakshatraIndex];
  evidence.push(`Gana: ${ganaA} & ${ganaB}`);
  if (ganaA === ganaB) {
    score += 10;
    evidence.push('Same Gana — harmonious temperament');
  } else if (
    (ganaA === 'Deva' && ganaB === 'Manushya') ||
    (ganaA === 'Manushya' && ganaB === 'Deva')
  ) {
    score += 5;
  } else if (
    (ganaA === 'Deva' && ganaB === 'Rakshasa') ||
    (ganaA === 'Rakshasa' && ganaB === 'Deva')
  ) {
    score -= 10;
    risks.push('Deva–Rakshasa Gana mismatch — very different instinctive responses');
  } else {
    score -= 15;
    risks.push('Manushya–Rakshasa Gana mismatch — friction in daily temperament');
  }

  // Mars dignity / placement relative to partner Moon/Venus
  const marsAvgDignity = (dignityScore(marsA) + dignityScore(marsB)) / 2;
  score += (marsAvgDignity - 50) / 10;

  const marsDist = signDistance(marsA.signIndex, marsB.signIndex);
  const marsCat = distanceCategory(marsDist);
  if (marsCat === 'shadAshtak' || marsCat === 'square' || marsCat === 'opposition') {
    score -= 10;
    risks.push('Mars–Mars tension increases conflict escalation risk');
  }

  // Mercury–Mercury communication
  const mercDist = signDistance(mercuryA.signIndex, mercuryB.signIndex);
  const mercCat = distanceCategory(mercDist);
  if (mercCat === 'trine' || mercCat === 'sextil') {
    score += 5;
    evidence.push('Mercury signs are compatible — easy communication');
  } else if (mercCat === 'shadAshtak' || mercCat === 'square') {
    score -= 5;
    risks.push('Mercury signs are in tense relationship — misunderstanding possible');
  }

  // Malefic aspects on partner Moon/Venus/7th lord
  const malefics: import('@luckyray/shared').PlanetId[] = ['Saturn', 'Mars', 'Rahu', 'Ketu'];
  for (const [chart, target, name, partnerName] of [
    [chartA, moonB.id, chartA.profile.name, chartB.profile.name],
    [chartA, venusB.id, chartA.profile.name, chartB.profile.name],
    [chartB, moonA.id, chartB.profile.name, chartA.profile.name],
    [chartB, venusA.id, chartB.profile.name, chartA.profile.name],
  ] as [CanonicalChart, import('@luckyray/shared').PlanetId, string, string][]) {
    const aspects = planetAspectsOnTarget(chart, target, malefics);
    if (aspects.length > 0) {
      score -= 4;
      risks.push(`${name}'s ${aspects.map(a => a.sourcePlanet).join('/')} afflicts ${partnerName}'s ${target}`);
    }
  }

  return {
    id: 'conflict',
    name: 'Temperament & Conflict',
    weight: 0.10,
    score: clampScore(score),
    maxScore: 100,
    evidence,
    risks,
  };
}
