/**
 * Gochar (Transit) Calculations
 *
 * Computes current planetary positions (transits) relative to the natal chart.
 * Gochar analysis is essential for timing predictions — it shows where the
 * planets are RIGHT NOW compared to the natal ascendant and houses.
 *
 * Key transits watched in Jyotish:
 * - Saturn's Sade Sati (transit through 12th, 1st, 2nd from natal Moon)
 * - Jupiter's annual transit (significant house change)
 * - Rahu-Ketu axis shift every ~18 months
 * - Mars transit (18 months in retrograde cycles)
 *
 * Reference:
 *   B.V. Raman, "Graha and Bhava Balas" (transit chapter)
 *   Parasara Hora Shastra, Gochar Phala Adhyaya
 */

import { computeAllPlanetPositions, computeLahiriAyanamsa, dateToJulianDay } from '@luckyray/astronomy';
import type { GocharData, GocharPlanet, PlanetId } from '@luckyray/shared';
import { SIGN_IDS, NAKSHATRA_NAMES, NAKSHATRA_DEGREES } from '@luckyray/shared';

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Compute current Gochar (transit) positions for all 9 grahas.
 *
 * @param natalAscendantSignIndex  Natal ascendant sign index (0=Aries…11=Pisces)
 * @returns GocharData with current positions and natal house assignments
 */
export function computeCurrentGochar(natalAscendantSignIndex: number, date?: Date): GocharData {
  const now = date ?? new Date();
  const jd = dateToJulianDay(now);
  const ayanamsa = computeLahiriAyanamsa(jd);
  const rawPlanets = computeAllPlanetPositions(now);

  const planets: GocharPlanet[] = rawPlanets.map(p => {
    const sidereal = normalizeAngle(p.tropicalLongitude - ayanamsa);
    const signIndex = Math.floor(sidereal / 30) % 12;
    const degree = sidereal % 30;
    const nakshatraIndex = Math.floor(sidereal / NAKSHATRA_DEGREES) % 27;

    // Natal house = which house of the natal chart this transit falls in
    const natalHouse = ((signIndex - natalAscendantSignIndex + 12) % 12) + 1;

    return {
      id: p.name as PlanetId,
      sign: SIGN_IDS[signIndex]!,
      signIndex,
      degree: Math.floor(degree),
      nakshatra: NAKSHATRA_NAMES[nakshatraIndex]!,
      isRetrograde: p.speedDegPerDay < 0,
      natalHouse,
    };
  });

  return {
    computedAt: now.toISOString(),
    planets,
    date: now.toISOString().split('T')[0],
  };
}

/**
 * Check if Saturn is in Sade Sati relative to natal Moon sign.
 *
 * Sade Sati = Saturn transiting the 12th, 1st, or 2nd house from natal Moon.
 * Returns which phase (1/2/3) or null if not in Sade Sati.
 */
export function checkSadeSati(
  saturnGocharSignIndex: number,
  natalMoonSignIndex: number,
): { active: boolean; phase: 1 | 2 | 3 | null; description: string } {
  const diff = ((saturnGocharSignIndex - natalMoonSignIndex + 12) % 12);

  if (diff === 11) return { active: true, phase: 1, description: 'Rising (12th from Moon)' };
  if (diff === 0)  return { active: true, phase: 2, description: 'Peak (1st from Moon)' };
  if (diff === 1)  return { active: true, phase: 3, description: 'Setting (2nd from Moon)' };

  return { active: false, phase: null, description: 'Not in Sade Sati' };
}
