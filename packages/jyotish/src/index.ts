/**
 * @luckyray/jyotish
 *
 * Jyotish Calculation Engine — the heart of LuckyRay.
 *
 * This package:
 * - Consumes astronomical data from @luckyray/astronomy
 * - Applies all deterministic Jyotish rules
 * - Produces a complete canonical chart object
 *
 * It does NOT:
 * - Perform astronomical calculations
 * - Call any AI or external APIs
 * - Contain any UI logic
 *
 * Architecture:
 *   BirthDetails → Astronomy Engine → Jyotish Engine → CanonicalChart
 *
 * All calculations follow the Parashari tradition unless documented otherwise.
 *
 * Engine version follows semver. Increment patch for rule fixes,
 * minor for new calculations, major for schema changes.
 */

import type { CanonicalChart, BirthDetails, Profile, PlanetId } from '@luckyray/shared';
import { SIGN_IDS, NAKSHATRA_NAMES, NAKSHATRA_DEGREES, NAKSHATRA_DEGREES as ND } from '@luckyray/shared';
import { computeAstronomy, type AstronomyOutput } from '@luckyray/astronomy';
import { buildPlanetPosition } from './planets';
import { buildHouses, signIndexToHouse } from './houses';
import { computeAspects, computeConjunctions } from './aspects';
import { detectYogas } from './yogas';
import { detectDoshas } from './doshas';
import { computeVimshottariDasha } from './dashas';
import { computeNavamsa, computeDashamsa } from './divisional';

export const ENGINE_VERSION = '1.0.0';

export { formatDashaDuration } from './dashas';
export { signIndexToHouse } from './houses';
export { computeCurrentGochar, checkSadeSati } from './gochar';
export { serializeChartInterpretation } from './interpreter';

export interface ChartGenerationInput {
  profile: Pick<Profile, 'id' | 'name' | 'gender'>;
  birthDetails: BirthDetails;
}

export type ChartGenerationResult =
  | { success: true; chart: CanonicalChart; durationMs: number }
  | { success: false; error: string; details?: string };

type ChartResult = ChartGenerationResult;

/**
 * Generate a complete canonical Jyotish chart from birth details.
 *
 * @param input  Profile + birth details
 * @returns  Canonical chart object or structured error
 */
export function generateChart(input: ChartGenerationInput): ChartResult {
  const startTime = Date.now();

  try {
    const { profile, birthDetails } = input;

    // Layer 1: Astronomical calculations
    const astronomy = computeAstronomy({ birthDetails });
    const {
      astronomyData,
      rawPlanets,
      ascendantTropical,
      ascendantSidereal,
    } = astronomy;

    const ascendantSignIndex = Math.floor(ascendantSidereal / 30) % 12;
    const ascendantSign = SIGN_IDS[ascendantSignIndex]!;
    const ascendantDeg = Math.floor(ascendantSidereal % 30);
    const ascendantMin = Math.floor((ascendantSidereal % 1) * 60);
    const ascNakshatraIndex = Math.floor(ascendantSidereal / NAKSHATRA_DEGREES) % 27;
    const ascNakshatra = NAKSHATRA_NAMES[ascNakshatraIndex]!;
    const ascPada = Math.floor((ascendantSidereal % NAKSHATRA_DEGREES) / (NAKSHATRA_DEGREES / 4)) + 1;

    // Helper: sign index → house number
    const houseOf = (signIndex: number): number =>
      signIndexToHouse(signIndex, ascendantSignIndex);

    // Layer 2: Planet positions with full Jyotish attributes
    const planets = rawPlanets.map(raw =>
      buildPlanetPosition(raw, houseOf, rawPlanets),
    );

    // Houses (Whole Sign system)
    const houses = buildHouses(ascendantSignIndex, planets);

    // Aspects (Drishtis)
    const aspects = computeAspects(planets, houses);

    // Conjunctions
    const conjunctions = computeConjunctions(planets);

    // Yogas
    const yogas = detectYogas({ planets, houses, ascendantSignIndex });

    // Doshas
    const doshas = detectDoshas({ planets, houses, ascendantSignIndex });

    // Vimshottari Dasha
    const moonPlanet = planets.find(p => p.id === 'Moon')!;
    const dashas = computeVimshottariDasha(
      moonPlanet.siderealLongitude,
      astronomyData.julianDay,
    );

    // Divisional charts
    const D9 = computeNavamsa(planets, ascendantSidereal);
    const D10 = computeDashamsa(planets, ascendantSidereal);

    const durationMs = Date.now() - startTime;

    const chart: CanonicalChart = {
      version: '1.0',
      profile,
      birthDetails,
      astronomy: astronomyData,
      ascendant: {
        sign: ascendantSign,
        signIndex: ascendantSignIndex,
        degree: ascendantDeg,
        minute: ascendantMin,
        nakshatra: ascNakshatra,
        pada: ascPada,
      },
      planets,
      houses,
      aspects,
      conjunctions,
      yogas,
      doshas,
      dashas,
      divisionalCharts: { D9, D10 },
      metadata: {
        engineVersion: ENGINE_VERSION,
        calculatedAt: new Date().toISOString(),
        calculationDurationMs: durationMs,
        warnings: [],
        assumptions: [
          'Whole Sign house system (Parashari)',
          'Lahiri (Chitrapaksha) ayanamsa',
          'Vimshottari Dasha system',
          'Special aspects for Rahu/Ketu: 5th and 9th (Parashari view)',
          'Manglik Dosha: counted from Lagna only',
        ],
      },
    };

    return { success: true, chart, durationMs };
  } catch (err) {
    return {
      success: false,
      error: 'Chart generation failed',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Validate birth details before chart generation.
 */
export function validateBirthDetails(details: Partial<BirthDetails>): string[] {
  const errors: string[] = [];

  if (!details.date || !/^\d{4}-\d{2}-\d{2}$/.test(details.date)) {
    errors.push('Valid date of birth is required (YYYY-MM-DD)');
  } else {
    const date = new Date(details.date);
    if (isNaN(date.getTime())) {
      errors.push('Date of birth is not a valid date');
    } else if (date > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }
  }

  if (!details.time || !/^\d{2}:\d{2}$/.test(details.time)) {
    errors.push('Valid time of birth is required (HH:MM)');
  }

  if (typeof details.latitude !== 'number' || details.latitude < -90 || details.latitude > 90) {
    errors.push('Valid latitude is required (-90 to 90)');
  }

  if (typeof details.longitude !== 'number' || details.longitude < -180 || details.longitude > 180) {
    errors.push('Valid longitude is required (-180 to 180)');
  }

  if (!details.timezone) {
    errors.push('Timezone is required');
  }

  if (!details.place) {
    errors.push('Birth place name is required');
  }

  return errors;
}
