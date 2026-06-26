/**
 * House calculations for Jyotish (Whole Sign system).
 *
 * Decision (ADR-012): Whole Sign House System
 *
 * We implement the Whole Sign house system, which is the default in
 * Parashari Jyotish. In this system:
 *   - The sign containing the Ascendant becomes House 1
 *   - Each subsequent sign sequentially becomes the next house
 *   - Every sign exactly equals one house (30°)
 *
 * This differs from Western astrology's Placidus/Koch systems.
 *
 * Reference: Hart deFouw & Robert Svoboda, "Light on Life" (1996), ch. 3.
 */

import type { HouseData, PlanetPosition } from '@luckyray/shared';
import { SIGN_LORDS, SIGN_IDS, HOUSE_THEMES } from '@luckyray/shared';
import type { SignId } from '@luckyray/shared';

/**
 * Build house data for all 12 houses using the Whole Sign system.
 *
 * @param ascendantSignIndex  Sign index (0–11) of the Ascendant
 * @param planets             Already-computed planet positions
 */
export function buildHouses(
  ascendantSignIndex: number,
  planets: PlanetPosition[],
): HouseData[] {
  const houses: HouseData[] = [];

  for (let houseNum = 1; houseNum <= 12; houseNum++) {
    const signIndex = (ascendantSignIndex + houseNum - 1) % 12;
    const sign: SignId = SIGN_IDS[signIndex]!;
    const lord = SIGN_LORDS[signIndex]!;
    const occupants = planets
      .filter(p => p.signIndex === signIndex)
      .map(p => p.id);

    const themes = HOUSE_THEMES[houseNum] ?? [];
    const cuspDegree = signIndex * 30;

    houses.push({
      number: houseNum,
      sign,
      signIndex,
      lord,
      occupants,
      themes,
      cuspDegree,
    });
  }

  return houses;
}

/**
 * Map sign index to house number given the Ascendant sign index.
 */
export function signIndexToHouse(signIndex: number, ascendantSignIndex: number): number {
  return ((signIndex - ascendantSignIndex + 12) % 12) + 1;
}

/**
 * Get all houses a planet aspects (7th aspect + special aspects).
 *
 * Parashari aspects:
 *   All planets: 7th house from their position (opposition)
 *   Mars: additionally 4th and 8th
 *   Jupiter: additionally 5th and 9th
 *   Saturn: additionally 3rd and 10th
 *   Rahu/Ketu: various traditions differ; we follow the Parashari view
 *     of 5th and 9th aspect for Rahu, same for Ketu.
 *
 * Reference: Parasara Hora Shastra, ch. on Drishti; B.V. Raman, "Graha
 * and Bhava Balas" (1992).
 */
export function getAspectedHouses(
  planetHouse: number,
  planetId: string,
): Array<{ house: number; strength: 'Full' | 'ThreeQuarter' | 'Half' | 'Quarter'; isSpecial: boolean }> {
  const aspects: Array<{ house: number; strength: 'Full' | 'ThreeQuarter' | 'Half' | 'Quarter'; isSpecial: boolean }> = [];

  // Universal 7th aspect (full strength)
  const seventh = ((planetHouse - 1 + 6) % 12) + 1;
  aspects.push({ house: seventh, strength: 'Full', isSpecial: false });

  // Special aspects
  switch (planetId) {
    case 'Mars': {
      const fourth = ((planetHouse - 1 + 3) % 12) + 1;
      const eighth = ((planetHouse - 1 + 7) % 12) + 1;
      aspects.push({ house: fourth, strength: 'Full', isSpecial: true });
      aspects.push({ house: eighth, strength: 'Full', isSpecial: true });
      break;
    }
    case 'Jupiter': {
      const fifth = ((planetHouse - 1 + 4) % 12) + 1;
      const ninth = ((planetHouse - 1 + 8) % 12) + 1;
      aspects.push({ house: fifth, strength: 'Full', isSpecial: true });
      aspects.push({ house: ninth, strength: 'Full', isSpecial: true });
      break;
    }
    case 'Saturn': {
      const third = ((planetHouse - 1 + 2) % 12) + 1;
      const tenth = ((planetHouse - 1 + 9) % 12) + 1;
      aspects.push({ house: third, strength: 'Full', isSpecial: true });
      aspects.push({ house: tenth, strength: 'Full', isSpecial: true });
      break;
    }
    case 'Rahu':
    case 'Ketu': {
      // Parashari view: 5th and 9th aspects
      const fifth = ((planetHouse - 1 + 4) % 12) + 1;
      const ninth = ((planetHouse - 1 + 8) % 12) + 1;
      aspects.push({ house: fifth, strength: 'Full', isSpecial: true });
      aspects.push({ house: ninth, strength: 'Full', isSpecial: true });
      break;
    }
  }

  return aspects;
}
