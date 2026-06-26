/**
 * Aspect (Drishti) calculations for Jyotish.
 *
 * In Jyotish, aspects are counted by house position, not by degree.
 * All planets aspect the 7th house from their position (full aspect).
 * Mars, Jupiter, and Saturn have additional special aspects.
 *
 * For Rahu and Ketu: The Parashari tradition attributes 5th and 9th
 * aspects. Some schools disagree — this is documented as an assumption.
 *
 * Reference: BPHS ch. 26 (Drishti Adhyaya).
 */

import type { AspectData, PlanetPosition, HouseData, PlanetId } from '@luckyray/shared';
import { getAspectedHouses } from './houses';

/**
 * Compute all aspects in the chart.
 */
export function computeAspects(
  planets: PlanetPosition[],
  houses: HouseData[],
): AspectData[] {
  const aspects: AspectData[] = [];

  for (const planet of planets) {
    const aspectedHouseEntries = getAspectedHouses(planet.house, planet.id);

    for (const entry of aspectedHouseEntries) {
      const targetHouse = houses.find(h => h.number === entry.house);
      if (!targetHouse) continue;

      const targetPlanets = planets
        .filter(p => p.house === entry.house && p.id !== planet.id)
        .map(p => p.id);

      aspects.push({
        sourcePlanet: planet.id,
        targetHouse: entry.house,
        targetPlanets,
        aspectType: ((entry.house - planet.house + 12) % 12) + 1,
        strength: entry.strength,
        isSpecial: entry.isSpecial,
        notes: entry.isSpecial
          ? `Special ${planet.id} aspect — full strength`
          : `Standard 7th-house aspect`,
      });
    }
  }

  return aspects;
}

/**
 * Compute conjunctions between planets.
 */
export function computeConjunctions(planets: PlanetPosition[]): Array<{
  planets: PlanetId[];
  house: number;
  sign: import('@luckyray/shared').SignId;
  orbDegrees: number;
}> {
  const conjunctions: Array<{
    planets: PlanetId[];
    house: number;
    sign: import('@luckyray/shared').SignId;
    orbDegrees: number;
  }> = [];

  // Group planets by sign
  const bySign = new Map<number, PlanetPosition[]>();
  for (const planet of planets) {
    const existing = bySign.get(planet.signIndex) ?? [];
    existing.push(planet);
    bySign.set(planet.signIndex, existing);
  }

  for (const [signIndex, group] of bySign.entries()) {
    if (group.length < 2) continue;

    const planetIds = group.map(p => p.id);
    const house = group[0]!.house;
    const sign = group[0]!.sign;

    // Calculate closest orb between any two planets in the group
    let minOrb = 30;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        let diff = Math.abs((group[i]?.siderealLongitude ?? 0) - (group[j]?.siderealLongitude ?? 0));
        if (diff > 180) diff = 360 - diff;
        if (diff < minOrb) minOrb = diff;
      }
    }

    conjunctions.push({
      planets: planetIds,
      house,
      sign,
      orbDegrees: Math.round(minOrb * 100) / 100,
    });
  }

  return conjunctions;
}
