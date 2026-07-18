/**
 * Marriage structure dimension — 7th house, 7th lord, Navamsa.
 */

import type { CanonicalChart, CompatibilityDimension } from '@luckyray/shared';
import { SIGN_IDS } from '@luckyray/shared';
import {
  getPlanet,
  signDistance,
  distanceCategory,
  lordFriendshipStatus,
  sameElement,
  planetAspectsOnHouse,
  planetAspectsOnTarget,
  clampScore,
} from '../helpers';
import { scoreFromDistanceCategory } from '../rules';

function signIndexFromId(sign: string): number {
  return SIGN_IDS.indexOf(sign as (typeof SIGN_IDS)[number]);
}

export function computeMarriage(
  chartA: CanonicalChart,
  chartB: CanonicalChart,
): CompatibilityDimension {
  const house7A = chartA.houses[6]!;
  const house7B = chartB.houses[6]!;
  const lord7A = getPlanet(chartA, house7A.lord);
  const lord7B = getPlanet(chartB, house7B.lord);

  const evidence: string[] = [];
  const risks: string[] = [];

  evidence.push(
    `${chartA.profile.name}'s 7th house: ${house7A.sign} (lord ${house7A.lord} in ${lord7A?.sign ?? '?'})`,
    `${chartB.profile.name}'s 7th house: ${house7B.sign} (lord ${house7B.lord} in ${lord7B?.sign ?? '?'})`,
  );

  let score = 70;

  if (lord7A && lord7B) {
    const dist = signDistance(lord7A.signIndex, lord7B.signIndex);
    const cat = distanceCategory(dist);
    score = scoreFromDistanceCategory(cat);
    evidence.push(`7th lords ${lord7A.id} & ${lord7B.id} are in ${cat} relationship`);

    if (sameElement(lord7A.signIndex, lord7B.signIndex)) {
      score += 5;
      evidence.push('7th lords share the same element');
    }

    const lordStatus = lordFriendshipStatus(lord7A.signIndex, lord7B.signIndex);
    if (lordStatus === 'friend') {
      score += 8;
      evidence.push('7th lords are natural friends');
    } else if (lordStatus === 'enemy') {
      score -= 8;
      risks.push('7th lords are natural enemies');
    }

    // Saturn aspect on 7th house / lord adds stability but possible delay
    const saturnHouseAspectA = planetAspectsOnHouse(chartA, house7A.number, ['Saturn']);
    const saturnLordAspectA = planetAspectsOnTarget(chartA, lord7A.id, ['Saturn']);
    if (saturnHouseAspectA.length || saturnLordAspectA.length) {
      score -= 3;
      risks.push(`${chartA.profile.name}'s 7th house/lord receives Saturn aspect — stability with possible delay`);
    }

    const saturnHouseAspectB = planetAspectsOnHouse(chartB, house7B.number, ['Saturn']);
    const saturnLordAspectB = planetAspectsOnTarget(chartB, lord7B.id, ['Saturn']);
    if (saturnHouseAspectB.length || saturnLordAspectB.length) {
      score -= 3;
      risks.push(`${chartB.profile.name}'s 7th house/lord receives Saturn aspect — stability with possible delay`);
    }
  }

  // D9 ascendant compatibility
  const d9AscIdxA = signIndexFromId(chartA.divisionalCharts.D9.ascendant);
  const d9AscIdxB = signIndexFromId(chartB.divisionalCharts.D9.ascendant);
  const d9Dist = signDistance(d9AscIdxA, d9AscIdxB);
  const d9Cat = distanceCategory(d9Dist);
  const d9Score = scoreFromDistanceCategory(d9Cat);
  score = score * 0.7 + d9Score * 0.3;
  evidence.push(`D9 ascendants: ${chartA.divisionalCharts.D9.ascendant} & ${chartB.divisionalCharts.D9.ascendant} (${d9Cat})`);

  return {
    id: 'marriage',
    name: 'Marriage Structure',
    weight: 0.20,
    score: clampScore(score),
    maxScore: 100,
    evidence,
    risks,
  };
}
