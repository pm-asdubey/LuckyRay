/**
 * Dosha & hard-filter dimension.
 */

import type { CanonicalChart, CompatibilityDimension } from '@luckyray/shared';
import { computeGunaMilan, getMoonDataFromLongitude } from '../../guna-milan';
import { getPlanet, clampScore } from '../helpers';

export function computeDoshas(
  chartA: CanonicalChart,
  chartB: CanonicalChart,
): CompatibilityDimension {
  const evidence: string[] = [];
  const risks: string[] = [];
  let score = 80;

  // Manglik cross-check
  const manglikA = chartA.doshas.find(d => d.id === 'manglik');
  const manglikB = chartB.doshas.find(d => d.id === 'manglik');
  const scoreA = (manglikA?.metadata?.manglikScore as { total?: number } | undefined)?.total ?? 0;
  const scoreB = (manglikB?.metadata?.manglikScore as { total?: number } | undefined)?.total ?? 0;

  if (scoreA > 0 && scoreB > 0) {
    const ratio = Math.min(scoreA, scoreB) / Math.max(scoreA, scoreB);
    if (ratio >= 0.6) {
      score += 5;
      evidence.push('Both charts show similar Manglik energy — mutually resonant');
    } else {
      score -= 5;
      risks.push('Manglik energies are lopsided between the two charts');
    }
  } else if ((scoreA > 0 && scoreB === 0) || (scoreA === 0 && scoreB > 0)) {
    score -= 15;
    risks.push('One partner shows Manglik energy while the other does not');
  } else {
    evidence.push('Neither chart shows strong Manglik energy');
  }

  // Ashtakoot doshas
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

  if (ashtakoot.hasNadiDosha) {
    // Nadi cancellation rules
    const sameSign = moonA.signIndex === moonB.signIndex;
    const sameNakshatra = moonA.nakshatraIndex === moonB.nakshatraIndex;
    const cancelled = (sameSign && !sameNakshatra) || (!sameSign && sameNakshatra);
    if (cancelled) {
      evidence.push('Nadi Dosha present but cancelled by standard exception');
    } else {
      score -= 8;
      risks.push('Nadi Dosha present — flagged for health/progeny awareness');
    }
  }

  if (ashtakoot.hasBhakootDosha) {
    score -= 8;
    risks.push('Bhakoot Dosha present — emotional/karmic friction possible');
  }

  const varnaKoota = ashtakoot.kootas.find(k => k.koota === 'Varna');
  if (varnaKoota && varnaKoota.score < 1) {
    score -= 3;
    risks.push(`Varna mismatch: ${varnaKoota.detail}`);
  }

  // Other doshas
  const otherDoshaIds = ['kala-sarpa', 'pitru'];
  for (const id of otherDoshaIds) {
    const dA = chartA.doshas.find(d => d.id === id);
    const dB = chartB.doshas.find(d => d.id === id);
    if (dA?.detected && dB?.detected) {
      score -= 5;
      risks.push(`Both charts show ${dA.name} — intensity may amplify`);
    } else if (dA?.detected || dB?.detected) {
      evidence.push(`${dA?.name ?? dB?.name} present in one chart only`);
    }
  }

  return {
    id: 'doshas',
    name: 'Doshas & Hard Filters',
    weight: 0.10,
    score: clampScore(score),
    maxScore: 100,
    evidence,
    risks,
  };
}
