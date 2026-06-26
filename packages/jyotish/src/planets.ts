/**
 * Jyotish planet classification and dignity calculations.
 *
 * Implements Parashari rules for planetary dignity, friendship,
 * combustion, and other planet-specific attributes.
 */

import type { PlanetId, FriendshipStatus } from '@luckyray/shared';
import type { PlanetPosition, PlanetDignity } from '@luckyray/shared';
import {
  SIGN_LORDS, NATURAL_BENEFICS, NATURAL_MALEFICS,
  EXALTATION_SIGN, DEBILITATION_SIGN, MOOLATRIKONA,
  NATURAL_FRIENDSHIPS, PLANET_SYMBOLS, PLANET_SANSKRIT, NAKSHATRA_LORDS,
  PLANET_IDS,
} from '@luckyray/shared';
import {
  NAKSHATRA_DEGREES, PADA_DEGREES, NAKSHATRA_NAMES,
} from '@luckyray/shared';
import { SIGN_IDS } from '@luckyray/shared';
import type { RawPlanetPosition } from '@luckyray/astronomy';
import type { NakshatraName } from '@luckyray/shared';

/**
 * Combustion orbs (degrees of tropical proximity to Sun).
 * Source: Parashari standard orbs.
 */
const COMBUSTION_ORBS: Partial<Record<PlanetId, number>> = {
  Moon:    12,
  Mars:     8,
  Mercury:  6, // 14 degrees if direct, 12 if retrograde — using 6 as conservative
  Jupiter:  8,
  Venus:   10,
  Saturn:  15,
  Rahu:     0, // Nodes are not combusted
  Ketu:     0,
};

/**
 * Build the complete PlanetPosition object from raw astronomical data.
 */
export function buildPlanetPosition(
  raw: RawPlanetPosition,
  houseOf: (signIndex: number) => number,
  allRawPlanets: RawPlanetPosition[],
): PlanetPosition {
  const id = raw.name as PlanetId;
  const siderealLong = raw.siderealLongitude;

  const signIndex = Math.floor(siderealLong / 30) % 12;
  const sign = SIGN_IDS[signIndex]!;
  const degreesInSign = siderealLong % 30;
  const minutesInSign = (degreesInSign % 1) * 60;

  const nakshatraIndex = Math.floor(siderealLong / NAKSHATRA_DEGREES) % 27;
  const nakshatra: NakshatraName = NAKSHATRA_NAMES[nakshatraIndex]!;
  const pada = Math.floor((siderealLong % NAKSHATRA_DEGREES) / PADA_DEGREES) + 1;

  const house = houseOf(signIndex);

  // Dignity calculations
  const isExalted = EXALTATION_SIGN[id] === signIndex;
  const isDebilitated = DEBILITATION_SIGN[id] === signIndex;
  const isInOwnSign = SIGN_LORDS[signIndex] === id;
  const moolatrikonaRange = MOOLATRIKONA[id];
  const isInMoolatrikona = moolatrikonaRange !== undefined &&
    moolatrikonaRange.sign === signIndex &&
    degreesInSign >= moolatrikonaRange.from &&
    degreesInSign < moolatrikonaRange.to;

  // Combustion: check proximity to Sun (sidereal)
  const sunRaw = allRawPlanets.find(p => p.name === 'Sun');
  const isCombust = checkCombustion(id, siderealLong, sunRaw?.siderealLongitude ?? 0);

  const dignity = computeDignity(
    id, signIndex, isExalted, isDebilitated, isInOwnSign, isInMoolatrikona,
  );

  // Friendships: temporary + compound (simplified for MVP)
  const friendships: Partial<Record<PlanetId, FriendshipStatus>> = {};
  for (const otherId of PLANET_IDS) {
    if (otherId !== id) {
      friendships[otherId] = NATURAL_FRIENDSHIPS[id]?.[otherId] ?? 'neutral';
    }
  }

  return {
    id,
    name: id,
    sanskritName: PLANET_SANSKRIT[id] ?? id,
    symbol: PLANET_SYMBOLS[id] ?? '',
    tropicalLongitude: raw.tropicalLongitude,
    siderealLongitude: siderealLong,
    latitude: raw.latitude,
    sign,
    signIndex,
    house,
    degreesInSign: Math.floor(degreesInSign),
    minutesInSign: Math.floor(minutesInSign),
    nakshatra,
    nakshatraIndex,
    pada,
    isRetrograde: raw.isRetrograde,
    isCombust,
    isExalted,
    isDebilitated,
    isInOwnSign,
    isInMoolatrikona,
    naturalBenefic: (NATURAL_BENEFICS as readonly string[]).includes(id),
    naturalMalefic: (NATURAL_MALEFICS as readonly string[]).includes(id),
    dignity,
    friendships,
  };
}

function checkCombustion(
  id: PlanetId,
  siderealLong: number,
  sunSiderealLong: number,
): boolean {
  if (id === 'Sun' || id === 'Rahu' || id === 'Ketu') return false;
  const orb = COMBUSTION_ORBS[id];
  if (orb === undefined || orb === 0) return false;

  let diff = Math.abs(siderealLong - sunSiderealLong);
  if (diff > 180) diff = 360 - diff;
  return diff <= orb;
}

function computeDignity(
  id: PlanetId,
  signIndex: number,
  isExalted: boolean,
  isDebilitated: boolean,
  isInOwnSign: boolean,
  isInMoolatrikona: boolean,
): PlanetDignity {
  if (isExalted) return 'Exalted';
  if (isInMoolatrikona) return 'Moolatrikona';
  if (isInOwnSign) return 'OwnSign';
  if (isDebilitated) return 'Debilitated';

  const signLord = SIGN_LORDS[signIndex];
  if (signLord === undefined) return 'NeutralSign';
  const friendship = NATURAL_FRIENDSHIPS[id]?.[signLord];

  if (friendship === 'friend') return 'FriendlySign';
  if (friendship === 'enemy') return 'EnemySign';
  return 'NeutralSign';
}

/**
 * Get the lord of a nakshatra by its index.
 */
export function getNakshatraLord(nakshatraIndex: number): PlanetId {
  return NAKSHATRA_LORDS[nakshatraIndex % 27] ?? 'Ketu';
}
