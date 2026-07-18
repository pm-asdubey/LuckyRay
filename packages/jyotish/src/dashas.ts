/**
 * Vimshottari Dasha calculations.
 *
 * Vimshottari Dasha is the most widely used dasha system in Parashari Jyotish.
 * It spans 120 years, with each of the 9 planets ruling specific periods.
 *
 * The birth dasha is determined by the Moon's nakshatra (lunar mansion) at
 * the moment of birth. The remaining portion of the first dasha is calculated
 * based on how far the Moon has progressed through its birth nakshatra.
 *
 * Formula for balance of dasha at birth:
 *   balance = dasha_years × (1 - nakshatra_fraction_elapsed)
 *   nakshatra_fraction_elapsed = (moon_lon % 13.333...) / 13.333...
 *
 * Reference:
 *   Parasara Hora Shastra, ch. 46 (Vimshottari Dasha Adhyaya)
 *   B.V. Raman, "A Manual of Hindu Astrology" (1935)
 */

import type { DashaData, DashaPeriod, PlanetId } from '@luckyray/shared';
import type { NakshatraName } from '@luckyray/shared';
import {
  VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS, VIMSHOTTARI_TOTAL_YEARS,
  NAKSHATRA_LORDS, NAKSHATRA_NAMES, NAKSHATRA_DEGREES, NAKSHATRA_DEGREES as ND,
} from '@luckyray/shared';
import { julianDayToDate, dateToJulianDay } from '@luckyray/astronomy';

const DAYS_PER_YEAR = 365.25;

/**
 * Calculate the complete Vimshottari Dasha for a chart.
 *
 * @param moonSiderealLongitude  Moon's sidereal longitude in degrees (0–360)
 * @param birthDate              ISO 8601 date string "YYYY-MM-DD"
 * @param birthTime              "HH:MM" in UTC equivalent
 * @param birthJulianDay         Julian Day of birth (UTC)
 */
export function computeVimshottariDasha(
  moonSiderealLongitude: number,
  birthJulianDay: number,
): DashaData {
  const nakshatraIndex = Math.floor(moonSiderealLongitude / NAKSHATRA_DEGREES) % 27;
  const nakshatra: NakshatraName = NAKSHATRA_NAMES[nakshatraIndex]!;
  const nakshatraLord = NAKSHATRA_LORDS[nakshatraIndex]!;
  const pada = Math.floor((moonSiderealLongitude % NAKSHATRA_DEGREES) / (NAKSHATRA_DEGREES / 4)) + 1;

  // Fraction of nakshatra elapsed
  const longitudeInNakshatra = moonSiderealLongitude % NAKSHATRA_DEGREES;
  const fractionElapsed = longitudeInNakshatra / NAKSHATRA_DEGREES;
  const fractionRemaining = 1 - fractionElapsed;

  // Balance of birth dasha in years
  const birthDashaYears = VIMSHOTTARI_YEARS[nakshatraLord]!;
  const balanceYears = birthDashaYears * fractionRemaining;
  const balanceDays = Math.round(balanceYears * DAYS_PER_YEAR);

  // Build all dasha periods starting from birth
  const birthDate = julianDayToDate(birthJulianDay);
  const allPeriods: DashaPeriod[] = buildAllDashaPeriods(
    nakshatraLord,
    balanceYears,
    birthDate,
  );

  // Find current periods
  const now = new Date();
  const currentMahadasha = allPeriods.find(d =>
    new Date(d.startDate) <= now && new Date(d.endDate) >= now,
  ) ?? allPeriods[allPeriods.length - 1]!;

  const currentAntardasha = currentMahadasha.antardasha?.find(a =>
    new Date(a.startDate) <= now && new Date(a.endDate) >= now,
  ) ?? null;

  const currentPratyantar = currentAntardasha?.pratyantar?.find(p =>
    new Date(p.startDate) <= now && new Date(p.endDate) >= now,
  ) ?? null;

  // Compute Sookshma only for the current Pratyantar (avoids bloating the stored chart)
  const currentSookshma = currentPratyantar
    ? (computeSookshmaForPratyantar(currentPratyantar).find(s =>
        new Date(s.startDate) <= now && new Date(s.endDate) >= now,
      ) ?? null)
    : null;

  return {
    system: 'Vimshottari',
    birthNakshatra: nakshatra,
    birthNakshatraLord: nakshatraLord,
    nakshatraPadaAtBirth: pada,
    balanceDaysAtBirth: balanceDays,
    allPeriods,
    currentMahadasha,
    currentAntardasha,
    currentPratyantar,
    currentSookshma,
  };
}

function buildAllDashaPeriods(
  firstLord: PlanetId,
  firstDurationYears: number,
  birthDate: Date,
): DashaPeriod[] {
  const firstIndex = VIMSHOTTARI_ORDER.indexOf(firstLord);
  const periods: DashaPeriod[] = [];
  let currentDate = birthDate;

  for (let i = 0; i < 9; i++) {
    const planetIndex = (firstIndex + i) % 9;
    const planet = VIMSHOTTARI_ORDER[planetIndex]!;
    const durationYears = i === 0 ? firstDurationYears : VIMSHOTTARI_YEARS[planet]!;
    const durationMs = durationYears * DAYS_PER_YEAR * 86400000;

    const startDate = currentDate;
    const endDate = new Date(currentDate.getTime() + durationMs);

    const antardasha = buildAntardasha(planet, durationYears, startDate);

    periods.push({
      planet,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      durationYears,
      antardasha,
    });

    currentDate = endDate;
  }

  return periods;
}

function buildAntardasha(
  mahadashaLord: PlanetId,
  totalYears: number,
  startDate: Date,
): DashaPeriod[] {
  const firstIndex = VIMSHOTTARI_ORDER.indexOf(mahadashaLord);
  const periods: DashaPeriod[] = [];
  let currentDate = startDate;

  for (let i = 0; i < 9; i++) {
    const planetIndex = (firstIndex + i) % 9;
    const planet = VIMSHOTTARI_ORDER[planetIndex]!;

    // Antardasha duration = (mahadasha_years × antardasha_planet_years) / 120
    const durationYears = (totalYears * VIMSHOTTARI_YEARS[planet]!) / VIMSHOTTARI_TOTAL_YEARS;
    const durationMs = durationYears * DAYS_PER_YEAR * 86400000;
    const endDate = new Date(currentDate.getTime() + durationMs);

    const pratyantar = buildPratyantar(planet, durationYears, currentDate);

    periods.push({
      planet,
      startDate: currentDate.toISOString(),
      endDate: endDate.toISOString(),
      durationYears,
      pratyantar,
    });

    currentDate = endDate;
  }

  return periods;
}

function buildPratyantar(
  antardashaLord: PlanetId,
  antarDurationYears: number,
  startDate: Date,
): DashaPeriod[] {
  const firstIndex = VIMSHOTTARI_ORDER.indexOf(antardashaLord);
  const periods: DashaPeriod[] = [];
  let currentDate = startDate;

  for (let i = 0; i < 9; i++) {
    const planetIndex = (firstIndex + i) % 9;
    const planet = VIMSHOTTARI_ORDER[planetIndex]!;

    // Pratyantar duration = (antardasha_years × pratyantar_planet_years) / 120
    const durationYears = (antarDurationYears * VIMSHOTTARI_YEARS[planet]!) / VIMSHOTTARI_TOTAL_YEARS;
    const durationMs = durationYears * DAYS_PER_YEAR * 86400000;
    const endDate = new Date(currentDate.getTime() + durationMs);

    periods.push({
      planet,
      startDate: currentDate.toISOString(),
      endDate: endDate.toISOString(),
      durationYears,
    });

    currentDate = endDate;
  }

  return periods;
}

/**
 * Build the 9 Sookshma (4th-level) sub-periods within a single Pratyantar period.
 * Duration formula: sookshma = (pratyantar_years × planet_years) / 120
 *
 * Sookshma periods typically span a few days to a few weeks. They are not stored
 * in the chart (to avoid bloating StoredChart) — they are computed on demand in the UI.
 */
export function computeSookshmaForPratyantar(pratyantar: DashaPeriod): DashaPeriod[] {
  const firstIndex = VIMSHOTTARI_ORDER.indexOf(pratyantar.planet);
  const periods: DashaPeriod[] = [];
  let currentDate = new Date(pratyantar.startDate);

  for (let i = 0; i < 9; i++) {
    const planetIndex = (firstIndex + i) % 9;
    const planet = VIMSHOTTARI_ORDER[planetIndex]!;

    const durationYears = (pratyantar.durationYears * VIMSHOTTARI_YEARS[planet]!) / VIMSHOTTARI_TOTAL_YEARS;
    const durationMs = durationYears * DAYS_PER_YEAR * 86400000;
    const endDate = new Date(currentDate.getTime() + durationMs);

    periods.push({
      planet,
      startDate: currentDate.toISOString(),
      endDate: endDate.toISOString(),
      durationYears,
    });

    currentDate = endDate;
  }

  return periods;
}

/**
 * Format a dasha period as a human-readable duration string.
 */
export function formatDashaDuration(years: number): string {
  const y = Math.floor(years);
  const m = Math.floor((years - y) * 12);
  const d = Math.floor(((years - y) * 12 - m) * 30.44);

  const parts: string[] = [];
  if (y > 0) parts.push(`${y}y`);
  if (m > 0) parts.push(`${m}m`);
  if (d > 0 && y === 0) parts.push(`${d}d`);
  return parts.join(' ') || '< 1 day';
}
