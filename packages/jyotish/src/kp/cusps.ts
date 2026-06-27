/**
 * Placidus House Cusp Calculator for KP Astrology.
 *
 * KP uses the Placidus house system (not Whole Sign). House cusps are
 * computed from the RAMC (Right Ascension of Midheaven), geographic
 * latitude, and obliquity of the ecliptic.
 *
 * Method: Iterative convergence (30 iterations per cusp).
 *
 * Placidus conditions (all in RA degrees, diurnal motion = increasing RA):
 *
 *   Above horizon (H11, H12 — between MC and ASC going forward in RA):
 *     (RA_cusp - RAMC) = fraction × SDA_cusp
 *     H11: fraction = 1/3  (closer to MC)
 *     H12: fraction = 2/3  (closer to ASC)
 *
 *   Below horizon (H2, H3 — between ASC and IC going forward in RA):
 *     (RAIC - RA_cusp) = fraction × SNA_cusp
 *     H2:  fraction = 2/3  (closer to ASC, further from IC)
 *     H3:  fraction = 1/3  (closer to IC)
 *
 *   Opposite cusps:
 *     H4=IC, H7=DESC, H10=MC, H1=ASC are exact.
 *     H5=H11+180°, H6=H12+180°, H8=H2+180°, H9=H3+180°
 *
 * References:
 *   Jean Meeus, "Astronomical Algorithms", 2nd ed., ch. 24
 *   K.S. Krishnamurti, "Krishnamurti Padhdhati"
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

/**
 * Compute MC (Midheaven) ecliptic longitude from RAMC and obliquity.
 */
function computeMC(ramcDeg: number, obliquityDeg: number): number {
  const RAMC = ramcDeg * D2R;
  const eps  = obliquityDeg * D2R;
  const mc = Math.atan2(Math.sin(RAMC), Math.cos(RAMC) * Math.cos(eps)) * R2D;
  return norm360(mc);
}

/**
 * Convert ecliptic longitude (tropical, degrees) to equatorial RA and Dec.
 */
function eclipticToEquatorial(lonDeg: number, obliquityDeg: number): { ra: number; dec: number } {
  const lon = lonDeg * D2R;
  const eps = obliquityDeg * D2R;
  const ra  = Math.atan2(Math.sin(lon) * Math.cos(eps), Math.cos(lon)) * R2D;
  const dec = Math.asin(Math.sin(lon) * Math.sin(eps)) * R2D;
  return { ra: norm360(ra), dec };
}

/**
 * Semi-diurnal arc for a point with declination D at latitude φ (degrees).
 * Returns SDA in degrees. Circumpolar → 180°, never rises → 0°.
 */
function semiDiurnalArc(decDeg: number, latDeg: number): number {
  const D   = decDeg * D2R;
  const phi = latDeg * D2R;
  const cosH = -Math.tan(phi) * Math.tan(D);
  if (cosH >= 1)  return 0;
  if (cosH <= -1) return 180;
  return Math.acos(cosH) * R2D;
}

/**
 * Iterate to find an ABOVE-HORIZON Placidus cusp (H11 or H12).
 *
 * Condition: (RA_cusp - RAMC) = fraction × SDA_cusp
 * H11: fraction=1/3  H12: fraction=2/3
 *
 * These cusps have higher RA than RAMC (come after MC in sidereal time).
 */
function iteratePlacidusAbove(
  ramcDeg: number,
  obliquityDeg: number,
  latDeg: number,
  fraction: number,
  initialEst: number,
): number {
  let lambda = initialEst;

  for (let iter = 0; iter < 40; iter++) {
    const { ra, dec } = eclipticToEquatorial(lambda, obliquityDeg);
    const sda = semiDiurnalArc(dec, latDeg);

    // Meridian distance from MC going FORWARD (toward ASC via H11/H12)
    let md = norm360(ra - ramcDeg);
    if (md > 180) md = 360 - md;

    const targetMD = fraction * sda;
    const residual = targetMD - md;

    lambda = norm360(lambda + residual * 0.85);
    if (Math.abs(residual) < 0.00001) break;
  }
  return lambda;
}

/**
 * Iterate to find a BELOW-HORIZON Placidus cusp (H2 or H3).
 *
 * Condition: (RAIC - RA_cusp) = fraction × SNA_cusp
 * H2: fraction=2/3  (closer to ASC)
 * H3: fraction=1/3  (closer to IC)
 *
 * These cusps have lower RA than RAIC (come before IC in sidereal time,
 * after ASC).
 */
function iteratePlacidusBelow(
  ramcDeg: number,
  obliquityDeg: number,
  latDeg: number,
  fraction: number,
  initialEst: number,
): number {
  let lambda = initialEst;
  const RAIC = norm360(ramcDeg + 180);

  for (let iter = 0; iter < 40; iter++) {
    const { ra, dec } = eclipticToEquatorial(lambda, obliquityDeg);
    const sda = semiDiurnalArc(dec, latDeg);
    const sna = 180 - sda;

    // Distance from IC going BACKWARD toward ASC (decreasing RA from RAIC)
    let md = norm360(RAIC - ra);
    if (md > 180) md = 360 - md;

    const targetMD = fraction * sna;
    const residual = targetMD - md;

    // RAIC - RA decreases as lambda increases (negative gradient),
    // so the correction sign is opposite to the above-horizon case.
    lambda = norm360(lambda - residual * 0.85);
    if (Math.abs(residual) < 0.00001) break;
  }
  return lambda;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Compute all 12 Placidus house cusp tropical longitudes.
 *
 * @param ramcDeg      Right Ascension of Midheaven in degrees
 * @param ascTropical  Ascendant tropical longitude in degrees (from astronomy)
 * @param obliquityDeg Mean obliquity of ecliptic in degrees
 * @param latDeg       Geographic latitude in degrees
 * @returns Array of 12 tropical cusp longitudes, index 0 = H1 (ASC)
 */
export function computePlacidusLongitudes(
  ramcDeg: number,
  ascTropical: number,
  obliquityDeg: number,
  latDeg: number,
): number[] {
  const mc   = computeMC(ramcDeg, obliquityDeg);
  const ic   = norm360(mc + 180);
  const asc  = ascTropical;
  const desc = norm360(asc + 180);

  // H11: 1/3 of SDA from MC toward ASC (initial est: mc + 30°)
  const c11 = iteratePlacidusAbove(ramcDeg, obliquityDeg, latDeg, 1 / 3, norm360(mc + 30));
  // H12: 2/3 of SDA from MC toward ASC (initial est: mc + 60°)
  const c12 = iteratePlacidusAbove(ramcDeg, obliquityDeg, latDeg, 2 / 3, norm360(mc + 60));

  // H2: 2/3 of SNA from IC toward ASC (initial est: ic - 60°, going backward)
  const c2  = iteratePlacidusBelow(ramcDeg, obliquityDeg, latDeg, 2 / 3, norm360(ic - 60));
  // H3: 1/3 of SNA from IC toward ASC (initial est: ic - 30°, going backward)
  const c3  = iteratePlacidusBelow(ramcDeg, obliquityDeg, latDeg, 1 / 3, norm360(ic - 30));

  // Opposite cusps (180° apart)
  const c5 = norm360(c11 + 180);  // H5 = opposite H11
  const c6 = norm360(c12 + 180);  // H6 = opposite H12
  const c8 = norm360(c2  + 180);  // H8 = opposite H2
  const c9 = norm360(c3  + 180);  // H9 = opposite H3

  // Return array indexed 0–11 = H1–H12
  return [asc, c2, c3, ic, c5, c6, desc, c8, c9, mc, c11, c12];
}
