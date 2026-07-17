/**
 * Manglik Dosh Weighted Scoring Engine.
 *
 * A deterministic, reproducible score for Manglik Dosha based on the
 * positions of Mars, Saturn, Rahu, Ketu, and Sun relative to the
 * Ascendant, Moon, and Venus.
 *
 * Sign numbering follows the conventional 1–12 scale:
 *   1 Mesh, 2 Vrishabh, 3 Mithun, 4 Kark, 5 Simha, 6 Kanya,
 *   7 Tula, 8 Vrishchik, 9 Dhanu, 10 Makar, 11 Kumbh, 12 Meen.
 *
 * Reference data and score table are fixed; no AI or runtime judgment is used.
 */

import type { PlanetPosition } from '@luckyray/shared';

// ─── Sign conventions (1–12) ─────────────────────────────────────────────────

const SIGN_LORDS_1_12: Record<number, PlanetId> = {
  1: 'Mars',      // Mesh
  2: 'Venus',     // Vrishabh
  3: 'Mercury',   // Mithun
  4: 'Moon',      // Kark
  5: 'Sun',       // Simha
  6: 'Mercury',   // Kanya
  7: 'Venus',     // Tula
  8: 'Mars',      // Vrishchik
  9: 'Jupiter',   // Dhanu
  10: 'Saturn',   // Makar
  11: 'Saturn',   // Kumbh
  12: 'Jupiter',  // Meen
};

type PlanetId = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

type ScoredPlanet = 'Mars' | 'Saturn' | 'Rahu' | 'Ketu' | 'Sun';
type ReferencePoint = 'Lagna' | 'Moon' | 'Venus';
type HouseGroup = '1,7,8' | '2,4,12';
type DignityTier =
  | 'Uchcha (Exalted)'
  | 'Moolatrikona'
  | 'Swagrahi (Own)'
  | 'Adhimitra (Great Friend)'
  | 'Sama (Neutral)'
  | 'Shatru (Enemy)'
  | 'Neech (Debilitated)';

interface ScoreTable {
  [dignity: string]: {
    [group in HouseGroup]: {
      Mangal: number;
      'Shani-Rahu-Ketu': number;
      Surya: number;
    };
  };
}

// ─── Reference data ──────────────────────────────────────────────────────────

const EXALTATION_SIGNS: Record<ScoredPlanet, number> = {
  Sun: 1,    // Surya exalted in Mesh
  Mars: 10,  // Mangal exalted in Makar
  Saturn: 7, // Shani exalted in Tula
  Rahu: 3,   // Rahu exalted in Mithun
  Ketu: 9,   // Ketu exalted in Dhanu
};

const MOOLATRIKONA_SIGNS: Partial<Record<ScoredPlanet, number>> = {
  Sun: 5,    // Simha
  Mars: 1,   // Mesh
  Saturn: 11 // Kumbh
  // Rahu and Ketu have no moolatrikona
};

const OWN_SIGNS: Record<ScoredPlanet, number[]> = {
  Sun: [5],          // Simha
  Mars: [1, 8],      // Mesh, Vrishchik
  Saturn: [10, 11],  // Makar, Kumbh
  Rahu: [],          // no own sign
  Ketu: [],          // no own sign
};

const FRIENDS: Record<ScoredPlanet, PlanetId[]> = {
  Sun: ['Moon', 'Mars', 'Jupiter'],
  Mars: ['Sun', 'Moon', 'Jupiter'],
  Saturn: ['Mercury', 'Venus'],
  Rahu: ['Mercury', 'Venus'], // uses Shani's grid
  Ketu: ['Mercury', 'Venus'], // uses Shani's grid
};

const ENEMIES: Record<ScoredPlanet, PlanetId[]> = {
  Sun: ['Venus', 'Saturn'],
  Mars: ['Mercury'],
  Saturn: ['Sun', 'Moon', 'Mars'],
  Rahu: ['Sun', 'Moon', 'Mars'], // uses Shani's grid
  Ketu: ['Sun', 'Moon', 'Mars'], // uses Shani's grid
};

const SCORE_TABLE: ScoreTable = {
  'Uchcha (Exalted)': {
    '1,7,8': { Mangal: 144, 'Shani-Rahu-Ketu': 96, Surya: 24 },
    '2,4,12': { Mangal: 36, 'Shani-Rahu-Ketu': 24, Surya: 12 },
  },
  'Moolatrikona': {
    '1,7,8': { Mangal: 108, 'Shani-Rahu-Ketu': 72, Surya: 18 },
    '2,4,12': { Mangal: 27, 'Shani-Rahu-Ketu': 18, Surya: 9 },
  },
  'Swagrahi (Own)': {
    '1,7,8': { Mangal: 96, 'Shani-Rahu-Ketu': 64, Surya: 16 },
    '2,4,12': { Mangal: 24, 'Shani-Rahu-Ketu': 16, Surya: 8 },
  },
  'Adhimitra (Great Friend)': {
    '1,7,8': { Mangal: 42, 'Shani-Rahu-Ketu': 28, Surya: 7 },
    '2,4,12': { Mangal: 11, 'Shani-Rahu-Ketu': 7, Surya: 4 },
  },
  'Sama (Neutral)': {
    '1,7,8': { Mangal: 108, 'Shani-Rahu-Ketu': 72, Surya: 18 },
    '2,4,12': { Mangal: 28, 'Shani-Rahu-Ketu': 18, Surya: 10 },
  },
  'Shatru (Enemy)': {
    '1,7,8': { Mangal: 174, 'Shani-Rahu-Ketu': 116, Surya: 29 },
    '2,4,12': { Mangal: 44, 'Shani-Rahu-Ketu': 29, Surya: 15 },
  },
  'Neech (Debilitated)': {
    '1,7,8': { Mangal: 192, 'Shani-Rahu-Ketu': 128, Surya: 32 },
    '2,4,12': { Mangal: 48, 'Shani-Rahu-Ketu': 32, Surya: 16 },
  },
};

const REFERENCE_WEIGHTS: Record<ReferencePoint, number> = {
  Lagna: 1.0,
  Moon: 0.5,
  Venus: 0.25,
};

// ─── Public types ────────────────────────────────────────────────────────────

export interface ManglikScoreDetail {
  reference: ReferencePoint;
  occupiedSign: number; // 1–12
  house: number;        // 1–12
  houseGroup: HouseGroup | null;
  dignity: DignityTier;
  rawScore: number;
  weight: number;
  weightedScore: number;
}

export interface ManglikPlanetScore {
  planet: ScoredPlanet;
  details: ManglikScoreDetail[];
  subtotal: number;
}

export interface ManglikScoreResult {
  input: {
    lagnaSign: number;
    moonSign: number;
    venusSign: number;
    marsSign: number;
    saturnSign: number;
    rahuSign: number;
    ketuSign: number;
    sunSign: number;
  };
  planets: ManglikPlanetScore[];
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mod12(n: number): number {
  return ((n - 1 + 12) % 12) + 1;
}

/**
 * House counted from a reference sign.
 * If reference sign = Mesh (1) and planet sign = Vrishabh (2), house = 2.
 */
function houseFrom(referenceSign: number, planetSign: number): number {
  return mod12(planetSign - referenceSign + 1);
}

function getHouseGroup(house: number): HouseGroup | null {
  if ([1, 7, 8].includes(house)) return '1,7,8';
  if ([2, 4, 12].includes(house)) return '2,4,12';
  return null;
}

function getDignity(planet: ScoredPlanet, occupiedSign: number): DignityTier {
  if (occupiedSign === EXALTATION_SIGNS[planet]) return 'Uchcha (Exalted)';

  const debilitationSign = mod12(EXALTATION_SIGNS[planet] + 6);
  if (occupiedSign === debilitationSign) return 'Neech (Debilitated)';

  if (MOOLATRIKONA_SIGNS[planet] === occupiedSign) return 'Moolatrikona';

  if (OWN_SIGNS[planet].includes(occupiedSign)) return 'Swagrahi (Own)';

  const signLord = SIGN_LORDS_1_12[occupiedSign];
  if (!signLord) return 'Sama (Neutral)';

  if (FRIENDS[planet].includes(signLord)) return 'Adhimitra (Great Friend)';
  if (ENEMIES[planet].includes(signLord)) return 'Shatru (Enemy)';
  return 'Sama (Neutral)';
}

function getColumn(planet: ScoredPlanet): 'Mangal' | 'Shani-Rahu-Ketu' | 'Surya' {
  if (planet === 'Mars') return 'Mangal';
  if (planet === 'Sun') return 'Surya';
  return 'Shani-Rahu-Ketu';
}

function lookupRawScore(
  planet: ScoredPlanet,
  dignity: DignityTier,
  group: HouseGroup | null,
): number {
  if (!group) return 0;
  const column = getColumn(planet);
  return SCORE_TABLE[dignity]![group]![column]!;
}

function scorePlanetFromReference(
  planet: ScoredPlanet,
  occupiedSign: number,
  referenceSign: number,
  reference: ReferencePoint,
): ManglikScoreDetail {
  const house = houseFrom(referenceSign, occupiedSign);
  const group = getHouseGroup(house);
  const dignity = getDignity(planet, occupiedSign);
  const weight = REFERENCE_WEIGHTS[reference];
  const rawScore = lookupRawScore(planet, dignity, group);
  const weightedScore = rawScore * weight;

  return {
    reference,
    occupiedSign,
    house,
    houseGroup: group,
    dignity,
    rawScore,
    weight,
    weightedScore,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ManglikScoreInput {
  lagnaSign: number;  // 1–12
  moonSign: number;   // 1–12
  venusSign: number;  // 1–12
  marsSign: number;   // 1–12
  saturnSign: number; // 1–12
  rahuSign: number;   // 1–12
  ketuSign: number;   // 1–12
  sunSign: number;    // 1–12
}

/**
 * Compute the full Manglik Dosh weighted score from sign indices (1–12).
 */
export function computeManglikScore(input: ManglikScoreInput): ManglikScoreResult {
  const references: { point: ReferencePoint; sign: number }[] = [
    { point: 'Lagna', sign: input.lagnaSign },
    { point: 'Moon', sign: input.moonSign },
    { point: 'Venus', sign: input.venusSign },
  ];

  const planetSigns: { planet: ScoredPlanet; sign: number }[] = [
    { planet: 'Mars', sign: input.marsSign },
    { planet: 'Saturn', sign: input.saturnSign },
    { planet: 'Rahu', sign: input.rahuSign },
    { planet: 'Ketu', sign: input.ketuSign },
    { planet: 'Sun', sign: input.sunSign },
  ];

  const planets: ManglikPlanetScore[] = planetSigns.map(({ planet, sign }) => {
    const details = references.map(ref =>
      scorePlanetFromReference(planet, sign, ref.sign, ref.point),
    );
    const subtotal = details.reduce((sum, d) => sum + d.weightedScore, 0);
    return { planet, details, subtotal };
  });

  const total = planets.reduce((sum, p) => sum + p.subtotal, 0);

  return {
    input,
    planets,
    total,
  };
}

/**
 * Convenience wrapper: compute Manglik score from a chart's planet positions.
 * Internally converts 0-based sign indices to 1-based.
 */
export function computeManglikScoreFromPlanets(
  lagnaSignIndex: number,
  moon: PlanetPosition,
  venus: PlanetPosition,
  mars: PlanetPosition,
  saturn: PlanetPosition,
  rahu: PlanetPosition,
  ketu: PlanetPosition,
  sun: PlanetPosition,
): ManglikScoreResult {
  return computeManglikScore({
    lagnaSign: lagnaSignIndex + 1,
    moonSign: moon.signIndex + 1,
    venusSign: venus.signIndex + 1,
    marsSign: mars.signIndex + 1,
    saturnSign: saturn.signIndex + 1,
    rahuSign: rahu.signIndex + 1,
    ketuSign: ketu.signIndex + 1,
    sunSign: sun.signIndex + 1,
  });
}
