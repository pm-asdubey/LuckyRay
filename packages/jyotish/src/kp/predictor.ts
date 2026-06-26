/**
 * KP Event Predictor.
 *
 * Promise Rule (KS Krishnamurti):
 *   The sub lord of the primary cusp for the topic must signify the relevant
 *   houses. Signification through Level 1 or 2 (occupancy / star of occupant)
 *   is a STRONG promise; through Level 3 or 4 (sign lord / star of sign lord)
 *   is a MODERATE promise. Fewer than minimumHits relevant houses = not promised.
 *
 * Period Rule (Double Coincidence minimum):
 *   Both Maha and Antar dasha lords must be significators of the relevant houses.
 *   Confidence is higher when both signify through Level 1/2.
 */

import type { PlanetId, KPEventAnalysis, KPTopicId, KPPredictedPeriod, KPHouseSignificators } from '@luckyray/shared';
import type { DashaData } from '@luckyray/shared';
import { buildPlanetSignificationDetail } from './significators';

// ─── Topic Configuration ─────────────────────────────────────────────────────

interface TopicConfig {
  relevantHouses: number[];
  primaryHouse: number;
  minimumHits: number;  // sub-lord must signify this many relevant houses
}

const TOPIC_CONFIG: Record<KPTopicId, TopicConfig> = {
  career:   { relevantHouses: [2, 6, 10, 11], primaryHouse: 10, minimumHits: 2 },
  marriage: { relevantHouses: [2, 7, 11],     primaryHouse: 7,  minimumHits: 2 },
  wealth:   { relevantHouses: [2, 6, 10, 11], primaryHouse: 11, minimumHits: 2 },
  health:   { relevantHouses: [1, 6, 8, 12],  primaryHouse: 1,  minimumHits: 2 },
  children: { relevantHouses: [2, 5, 11],     primaryHouse: 5,  minimumHits: 2 },
  foreign:  { relevantHouses: [3, 9, 12],     primaryHouse: 9,  minimumHits: 2 },
};

// ─── Promise Detection ────────────────────────────────────────────────────────

interface PromiseResult {
  isPromised: boolean;
  promiseStrength: 'strong' | 'moderate' | 'weak';
  sublordSignifies: number[];
  sublordSignifiesWithLevel: { house: number; level: 1 | 2 | 3 | 4 }[];
  reason: string;
}

function detectPromise(
  subLord: PlanetId,
  relevantHouses: number[],
  planetDetail: Map<PlanetId, { house: number; level: 1 | 2 | 3 | 4 }[]>,
  minimumHits: number,
): PromiseResult {
  const detail = planetDetail.get(subLord) ?? [];
  const allHousesSignified = [...new Set(detail.map(d => d.house))];

  const relevantDetail = detail.filter(d => relevantHouses.includes(d.house));
  const uniqueRelevantHouses = [...new Set(relevantDetail.map(d => d.house))];

  // Level 1+2 are "strong" signification (direct occupancy chain)
  const strongDetail = relevantDetail.filter(d => d.level <= 2);
  const uniqueStrongHouses = [...new Set(strongDetail.map(d => d.house))];

  const houseStr = (houses: number[]) => houses.map(h => `H${h}`).join(', ');
  const levelStr = (d: { house: number; level: number }[]) =>
    d.map(x => `H${x.house}(L${x.level})`).join(', ');

  if (uniqueStrongHouses.length >= minimumHits) {
    return {
      isPromised: true,
      promiseStrength: 'strong',
      sublordSignifies: allHousesSignified,
      sublordSignifiesWithLevel: detail,
      reason: `${subLord} signifies ${levelStr(strongDetail)} via Level 1/2 (occupancy chain) — strong promise for ${houseStr(uniqueStrongHouses)}`,
    };
  }

  if (uniqueRelevantHouses.length >= minimumHits) {
    return {
      isPromised: true,
      promiseStrength: 'moderate',
      sublordSignifies: allHousesSignified,
      sublordSignifiesWithLevel: detail,
      reason: `${subLord} signifies ${levelStr(relevantDetail)} via Level 3/4 (sign lord chain) — moderate promise for ${houseStr(uniqueRelevantHouses)}`,
    };
  }

  if (uniqueRelevantHouses.length === 1) {
    return {
      isPromised: false,
      promiseStrength: 'weak',
      sublordSignifies: allHousesSignified,
      sublordSignifiesWithLevel: detail,
      reason: `${subLord} only signifies ${levelStr(relevantDetail)} — needs ${minimumHits} of ${houseStr(relevantHouses)} for a promise`,
    };
  }

  return {
    isPromised: false,
    promiseStrength: 'weak',
    sublordSignifies: allHousesSignified,
    sublordSignifiesWithLevel: detail,
    reason: `${subLord} does not signify the required houses (${houseStr(relevantHouses)}) — event not promised in this chart`,
  };
}

// ─── Confidence Rating ────────────────────────────────────────────────────────

function rateConfidence(
  mahaStrongHits: number,
  antarStrongHits: number,
  mahaTotalHits: number,
  antarTotalHits: number,
): 'high' | 'medium' | 'low' {
  if (mahaStrongHits >= 2 && antarStrongHits >= 2) return 'high';
  if (mahaStrongHits >= 1 && antarTotalHits >= 2) return 'medium';
  if (mahaTotalHits >= 2 && antarTotalHits >= 2) return 'medium';
  return 'low';
}

// ─── Period Finder ────────────────────────────────────────────────────────────

function findFavorablePeriods(
  topicSignificators: PlanetId[],
  planetDetail: Map<PlanetId, { house: number; level: 1 | 2 | 3 | 4 }[]>,
  dashaData: DashaData,
  relevantHouses: number[],
  topicLabel: string,
  maxPeriods: number = 5,
): KPPredictedPeriod[] {
  const now = new Date();
  const periods: KPPredictedPeriod[] = [];

  for (const maha of dashaData.allPeriods) {
    if (new Date(maha.endDate) <= now) continue;
    if (periods.length >= maxPeriods) break;
    if (!topicSignificators.includes(maha.planet)) continue;

    const mahaDetail = planetDetail.get(maha.planet) ?? [];
    const mahaRelevant = mahaDetail.filter(d => relevantHouses.includes(d.house));
    const mahaStrong = mahaRelevant.filter(d => d.level <= 2);

    for (const antar of maha.antardasha ?? []) {
      if (new Date(antar.endDate) <= now) continue;
      if (!topicSignificators.includes(antar.planet)) continue;

      const antarDetail = planetDetail.get(antar.planet) ?? [];
      const antarRelevant = antarDetail.filter(d => relevantHouses.includes(d.house));
      const antarStrong = antarRelevant.filter(d => d.level <= 2);

      const confidence = rateConfidence(
        [...new Set(mahaStrong.map(d => d.house))].length,
        [...new Set(antarStrong.map(d => d.house))].length,
        [...new Set(mahaRelevant.map(d => d.house))].length,
        [...new Set(antarRelevant.map(d => d.house))].length,
      );

      const fmtHouses = (d: { house: number; level: number }[]) =>
        d.length ? d.map(x => `H${x.house}(L${x.level})`).join(', ') : 'none';

      periods.push({
        mahadasha: maha.planet,
        antardasha: antar.planet,
        startDate: new Date(antar.startDate).toISOString().slice(0, 10),
        endDate: new Date(antar.endDate).toISOString().slice(0, 10),
        confidence,
        reason: `${maha.planet} MD [${fmtHouses(mahaRelevant)}] + ${antar.planet} AD [${fmtHouses(antarRelevant)}] — double coincidence (${topicLabel})`,
      });

      if (periods.length >= maxPeriods) break;
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  return periods.sort((a, b) => order[a.confidence] - order[b.confidence]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeKPEvent(
  topic: KPTopicId,
  cuspSubLords: PlanetId[],
  significators: KPHouseSignificators[],
  dashaData: DashaData,
): KPEventAnalysis {
  const config = TOPIC_CONFIG[topic];
  const planetDetail = buildPlanetSignificationDetail(significators);

  const primaryCuspSubLord = cuspSubLords[config.primaryHouse - 1]!;
  const promise = detectPromise(primaryCuspSubLord, config.relevantHouses, planetDetail, config.minimumHits);

  // All planets that signify ≥1 relevant house at any level
  const topicSignificators: PlanetId[] = [];
  planetDetail.forEach((detail, planet) => {
    if (detail.some(d => config.relevantHouses.includes(d.house))) {
      topicSignificators.push(planet);
    }
  });

  const predictedPeriods = promise.isPromised
    ? findFavorablePeriods(topicSignificators, planetDetail, dashaData, config.relevantHouses, topic)
    : [];

  return {
    topic,
    relevantHouses: config.relevantHouses,
    primaryHouse: config.primaryHouse,
    primaryCuspSubLord,
    sublordSignifies: promise.sublordSignifies,
    sublordSignifiesWithLevel: promise.sublordSignifiesWithLevel,
    isPromised: promise.isPromised,
    promiseStrength: promise.promiseStrength,
    promiseReason: promise.reason,
    significators: topicSignificators,
    predictedPeriods,
  };
}
