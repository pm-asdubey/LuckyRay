/**
 * KP Event Predictor.
 *
 * Determines whether an event is "promised" in a chart and finds the
 * dasha periods most likely to trigger it.
 *
 * KP Promise Rule:
 *   An event is promised if the sub lord of the relevant cusp signifies the
 *   relevant houses. A sub lord is a "positive significator" if it signifies
 *   at least 2 of the relevant houses (or 1 if it's the primary house's cusp lord).
 *
 * KP Period Rule (Double Coincidence minimum):
 *   Event manifests when both Mahadasha and Antardasha lords are significators
 *   of the relevant houses.
 *
 * Reference: K.S. Krishnamurti, "Krishnamurti Padhdhati", Vols. 1-4
 */

import type { PlanetId, KPEventAnalysis, KPTopicId, KPPredictedPeriod, KPHouseSignificators } from '@luckyray/shared';
import type { DashaData } from '@luckyray/shared';
import { buildPlanetSignificationMap } from './significators';

// ─── Topic Configuration ─────────────────────────────────────────────────

interface TopicConfig {
  relevantHouses: number[];
  primaryHouse: number;
  minimumHits: number; // minimum relevant houses sub lord must signify
}

const TOPIC_CONFIG: Record<KPTopicId, TopicConfig> = {
  career:   { relevantHouses: [2, 6, 10, 11], primaryHouse: 10, minimumHits: 2 },
  marriage: { relevantHouses: [2, 7, 11],     primaryHouse: 7,  minimumHits: 2 },
  wealth:   { relevantHouses: [2, 6, 10, 11], primaryHouse: 11, minimumHits: 2 },
  health:   { relevantHouses: [1, 6, 8, 12],  primaryHouse: 1,  minimumHits: 2 },
  children: { relevantHouses: [2, 5, 11],     primaryHouse: 5,  minimumHits: 2 },
  foreign:  { relevantHouses: [3, 9, 12],     primaryHouse: 9,  minimumHits: 2 },
};

// ─── Promise Detection ────────────────────────────────────────────────────

function detectPromise(
  sublordOfPrimaryHouse: PlanetId,
  relevantHouses: number[],
  planetSignificationMap: Map<PlanetId, number[]>,
  minimumHits: number,
): { isPromised: boolean; signifies: number[]; reason: string } {
  const signifies = planetSignificationMap.get(sublordOfPrimaryHouse) ?? [];
  const hitsInRelevant = signifies.filter(h => relevantHouses.includes(h));

  if (hitsInRelevant.length >= minimumHits) {
    return {
      isPromised: true,
      signifies,
      reason: `Sub lord ${sublordOfPrimaryHouse} signifies ${hitsInRelevant.join(', ')} — ${hitsInRelevant.length}/${relevantHouses.length} relevant houses`,
    };
  }

  // Partial promise: sub lord signifies at least 1 relevant house
  if (hitsInRelevant.length === 1) {
    return {
      isPromised: false,
      signifies,
      reason: `Sub lord ${sublordOfPrimaryHouse} weakly signifies only H${hitsInRelevant[0]} — insufficient for full promise (needs ${minimumHits} of ${relevantHouses.join(',')})`,
    };
  }

  // Denial: sub lord signifies opposing/denying houses
  // Houses 8, 12 deny marriage (for 7th house topic); etc.
  return {
    isPromised: false,
    signifies,
    reason: `Sub lord ${sublordOfPrimaryHouse} does not signify the required houses (${relevantHouses.join(', ')}) — event not clearly promised`,
  };
}

// ─── Period Finder ────────────────────────────────────────────────────────

function rateConfidence(
  mahaSignifies: number[],
  antarSignifies: number[],
  relevantHouses: number[],
): 'high' | 'medium' | 'low' {
  const mahaHits = mahaSignifies.filter(h => relevantHouses.includes(h)).length;
  const antarHits = antarSignifies.filter(h => relevantHouses.includes(h)).length;
  const totalRequired = relevantHouses.length;

  if (mahaHits >= 2 && antarHits >= 2) return 'high';
  if (mahaHits >= 1 && antarHits >= 2) return 'medium';
  if (mahaHits >= 2 && antarHits >= 1) return 'medium';
  return 'low';
}

function findFavorablePeriods(
  significators: PlanetId[],
  planetSignificationMap: Map<PlanetId, number[]>,
  dashaData: DashaData,
  relevantHouses: number[],
  topicLabel: string,
  maxPeriods: number = 4,
): KPPredictedPeriod[] {
  const now = new Date();
  const periods: KPPredictedPeriod[] = [];

  for (const maha of dashaData.allPeriods) {
    const mahaEnd = new Date(maha.endDate);
    if (mahaEnd <= now) continue;
    if (periods.length >= maxPeriods) break;

    const mahaIsSig = significators.includes(maha.planet);
    const mahaSignifies = planetSignificationMap.get(maha.planet) ?? [];

    if (!mahaIsSig) continue;

    // Check antardasha periods
    for (const antar of maha.antardasha ?? []) {
      const antarEnd = new Date(antar.endDate);
      const antarStart = new Date(antar.startDate);
      if (antarEnd <= now) continue;

      const antarIsSig = significators.includes(antar.planet);
      if (!antarIsSig) continue;

      const antarSignifies = planetSignificationMap.get(antar.planet) ?? [];
      const confidence = rateConfidence(mahaSignifies, antarSignifies, relevantHouses);

      const period: KPPredictedPeriod = {
        mahadasha: maha.planet,
        antardasha: antar.planet,
        startDate: antarStart.toISOString().slice(0, 10),
        endDate: antarEnd.toISOString().slice(0, 10),
        confidence,
        reason: `${maha.planet} MD (H${mahaSignifies.filter(h => relevantHouses.includes(h)).join(',')}) + ${antar.planet} AD (H${antarSignifies.filter(h => relevantHouses.includes(h)).join(',')}) — double coincidence for ${topicLabel}`,
      };
      periods.push(period);

      if (periods.length >= maxPeriods) break;
    }
  }

  // Sort by confidence: high > medium > low
  const order = { high: 0, medium: 1, low: 2 };
  return periods.sort((a, b) => order[a.confidence] - order[b.confidence]);
}

// ─── Public API ───────────────────────────────────────────────────────────

export function analyzeKPEvent(
  topic: KPTopicId,
  cuspSubLords: PlanetId[],  // index 0 = cusp 1 sub lord, ..., index 11 = cusp 12
  significators: KPHouseSignificators[],
  dashaData: DashaData,
): KPEventAnalysis {
  const config = TOPIC_CONFIG[topic];
  const planetSigMap = buildPlanetSignificationMap(significators);

  const primaryCuspSubLord = cuspSubLords[config.primaryHouse - 1]!;
  const { isPromised, signifies, reason } = detectPromise(
    primaryCuspSubLord,
    config.relevantHouses,
    planetSigMap,
    config.minimumHits,
  );

  // Collect significators: planets that signify at least 2 relevant houses
  const topicSignificators: PlanetId[] = [];
  planetSigMap.forEach((houses, planet) => {
    const hitsInRelevant = houses.filter(h => config.relevantHouses.includes(h));
    if (hitsInRelevant.length >= 1) topicSignificators.push(planet);
  });

  // Only predict periods if event is promised
  const predictedPeriods = isPromised
    ? findFavorablePeriods(topicSignificators, planetSigMap, dashaData, config.relevantHouses, topic)
    : [];

  return {
    topic,
    relevantHouses: config.relevantHouses,
    primaryHouse: config.primaryHouse,
    primaryCuspSubLord,
    sublordSignifies: signifies,
    isPromised,
    promiseReason: reason,
    significators: topicSignificators,
    predictedPeriods,
  };
}
