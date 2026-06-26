/**
 * Divisional chart (Varga) calculations.
 *
 * Divisional charts provide deeper insight into specific life areas.
 * The birth chart (D1) is the foundation. Additional Vargas refine
 * the analysis for specific domains.
 *
 * Implemented:
 *   D9 (Navamsa) — Marriage, dharma, spiritual strength
 *   D10 (Dashamsa) — Career, professional life
 *
 * Formula:
 *   For D-N chart: multiply the sign longitude by N, then take the result
 *   in 30-degree segments to determine the new sign position.
 *
 *   planet_longitude_in_sign = sidereal_longitude % 30
 *   divisional_degree = (planet_longitude_in_sign / 30) * N * 30
 *   divisional_sign = floor(divisional_degree / 30) % 12 + offset
 *
 *   The offset depends on the sign element for certain Vargas.
 *
 * Reference:
 *   Parasara Hora Shastra, ch. 6 (Shodasa Varga Adhyaya).
 *   C.S. Patel, "Navamsa in Astrology" (2007).
 *
 * Assumption: Using the standard Parashari Navamsa starting signs.
 */

import type { DivisionalChart, DivisionalChartPlanet, PlanetPosition } from '@luckyray/shared';
import { SIGN_IDS } from '@luckyray/shared';
import type { SignId } from '@luckyray/shared';

/**
 * Navamsa starting sign by original sign type.
 * Fire signs (0,4,8): start from Aries (0)
 * Earth signs (1,5,9): start from Capricorn (9)
 * Air signs (2,6,10): start from Libra (6)
 * Water signs (3,7,11): start from Cancer (3)
 */
const NAVAMSA_START: Record<number, number> = {
  0: 0, 4: 0, 8: 0,   // Fire → Aries
  1: 9, 5: 9, 9: 9,   // Earth → Capricorn
  2: 6, 6: 6, 10: 6,  // Air → Libra
  3: 3, 7: 3, 11: 3,  // Water → Cancer
};

/**
 * Calculate the Navamsa (D9) sign for a given sidereal longitude.
 */
function getNavamsaSign(siderealLongitude: number): SignId {
  const signIndex = Math.floor(siderealLongitude / 30);
  const degreeInSign = siderealLongitude % 30;
  const navamsaIndex = Math.floor(degreeInSign / (30 / 9)); // which 1/9 of the sign
  const startSign = NAVAMSA_START[signIndex] ?? 0;
  const navamsaSign = (startSign + navamsaIndex) % 12;
  return SIGN_IDS[navamsaSign]!;
}

/**
 * Calculate the Dashamsa (D10) sign for a given sidereal longitude.
 *
 * Odd signs: start from the same sign
 * Even signs: start from the 9th sign
 */
function getDashamasaSign(siderealLongitude: number): SignId {
  const signIndex = Math.floor(siderealLongitude / 30);
  const degreeInSign = siderealLongitude % 30;
  const dashamasaIndex = Math.floor(degreeInSign / 3); // 0–9

  let startSign: number;
  if (signIndex % 2 === 0) {
    // Odd signs (1,3,5,7,9,11 in 1-based) → start from own sign
    startSign = signIndex;
  } else {
    // Even signs → start from 9th sign
    startSign = (signIndex + 8) % 12;
  }

  const dashamasaSign = (startSign + dashamasaIndex) % 12;
  return SIGN_IDS[dashamasaSign]!;
}

/**
 * Compute D9 Navamsa chart.
 */
export function computeNavamsa(
  planets: PlanetPosition[],
  ascendantSidereal: number,
): DivisionalChart {
  const ascendantSign = getNavamsaSign(ascendantSidereal);
  const ascendantSignIndex = SIGN_IDS.indexOf(ascendantSign);

  const divisionPlanets: DivisionalChartPlanet[] = planets.map(planet => {
    const sign = getNavamsaSign(planet.siderealLongitude);
    const signIndex = SIGN_IDS.indexOf(sign);
    const house = ((signIndex - ascendantSignIndex + 12) % 12) + 1;
    return { id: planet.id, sign, signIndex, house };
  });

  return {
    division: 'D9',
    name: 'Navamsa',
    ascendant: ascendantSign,
    planets: divisionPlanets,
  };
}

/**
 * Compute D10 Dashamsa chart.
 */
export function computeDashamsa(
  planets: PlanetPosition[],
  ascendantSidereal: number,
): DivisionalChart {
  const ascendantSign = getDashamasaSign(ascendantSidereal);
  const ascendantSignIndex = SIGN_IDS.indexOf(ascendantSign);

  const divisionPlanets: DivisionalChartPlanet[] = planets.map(planet => {
    const sign = getDashamasaSign(planet.siderealLongitude);
    const signIndex = SIGN_IDS.indexOf(sign);
    const house = ((signIndex - ascendantSignIndex + 12) % 12) + 1;
    return { id: planet.id, sign, signIndex, house };
  });

  return {
    division: 'D10',
    name: 'Dashamsa',
    ascendant: ascendantSign,
    planets: divisionPlanets,
  };
}
