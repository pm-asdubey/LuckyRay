/**
 * Emotional compatibility dimension — Moon, mind, Ashtakoot.
 */

import type { CanonicalChart, CompatibilityDimension } from '@luckyray/shared';
import { computeGunaMilan, getMoonDataFromLongitude } from '../../guna-milan';
import {
  getPlanet,
  getD9Planet,
  signDistance,
  distanceCategory,
  lordFriendshipStatus,
  dignityScore,
  clampScore,
} from '../helpers';
import { map36to100, scoreFromDistanceCategory } from '../rules';

export function computeEmotional(
  chartA: CanonicalChart,
  chartB: CanonicalChart,
): CompatibilityDimension {
  const moonA = getPlanet(chartA, 'Moon')!;
  const moonB = getPlanet(chartB, 'Moon')!;

  const moonDataA = getMoonDataFromLongitude(moonA.siderealLongitude);
  const moonDataB = getMoonDataFromLongitude(moonB.siderealLongitude);

  const ashtakoot = computeGunaMilan({
    person1Name: chartA.profile.name,
    person1NakshatraIndex: moonDataA.nakshatraIndex,
    person1SignIndex: moonDataA.signIndex,
    person2Name: chartB.profile.name,
    person2NakshatraIndex: moonDataB.nakshatraIndex,
    person2SignIndex: moonDataB.signIndex,
  });

  let score = map36to100(ashtakoot.totalScore);
  const evidence: string[] = [];
  const risks: string[] = [];

  evidence.push(`Ashtakoot Moon score: ${ashtakoot.totalScore}/${ashtakoot.maxScore}`);

  // Moon-Moon sign relationship
  const dist = signDistance(moonA.signIndex, moonB.signIndex);
  const cat = distanceCategory(dist);
  const moonRelScore = scoreFromDistanceCategory(cat);
  score = score * 0.6 + moonRelScore * 0.4;
  evidence.push(`Moon–Moon sign relationship: ${cat} (${moonA.sign} to ${moonB.sign})`);

  if (['shadAshtak', 'square', 'opposition'].includes(cat)) {
    risks.push(`Moon signs are in ${cat} relationship — emotional rhythms may clash`);
  }

  // Sign-lord friendship of Moons
  const lordStatus = lordFriendshipStatus(moonA.signIndex, moonB.signIndex);
  if (lordStatus === 'friend') {
    score += 5;
    evidence.push('Moon sign lords are natural friends');
  } else if (lordStatus === 'enemy') {
    score -= 5;
    risks.push('Moon sign lords are natural enemies');
  }

  // D9 Moon strength
  const d9MoonA = getD9Planet(chartA, 'Moon');
  const d9MoonB = getD9Planet(chartB, 'Moon');
  if (d9MoonA && d9MoonB) {
    const d9Strength = (dignityScore(chartA.planets.find(p => p.id === 'Moon')) +
                        dignityScore(chartB.planets.find(p => p.id === 'Moon'))) / 2;
    const d9Bonus = (d9Strength - 50) / 10; // -4 to +5
    score += d9Bonus;
    evidence.push(`D9 Moon dignity factor: ${d9Bonus > 0 ? '+' : ''}${d9Bonus.toFixed(1)}`);
  }

  if (ashtakoot.hasNadiDosha) {
    risks.push('Nadi Dosha present from Moon nakshatras');
  }
  if (ashtakoot.hasBhakootDosha) {
    risks.push('Bhakoot Dosha present from Moon signs');
  }

  return {
    id: 'emotional',
    name: 'Emotional Compatibility',
    weight: 0.25,
    score: clampScore(score),
    maxScore: 100,
    evidence,
    risks,
  };
}
