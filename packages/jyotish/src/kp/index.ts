/**
 * KP (Krishnamurti Paddhati) Engine — main orchestrator.
 *
 * Computes KPData from:
 * - rawAscendantTropical (from astronomy layer)
 * - ramcDeg, obliquityDeg (from astronomy layer)
 * - planets with sidereal longitudes (from jyotish layer)
 * - dashas (from jyotish layer)
 * - birthDetails (latitude, longitude, date)
 *
 * Architecture: This module is called from the main generateChart() function
 * after all other calculations are complete.
 */

import type {
  PlanetId, SignId,
  KPData, KPCusp, KPPlanetInfo,
} from '@luckyray/shared';
import { NAKSHATRA_NAMES, NAKSHATRA_DEGREES } from '@luckyray/shared';
import { computePlacidusLongitudes } from './cusps';
import { getKPLordship } from './sublords';
import { computeKPSignificators } from './significators';
import type { PlanetWithHouse } from './significators';

// ─── Sign utilities ───────────────────────────────────────────────────────

const SIGN_IDS: SignId[] = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const SIGN_LORDS: Record<SignId, PlanetId> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const DAY_LORDS: PlanetId[] = [
  'Sun',    // Sunday
  'Moon',   // Monday
  'Mars',   // Tuesday
  'Mercury',// Wednesday
  'Jupiter',// Thursday
  'Venus',  // Friday
  'Saturn', // Saturday
];

function signLord(signIndex: number): PlanetId {
  const sign = SIGN_IDS[signIndex % 12];
  return sign ? SIGN_LORDS[sign] : 'Sun';
}

// ─── Main generator ───────────────────────────────────────────────────────

interface KPInput {
  ascendantTropical: number;
  ramc: number;
  obliquityDeg: number;
  ayanamsa: number;
  latitude: number;
  planets: Array<{
    planet: PlanetId;
    siderealLongitude: number;
  }>;
  birthDate: string; // YYYY-MM-DD (local)
}

export function computeKP(input: KPInput): KPData {
  const { ascendantTropical, ramc, obliquityDeg, ayanamsa, latitude, planets, birthDate } = input;

  // 1. Compute Placidus cusps (tropical longitudes)
  const tropicalCusps = computePlacidusLongitudes(ramc, ascendantTropical, obliquityDeg, latitude);

  // 2. Convert to sidereal
  const siderealCusps = tropicalCusps.map(lon => ((lon - ayanamsa) % 360 + 360) % 360);

  // 3. Build KPCusp objects
  const kpCusps: KPCusp[] = siderealCusps.map((lon, idx) => {
    const signIndex = Math.floor(lon / 30) % 12;
    const degreesInSign = lon % 30;
    const nakshatraIndex = Math.floor(lon / NAKSHATRA_DEGREES) % 27;
    const lords = getKPLordship(lon);
    return {
      house: idx + 1,
      longitude: lon,
      sign: SIGN_IDS[signIndex]!,
      signIndex,
      degreesInSign,
      nakshatra: NAKSHATRA_NAMES[nakshatraIndex]!,
      nakshatraLord: lords.nakshatraLord,
      subLord: lords.subLord,
      subSubLord: lords.subSubLord,
    };
  });

  // 4. Assign Placidus houses to planets
  // A planet is in house H if its sidereal longitude falls between cusp H and cusp H+1
  const planetsWithHouses: PlanetWithHouse[] = planets.map(({ planet, siderealLongitude }) => {
    const lords = getKPLordship(siderealLongitude);

    // Find which Placidus house this planet is in
    let kpHouse = 1;
    for (let h = 1; h <= 12; h++) {
      const cuspStart = siderealCusps[h - 1]!;
      const cuspEnd   = siderealCusps[h % 12]!;
      if (containsLongitude(cuspStart, cuspEnd, siderealLongitude)) {
        kpHouse = h;
        break;
      }
    }

    return {
      planet,
      kpHouse,
      nakshatraLord: lords.nakshatraLord,
      subLord: lords.subLord,
    };
  });

  // 5. KP planet info objects
  const kpPlanets: KPPlanetInfo[] = planetsWithHouses.map(pw => {
    const lords = getKPLordship(planets.find(p => p.planet === pw.planet)!.siderealLongitude);
    return {
      planet: pw.planet,
      house: pw.kpHouse,
      nakshatraLord: lords.nakshatraLord,
      subLord: lords.subLord,
      subSubLord: lords.subSubLord,
    };
  });

  // 6. Cusp sign lords (for significator computation)
  const cuspSignLords: PlanetId[] = kpCusps.map(c => SIGN_LORDS[c.sign]);

  // 7. House significators
  const significators = computeKPSignificators(planetsWithHouses, cuspSignLords);

  // 8. Ruling planets (at time of birth)
  const ascSidereal = siderealCusps[0]!;
  const moonPlanet = planets.find(p => p.planet === 'Moon');
  const moonLon = moonPlanet?.siderealLongitude ?? 0;

  const ascLords = getKPLordship(ascSidereal);
  const moonLords = getKPLordship(moonLon);

  const ascSignLord = signLord(Math.floor(ascSidereal / 30));
  const moonSignLord = signLord(Math.floor(moonLon / 30));

  // Day of week from birth date
  const parts = birthDate.split('-').map(Number);
  const birthDayDate = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
  const dayOfWeek = birthDayDate.getUTCDay(); // 0=Sunday
  const dayLord = DAY_LORDS[dayOfWeek]!;

  return {
    cusps: kpCusps,
    planets: kpPlanets,
    significators,
    rulingPlanets: {
      ascStarLord: ascLords.nakshatraLord,
      ascSubLord: ascLords.subLord,
      ascSignLord,
      moonStarLord: moonLords.nakshatraLord,
      moonSubLord: moonLords.subLord,
      moonSignLord,
      dayLord,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Check if a longitude falls within the arc [start, end), handling 360° wrap.
 */
function containsLongitude(start: number, end: number, lon: number): boolean {
  if (start < end) {
    return lon >= start && lon < end;
  }
  // Wraps around 0°
  return lon >= start || lon < end;
}

export { serializeKPInterpretation } from './interpreter';
