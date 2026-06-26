/**
 * @luckyray/astronomy
 *
 * Astronomy Layer — responsible for raw astronomical calculations only.
 *
 * This package:
 * - Computes tropical planetary longitudes
 * - Computes the Lahiri ayanamsa
 * - Computes the Ascendant (tropical)
 * - Provides Julian Day utilities
 *
 * It does NOT:
 * - Apply Jyotish rules
 * - Calculate houses, yogas, dashas
 * - Interpret any astronomical data
 *
 * Library decision (ADR-011):
 *   astronomy-engine (MIT, Don Cross) was chosen over alternatives because:
 *   1. Pure JavaScript — works in browser and Node.js without native addons
 *   2. VSOP87 accuracy — typically within 1 arc-second for modern dates
 *   3. Active maintenance and comprehensive test suite
 *   4. No ephemeris data files required
 *   Trade-off: Lower accuracy than Swiss Ephemeris for dates far from J2000,
 *   but sufficient for Jyotish purposes within ±200 years.
 */

import type { BirthDetails, AstronomyData } from '@luckyray/shared';
import { computeLahiriAyanamsa, dateToJulianDay } from './ayanamsa';
import { computeAllPlanetPositions, computeAscendantTropical } from './planets';

export type { RawPlanetPosition } from './planets';
export { computeLahiriAyanamsa, dateToJulianDay, julianDayToDate } from './ayanamsa';
export { computeAllPlanetPositions, computeAscendantTropical } from './planets';

export interface AstronomyInput {
  birthDetails: BirthDetails;
}

export interface AstronomyOutput {
  astronomyData: AstronomyData;
  rawPlanets: Array<{
    name: string;
    tropicalLongitude: number;
    siderealLongitude: number;
    latitude: number;
    speedDegPerDay: number;
    isRetrograde: boolean;
  }>;
  ascendantTropical: number;
  ascendantSidereal: number;
  localSiderealTime: number;
}

/**
 * Compute all astronomical data required by the Jyotish engine.
 *
 * @param input  Birth details including date, time, location, timezone
 * @returns  Raw astronomical output ready for the Jyotish engine
 */
export function computeAstronomy(input: AstronomyInput): AstronomyOutput {
  const { birthDetails } = input;

  // Parse birth date and time in UTC
  const utcDate = parseLocalBirthDateTime(birthDetails);
  const julianDay = dateToJulianDay(utcDate);
  const ayanamsa = computeLahiriAyanamsa(julianDay);

  const rawPlanets = computeAllPlanetPositions(utcDate);
  const ascendantTropical = computeAscendantTropical(
    utcDate,
    birthDetails.latitude,
    birthDetails.longitude
  );

  const ascendantSidereal = normalizeAngle(ascendantTropical - ayanamsa);
  const localSiderealTime = ((ascendantTropical + 90) % 360); // approximation for metadata

  const enrichedPlanets = rawPlanets.map(p => ({
    ...p,
    siderealLongitude: normalizeAngle(p.tropicalLongitude - ayanamsa),
  }));

  const calculatedAt = new Date().toISOString();

  const astronomyData: AstronomyData = {
    julianDay,
    ayanamsa,
    ayanamsaName: 'Lahiri',
    localSiderealTime,
    ascendantTropical,
    library: 'astronomy-engine@2.1.19',
    ephemerisVersion: 'VSOP87',
    calculatedAt,
  };

  return {
    astronomyData,
    rawPlanets: enrichedPlanets,
    ascendantTropical,
    ascendantSidereal,
    localSiderealTime,
  };
}

/**
 * Convert local birth date/time string to UTC Date.
 *
 * @param birthDetails  Birth details with date "YYYY-MM-DD", time "HH:MM",
 *                      and utcOffset in minutes
 */
export function parseLocalBirthDateTime(birthDetails: BirthDetails): Date {
  const { date, time, utcOffset } = birthDetails;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  if (year === undefined || month === undefined || day === undefined ||
      hour === undefined || minute === undefined) {
    throw new Error(`Invalid birth date/time: ${date} ${time}`);
  }

  // Local time as UTC, then subtract offset
  const localMs = Date.UTC(year, month - 1, day, hour, minute);
  const utcMs = localMs - utcOffset * 60 * 1000;
  return new Date(utcMs);
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
