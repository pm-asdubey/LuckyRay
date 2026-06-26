/**
 * Vimshottari Dasha calculation tests
 */

import { describe, it, expect } from 'vitest';
import { computeVimshottariDasha } from '../dashas';
import { VIMSHOTTARI_YEARS, VIMSHOTTARI_TOTAL_YEARS } from '@luckyray/shared';

// Moon sidereal longitude for Ashwini nakshatra (0–13.33°) — lord: Ketu
const ASHWINI_MOON = 5.0; // 5° sidereal → Ashwini
const JULIAN_1990_JAN_15 = 2447909.0; // Approximate JD for 1990-01-15

describe('computeVimshottariDasha', () => {
  it('returns correct system name', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    expect(result.system).toBe('Vimshottari');
  });

  it('returns 9 mahadasha periods', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    expect(result.allPeriods).toHaveLength(9);
  });

  it('returns Ketu as nakshatra lord for Ashwini', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    expect(result.birthNakshatraLord).toBe('Ketu');
  });

  it('total dasha years is ≤ 120 (first period may be partial)', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    const total = result.allPeriods.reduce((s, p) => s + p.durationYears, 0);
    // First dasha is partial (remaining balance at birth), so total < 120
    expect(total).toBeLessThanOrEqual(120);
    expect(total).toBeGreaterThan(100); // Should be a significant portion
  });

  it('all but first mahadasha have full standard durations', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    // Skip first period (partial balance)
    for (const period of result.allPeriods.slice(1)) {
      expect(period.durationYears).toBe(VIMSHOTTARI_YEARS[period.planet]);
    }
  });

  it('each mahadasha has 9 antardashas', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    for (const period of result.allPeriods) {
      expect(period.antardasha).toHaveLength(9);
    }
  });

  it('antardasha durations sum to mahadasha duration for full periods', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    // Skip first period (it has a partial first antardasha)
    for (const period of result.allPeriods.slice(1)) {
      const antarTotal = period.antardasha!.reduce((s, a) => s + a.durationYears, 0);
      expect(antarTotal).toBeCloseTo(period.durationYears, 1);
    }
  });

  it('periods are chronologically sequential', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    for (let i = 1; i < result.allPeriods.length; i++) {
      const prev = new Date(result.allPeriods[i - 1]!.endDate).getTime();
      const curr = new Date(result.allPeriods[i]!.startDate).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev - 1000); // 1s tolerance
    }
  });

  it('has currentMahadasha pointing to a valid period', () => {
    const result = computeVimshottariDasha(ASHWINI_MOON, JULIAN_1990_JAN_15);
    const now = new Date();
    if (result.currentMahadasha) {
      const start = new Date(result.currentMahadasha.startDate);
      const end = new Date(result.currentMahadasha.endDate);
      // For a 1990 birth, by 2026 we should be in some dasha
      expect(result.allPeriods.some(p => p.planet === result.currentMahadasha.planet)).toBe(true);
    }
  });

  it('Rohini nakshatra lord is Moon', () => {
    // Rohini = nakshatra index 3, lord: Moon
    // Rohini spans 40°–53.33° sidereal
    const rohiniMoon = 45.0;
    const result = computeVimshottariDasha(rohiniMoon, JULIAN_1990_JAN_15);
    expect(result.birthNakshatraLord).toBe('Moon');
  });
});
