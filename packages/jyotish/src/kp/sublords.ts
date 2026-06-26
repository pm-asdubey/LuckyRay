/**
 * KP Star Lord / Sub Lord / Sub-Sub Lord table.
 *
 * Krishnamurti Paddhati divides each nakshatra (13°20') into 9 sub-lords
 * proportional to the Vimshottari Dasha years. The sequence starts with the
 * nakshatra lord itself, then continues in the standard Vimshottari order.
 *
 * Vimshottari sequence: Ke → Ve → Su → Mo → Ma → Ra → Ju → Sa → Me
 * Dasha years:           7    20    6    10    7    18   16   19   17  = 120
 *
 * Each nakshatra spans 13.3333° = 800 arc-minutes.
 * Sub-lord span = (dasha_years / 120) × 800 arc-min = sub arc-minutes
 *
 * References:
 *   K.S. Krishnamurti, "Krishnamurti Padhdhati" (1968)
 *   Sub-lord span table: widely validated across KP software
 */

import type { PlanetId } from '@luckyray/shared';

// ─── Constants ─────────────────────────────────────────────────────────────

const D2R = Math.PI / 180;

const NAKSHATRA_SPAN = 360 / 27;          // 13.3333...°
const TOTAL_DASHA_YEARS = 120;

// Vimshottari sequence and years
const VIMSHOTTARI: Array<{ planet: PlanetId; years: number }> = [
  { planet: 'Ketu',    years: 7  },
  { planet: 'Venus',   years: 20 },
  { planet: 'Sun',     years: 6  },
  { planet: 'Moon',    years: 10 },
  { planet: 'Mars',    years: 7  },
  { planet: 'Rahu',    years: 18 },
  { planet: 'Jupiter', years: 16 },
  { planet: 'Saturn',  years: 19 },
  { planet: 'Mercury', years: 17 },
];

// Nakshatra lords in order (0=Ashwini → 26=Revati)
// Vimshottari assigns: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, then repeats
const NAKSHATRA_LORDS: PlanetId[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', // 0-8
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', // 9-17
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', // 18-26
];

// ─── Sub-lord Span Table ──────────────────────────────────────────────────

// Precomputed sub-lord spans in degrees (relative start within a nakshatra)
function buildSubSpans(): Array<{ planet: PlanetId; span: number }> {
  return VIMSHOTTARI.map(v => ({
    planet: v.planet,
    span: (v.years / TOTAL_DASHA_YEARS) * NAKSHATRA_SPAN,
  }));
}

const SUB_SPANS = buildSubSpans();

// ─── Main Lookup ──────────────────────────────────────────────────────────

export interface KPLordship {
  nakshatraIndex: number;
  nakshatraLord: PlanetId;
  subLord: PlanetId;
  subSubLord: PlanetId;
  degreesInNakshatra: number;  // 0–13.333
}

/**
 * Given a sidereal longitude (0–360), return the KP star lord, sub lord,
 * and sub-sub lord.
 *
 * Algorithm:
 *   1. nakshatra_index = floor(lon / 13.333)
 *   2. position_within_nakshatra = lon % 13.333
 *   3. sub-lord sequence starts from the nakshatra lord, cycling through
 *      the Vimshottari order
 *   4. Walk the sub-spans until the position is found
 */
export function getKPLordship(siderealLon: number): KPLordship {
  const lon = ((siderealLon % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN) % 27;
  const nakshatraLord = NAKSHATRA_LORDS[nakshatraIndex]!;
  const posInNakshatra = lon - nakshatraIndex * NAKSHATRA_SPAN;

  // Find the starting index in VIMSHOTTARI sequence for this nakshatra lord
  const startIdx = VIMSHOTTARI.findIndex(v => v.planet === nakshatraLord);

  // Walk sub spans using SUB_SPANS (which has pre-computed degree spans)
  let accumulated = 0;
  let subLord: PlanetId = nakshatraLord;

  for (let i = 0; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const vi = VIMSHOTTARI[idx]!;
    const ss = SUB_SPANS[idx]!;
    const spanEnd = accumulated + ss.span;
    if (posInNakshatra < spanEnd || i === 8) {
      subLord = vi.planet;
      // Find sub-sub lord within this sub
      const posInSub = posInNakshatra - accumulated;
      const subLordIdx = idx;
      let subAccumulated = 0;
      let subSubLord: PlanetId = vi.planet;
      for (let j = 0; j < 9; j++) {
        const jIdx = (subLordIdx + j) % 9;
        const vj = VIMSHOTTARI[jIdx]!;
        const ssj = SUB_SPANS[jIdx]!;
        const subSubSpan = (vj.years / TOTAL_DASHA_YEARS) * ss.span;
        subAccumulated += subSubSpan;
        if (posInSub < subAccumulated || j === 8) {
          subSubLord = vj.planet;
          break;
        }
      }
      return {
        nakshatraIndex,
        nakshatraLord,
        subLord,
        subSubLord,
        degreesInNakshatra: posInNakshatra,
      };
    }
    accumulated = spanEnd;
  }

  // Fallback (should never reach here)
  return { nakshatraIndex, nakshatraLord, subLord, subSubLord: subLord, degreesInNakshatra: posInNakshatra };
}

/**
 * Return the nakshatra lord for a given sidereal longitude.
 */
export function getNakshatraLord(siderealLon: number): PlanetId {
  const lon = ((siderealLon % 360) + 360) % 360;
  const idx = Math.floor(lon / NAKSHATRA_SPAN) % 27;
  return NAKSHATRA_LORDS[idx]!;
}

export { NAKSHATRA_LORDS };
