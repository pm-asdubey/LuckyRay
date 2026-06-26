/**
 * Placidus House Cusp Calculator for KP Astrology.
 *
 * KP uses the Placidus house system (not Whole Sign). House cusps are
 * computed from the RAMC (Right Ascension of Midheaven), geographic
 * latitude, and obliquity of the ecliptic.
 *
 * Method: Iterative convergence (20 iterations per cusp).
 *   - MC (cusp 10): atan2(sin(RAMC), cos(RAMC)×cos(ε))
 *   - ASC (cusp 1): already computed by astronomy layer
 *   - Intermediate (11,12,2,3): Placidus condition, iterated
 *   - Opposite cusps (4,5,6,7,8,9): +180°
 *
 * Placidus condition for cusp H:
 *   (RAMC - RA_H) = fraction × SDA_H
 *   where SDA_H = arccos(-tan(φ)×tan(D_H))
 *
 * References:
 *   Jean Meeus, "Astronomical Algorithms", 2nd ed., ch. 14
 *   Robert Hand, "Planets in Transit"
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

/**
 * Compute MC (Midheaven) ecliptic longitude from RAMC and obliquity.
 * Both inputs in degrees. Returns tropical longitude in degrees.
 */
function computeMC(ramcDeg: number, obliquityDeg: number): number {
  const RAMC = ramcDeg * D2R;
  const eps  = obliquityDeg * D2R;
  const mc = Math.atan2(Math.sin(RAMC), Math.cos(RAMC) * Math.cos(eps)) * R2D;
  return norm360(mc);
}

/**
 * Given an ecliptic longitude (tropical, degrees), compute its Right Ascension
 * and Declination using the obliquity of the ecliptic.
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
 * Returns SDA in degrees. Circumpolar → 180°, always-below-horizon → 0°.
 */
function semiDiurnalArc(decDeg: number, latDeg: number): number {
  const D   = decDeg * D2R;
  const phi = latDeg * D2R;
  const cosH = -Math.tan(phi) * Math.tan(D);
  if (cosH >= 1)  return 0;    // never rises
  if (cosH <= -1) return 180;  // circumpolar
  return Math.acos(cosH) * R2D;
}

/**
 * Compute one Placidus intermediate cusp by iteration.
 *
 * @param ramcDeg     RAMC in degrees
 * @param obliquityDeg obliquity in degrees
 * @param latDeg      geographic latitude in degrees
 * @param fraction    2/3 for 11th, 1/3 for 12th
 * @param initialEst  initial tropical longitude estimate
 */
function iteratePlacidus(
  ramcDeg: number,
  obliquityDeg: number,
  latDeg: number,
  fraction: number,
  initialEst: number,
): number {
  let lambda = initialEst;

  for (let iter = 0; iter < 30; iter++) {
    const { ra, dec } = eclipticToEquatorial(lambda, obliquityDeg);
    const sda = semiDiurnalArc(dec, latDeg);

    // Meridian distance from MC
    let md = norm360(ramcDeg - ra);
    if (md > 180) md = 360 - md;   // take the shorter arc from MC

    const targetMD = fraction * sda;
    const residual = targetMD - md;

    // Small correction: adjust longitude by residual (damped)
    // dRA/dλ ≈ cos²(ε) for tropical points — use 0.8 as practical damping
    const correction = residual * 0.9;
    lambda = norm360(lambda + correction);

    if (Math.abs(residual) < 0.0001) break;
  }
  return lambda;
}

/**
 * Compute Placidus intermediate cusps below the horizon (2nd and 3rd houses).
 * These use the Semi-Nocturnal Arc instead of the Semi-Diurnal Arc.
 */
function iteratePlacidusBelow(
  ramcDeg: number,
  obliquityDeg: number,
  latDeg: number,
  fraction: number,
  initialEst: number,
): number {
  let lambda = initialEst;
  const RAIC = norm360(ramcDeg + 180); // Right Ascension of IC

  for (let iter = 0; iter < 30; iter++) {
    const { ra, dec } = eclipticToEquatorial(lambda, obliquityDeg);
    const sda = semiDiurnalArc(dec, latDeg);
    const sna = 180 - sda; // semi-nocturnal arc

    // Meridian distance from IC
    let md = norm360(ra - RAIC);
    if (md > 180) md = 360 - md;

    const targetMD = fraction * sna;
    const residual = targetMD - md;

    const correction = residual * 0.9;
    lambda = norm360(lambda + correction);

    if (Math.abs(residual) < 0.0001) break;
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
 * @returns Array of 12 tropical cusp longitudes, index 0 = Cusp 1 (ASC)
 */
export function computePlacidusLongitudes(
  ramcDeg: number,
  ascTropical: number,
  obliquityDeg: number,
  latDeg: number,
): number[] {
  const mc    = computeMC(ramcDeg, obliquityDeg);
  const ic    = norm360(mc + 180);
  const asc   = ascTropical;
  const desc  = norm360(asc + 180);

  // Intermediate cusps (tropical)
  const c11 = iteratePlacidus(ramcDeg, obliquityDeg, latDeg, 2 / 3, norm360(mc + 30));
  const c12 = iteratePlacidus(ramcDeg, obliquityDeg, latDeg, 1 / 3, norm360(mc + 60));
  const c2  = iteratePlacidusBelow(ramcDeg, obliquityDeg, latDeg, 1 / 3, norm360(ic + 30));
  const c3  = iteratePlacidusBelow(ramcDeg, obliquityDeg, latDeg, 2 / 3, norm360(ic + 60));

  // Opposite cusps
  const c5 = norm360(c11 + 180);
  const c6 = norm360(c12 + 180);
  const c8 = norm360(c2  + 180);
  const c9 = norm360(c3  + 180);

  // Index 0 = Cusp 1 (ASC), index 9 = Cusp 10 (MC), etc.
  return [asc, c2, c3, ic, c5, c6, desc, c8, c9, mc, c11, c12];
}
