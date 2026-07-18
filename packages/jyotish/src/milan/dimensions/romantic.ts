/**
 * Romantic & sexual chemistry — Venus & Mars.
 */

import type { CanonicalChart, CompatibilityDimension, PlanetPosition } from '@luckyray/shared';
import {
  getPlanet,
  signDistance,
  distanceCategory,
  lordFriendshipStatus,
  dignityScore,
  sameElement,
  planetAspectsOnTarget,
  clampScore,
} from '../helpers';
import { scoreFromDistanceCategory } from '../rules';

function venusVenusScore(venusA: PlanetPosition, venusB: PlanetPosition): number {
  const dist = signDistance(venusA.signIndex, venusB.signIndex);
  const cat = distanceCategory(dist);
  let score = scoreFromDistanceCategory(cat);

  if (cat === 'same') score = 70;

  if (sameElement(venusA.signIndex, venusB.signIndex)) {
    score += 5;
  }

  const lordStatus = lordFriendshipStatus(venusA.signIndex, venusB.signIndex);
  if (lordStatus === 'friend') score += 10;
  else if (lordStatus === 'enemy') score -= 10;

  const avgDignity = (dignityScore(venusA) + dignityScore(venusB)) / 2;
  score += (avgDignity - 50) / 5; // -8 to +10

  return clampScore(score);
}

export function computeRomantic(
  chartA: CanonicalChart,
  chartB: CanonicalChart,
): CompatibilityDimension {
  const venusA = getPlanet(chartA, 'Venus')!;
  const venusB = getPlanet(chartB, 'Venus')!;
  const marsA = getPlanet(chartA, 'Mars')!;
  const marsB = getPlanet(chartB, 'Mars')!;

  const evidence: string[] = [];
  const risks: string[] = [];

  // Venus–Venus base
  let score = venusVenusScore(venusA, venusB);
  evidence.push(`Venus–Venus (${venusA.sign} vs ${venusB.sign}): base ${score.toFixed(0)}/100`);

  // Saturn / Rahu aspect on Venus penalty
  for (const [p, venus, label] of [
    [chartA, venusA, chartA.profile.name],
    [chartB, venusB, chartB.profile.name],
  ] as [CanonicalChart, PlanetPosition, string][]) {
    const afflictions = planetAspectsOnTarget(p, venus.id, ['Saturn', 'Rahu', 'Ketu']);
    if (afflictions.length > 0) {
      score -= 10;
      risks.push(`${label}'s Venus is aspected by ${afflictions.map(a => a.sourcePlanet).join('/')}`);
    }
  }

  // Mars–Venus cross-aspects
  const aMarsAspectsBVenus = planetAspectsOnTarget(chartA, venusB.id, ['Mars']);
  const bMarsAspectsAVenus = planetAspectsOnTarget(chartB, venusA.id, ['Mars']);
  if (aMarsAspectsBVenus.length || bMarsAspectsAVenus.length) {
    score += 8;
    evidence.push('Mars–Venus cross-aspect indicates strong chemistry');
  }

  // Mars–Mars relationship
  const marsDist = signDistance(marsA.signIndex, marsB.signIndex);
  const marsCat = distanceCategory(marsDist);
  if (marsCat === 'shadAshtak' || marsCat === 'square' || marsCat === 'opposition') {
    score -= 10;
    risks.push(`Mars–Mars ${marsCat} relationship can create power struggles`);
  } else if (marsCat === 'trine' || marsCat === 'sextil') {
    score += 5;
    evidence.push('Mars–Mars in harmony supports shared drive');
  }

  return {
    id: 'romantic',
    name: 'Romantic & Sexual Chemistry',
    weight: 0.15,
    score: clampScore(score),
    maxScore: 100,
    evidence,
    risks,
  };
}
