/**
 * Planetary position calculations using the astronomy-engine library.
 *
 * astronomy-engine by Don Cross (MIT license) provides highly accurate
 * planetary positions using the VSOP87 theory. Accuracy is typically
 * within 1 arc-second for modern dates.
 *
 * We retrieve tropical ecliptic longitudes and then apply the Lahiri
 * ayanamsa to obtain sidereal positions used in Jyotish.
 *
 * References:
 *  - https://github.com/cosinekitty/astronomy
 *  - VSOP87 theory: Bretagnon & Francou, 1988
 */

import * as Astronomy from 'astronomy-engine';

export interface RawPlanetPosition {
  name: string;
  tropicalLongitude: number;  // 0–360 degrees
  siderealLongitude: number;  // 0–360 degrees (set by astronomy layer after ayanamsa subtraction)
  latitude: number;           // ecliptic latitude in degrees
  speedDegPerDay: number;     // daily motion in degrees
  isRetrograde: boolean;
}

const ASTRONOMY_BODY_MAP: Record<string, Astronomy.Body> = {
  Sun:     Astronomy.Body.Sun,
  Moon:    Astronomy.Body.Moon,
  Mars:    Astronomy.Body.Mars,
  Mercury: Astronomy.Body.Mercury,
  Jupiter: Astronomy.Body.Jupiter,
  Venus:   Astronomy.Body.Venus,
  Saturn:  Astronomy.Body.Saturn,
};

/**
 * Calculate tropical ecliptic longitude for a single planet at a given date.
 */
function getPlanetTropicalLongitude(body: Astronomy.Body, date: Date): {
  longitude: number;
  latitude: number;
  speedDegPerDay: number;
} {
  if (body === Astronomy.Body.Sun) {
    const sunPos = Astronomy.SunPosition(date);
    return {
      longitude: normalizeAngle(sunPos.elon),
      latitude: sunPos.elat,
      speedDegPerDay: 0.9856, // ~1 degree/day for Sun
    };
  }

  if (body === Astronomy.Body.Moon) {
    const moonPos = Astronomy.GeoMoon(date);
    // Convert equatorial to ecliptic
    const obliquity = computeObliquity(date);
    const { lon, lat } = equatorialToEcliptic(moonPos.x, moonPos.y, moonPos.z, obliquity);
    return {
      longitude: normalizeAngle(lon),
      latitude: lat,
      speedDegPerDay: 13.1764, // ~13.2 degrees/day for Moon
    };
  }

  // For other planets, use GeoVector → ecliptic conversion
  const vector = Astronomy.GeoVector(body, date, true);
  const obliquity = computeObliquity(date);
  const { lon, lat } = equatorialToEcliptic(vector.x, vector.y, vector.z, obliquity);

  // Compute speed using finite difference (next day)
  const tomorrow = new Date(date.getTime() + 86400000);
  const tomorrowVec = Astronomy.GeoVector(body, tomorrow, true);
  const { lon: lonTomorrow } = equatorialToEcliptic(tomorrowVec.x, tomorrowVec.y, tomorrowVec.z, obliquity);
  let speedDegPerDay = lonTomorrow - lon;
  // Handle 0/360 boundary
  if (speedDegPerDay > 180) speedDegPerDay -= 360;
  if (speedDegPerDay < -180) speedDegPerDay += 360;

  return {
    longitude: normalizeAngle(lon),
    latitude: lat,
    speedDegPerDay,
  };
}

/**
 * Compute Local Sidereal Time in degrees (= RAMC for KP computations).
 * Exported so the KP engine can use it directly.
 */
export function computeRAMC(date: Date, longitude: number): number {
  return computeLocalSiderealTime(date, longitude);
}

/**
 * Compute mean obliquity of the ecliptic in degrees (exported for KP).
 */
export function computeObliquityDeg(date: Date): number {
  return computeObliquity(date) * 180 / Math.PI;
}

/**
 * Compute mean obliquity of the ecliptic using IAU 1976 formula.
 */
function computeObliquity(date: Date): number {
  const jd = Astronomy.MakeTime(date).tt + 2451545.0;
  const T = (jd - 2451545.0) / 36525.0;
  // IAU 1976 formula, degrees
  const eps = 23.439291111 - 0.013004167 * T - 0.0000001639 * T * T + 0.0000005036 * T * T * T;
  return eps * Math.PI / 180;
}

/**
 * Convert equatorial Cartesian (x,y,z) to ecliptic longitude/latitude.
 */
function equatorialToEcliptic(x: number, y: number, z: number, obliquity: number): {
  lon: number;
  lat: number;
} {
  const cos_eps = Math.cos(obliquity);
  const sin_eps = Math.sin(obliquity);

  const xe = x;
  const ye = y * cos_eps + z * sin_eps;
  const ze = -y * sin_eps + z * cos_eps;

  const lon = Math.atan2(ye, xe) * 180 / Math.PI;
  const r = Math.sqrt(xe * xe + ye * ye + ze * ze);
  const lat = Math.asin(ze / r) * 180 / Math.PI;

  return { lon, lat };
}

/**
 * Calculate Rahu (North Node) position.
 *
 * Uses Astronomy.MoonPhase to get the tropical longitude of the Moon's
 * ascending node. Ketu is always 180° opposite Rahu.
 *
 * Note: astronomy-engine provides the lunar node via the EclipticGeoMoon.
 * We use the standard approximation: mean node from lunar orbital elements.
 */
function getMeanLunarNode(date: Date): number {
  const jd = Astronomy.MakeTime(date).tt + 2451545.0;
  const T = (jd - 2451545.0) / 36525.0;

  // Mean longitude of ascending node (Meeus, "Astronomical Algorithms", ch.47)
  const omega = 125.04452
    - 1934.136261 * T
    + 0.0020708 * T * T
    + T * T * T / 450000;

  return normalizeAngle(omega);
}

/**
 * Compute positions for all 9 Jyotish grahas at the given UTC date.
 */
export function computeAllPlanetPositions(date: Date): RawPlanetPosition[] {
  const positions: RawPlanetPosition[] = [];

  for (const [name, body] of Object.entries(ASTRONOMY_BODY_MAP)) {
    const { longitude, latitude, speedDegPerDay } = getPlanetTropicalLongitude(body, date);
    positions.push({
      name,
      tropicalLongitude: longitude,
      siderealLongitude: 0, // set by astronomy index after ayanamsa subtraction
      latitude,
      speedDegPerDay,
      isRetrograde: speedDegPerDay < 0,
    });
  }

  // Rahu (North Node) — always retrograde in mean motion
  const rahuLong = getMeanLunarNode(date);
  positions.push({
    name: 'Rahu',
    tropicalLongitude: rahuLong,
    siderealLongitude: 0,
    latitude: 0,
    speedDegPerDay: -0.0529, // mean retrograde motion
    isRetrograde: true,
  });

  // Ketu (South Node) — exactly opposite Rahu
  const ketuLong = normalizeAngle(rahuLong + 180);
  positions.push({
    name: 'Ketu',
    tropicalLongitude: ketuLong,
    siderealLongitude: 0,
    latitude: 0,
    speedDegPerDay: -0.0529,
    isRetrograde: true,
  });

  return positions;
}

/**
 * Compute the tropical longitude of the Ascendant (Lagna).
 *
 * Method: Uses the oblique ascension formula.
 *   RAMC = Greenwich Mean Sidereal Time + Observer Longitude
 *   ASC = atan(cos(RAMC) / (sin(RAMC) * cos(ε) + tan(φ) * sin(ε)))
 *
 * where ε = obliquity of ecliptic, φ = geographic latitude
 *
 * Reference: Jean Meeus, "Astronomical Algorithms", 2nd ed., ch. 14.
 */
export function computeAscendantTropical(date: Date, latitude: number, longitude: number): number {
  // Local Sidereal Time in degrees
  const lst = computeLocalSiderealTime(date, longitude);
  const obliquity = computeObliquity(date) * 180 / Math.PI; // convert back to degrees

  const RAMC = lst * Math.PI / 180; // in radians
  const eps = obliquity * Math.PI / 180;
  const phi = latitude * Math.PI / 180;

  // Ascendant formula
  const y = Math.cos(RAMC);
  const x = -(Math.sin(RAMC) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  let asc = Math.atan2(y, x) * 180 / Math.PI;

  asc = normalizeAngle(asc);
  return asc;
}

/**
 * Compute Local Sidereal Time in degrees at the given place and UTC date.
 */
function computeLocalSiderealTime(date: Date, longitude: number): number {
  const jd = Astronomy.MakeTime(date).ut + 2451545.0;

  // Greenwich Apparent Sidereal Time (GAST) in degrees
  // Using the simple Meeus formula (accurate to ~0.1 second)
  const jd0 = Math.floor(jd) - 0.5;
  const H = (jd - jd0) * 24; // Universal time in hours
  const T0 = (jd0 - 2451545.0) / 36525.0;

  let GMST = 6.697374558 + 2400.0513369 * T0 + 0.0000258622 * T0 * T0 -
    0.0000000017222 * T0 * T0 * T0 + 1.0027379093 * H;

  GMST = ((GMST % 24) + 24) % 24; // hours
  const GAST = GMST; // simplified (nutation in RA negligible for our purposes)

  const LST = (GAST * 15 + longitude + 360) % 360;
  return LST;
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
