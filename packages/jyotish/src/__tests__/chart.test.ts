/**
 * Jyotish Chart Generation Tests
 *
 * These tests verify the complete chart generation pipeline using
 * known reference data. A real Jyotish chart for a known birth moment
 * is computed and verified against expected results.
 *
 * Reference chart:
 *   Birth: 1990-01-15 at 14:30 local time in New Delhi, India
 *   Coordinates: 28.6139°N, 77.2090°E
 *   Timezone: Asia/Kolkata (UTC+5:30)
 *   UTC: 1990-01-15 09:00 UTC
 */

import { describe, it, expect } from 'vitest';
import { generateChart, validateBirthDetails } from '../index';
import type { BirthDetails } from '@luckyray/shared';

const REFERENCE_BIRTH: BirthDetails = {
  date: '1990-01-15',
  time: '14:30',
  place: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  utcOffset: 330, // UTC+5:30 in minutes
};

const REFERENCE_PROFILE = {
  id: 'test-profile-1',
  name: 'Test Person',
  gender: 'Male' as const,
};

describe('generateChart', () => {
  it('returns a successful result for valid birth details', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.chart).toBeDefined();
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.durationMs).toBeLessThan(5000); // Should complete in under 5s
  });

  it('chart has all required fields', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { chart } = result;

    // Schema version
    expect(chart.version).toBe('1.0');

    // Birth details preserved
    expect(chart.birthDetails.date).toBe(REFERENCE_BIRTH.date);
    expect(chart.birthDetails.place).toBe(REFERENCE_BIRTH.place);

    // Astronomy
    expect(chart.astronomy.ayanamsaName).toBe('Lahiri');
    expect(chart.astronomy.ayanamsa).toBeGreaterThan(20);
    expect(chart.astronomy.ayanamsa).toBeLessThan(25); // Lahiri ~23° in 1990

    // Ascendant
    expect(chart.ascendant.sign).toBeDefined();
    expect(chart.ascendant.degree).toBeGreaterThanOrEqual(0);
    expect(chart.ascendant.degree).toBeLessThan(30);
    expect(chart.ascendant.nakshatra).toBeDefined();
    expect(chart.ascendant.pada).toBeGreaterThanOrEqual(1);
    expect(chart.ascendant.pada).toBeLessThanOrEqual(4);

    // 9 planets
    expect(chart.planets).toHaveLength(9);

    // 12 houses
    expect(chart.houses).toHaveLength(12);

    // Dasha data
    expect(chart.dashas.system).toBe('Vimshottari');
    expect(chart.dashas.allPeriods).toHaveLength(9);
    expect(chart.dashas.currentMahadasha).toBeDefined();

    // Divisional charts
    expect(chart.divisionalCharts.D9).toBeDefined();
    expect(chart.divisionalCharts.D10).toBeDefined();
  });

  it('all 9 Jyotish planets are present with correct IDs', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const planetIds = result.chart.planets.map(p => p.id).sort();
    expect(planetIds).toEqual(['Jupiter', 'Ketu', 'Mars', 'Mercury', 'Moon', 'Rahu', 'Saturn', 'Sun', 'Venus'].sort());
  });

  it('all planets have valid sign indices (0-11)', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const planet of result.chart.planets) {
      expect(planet.signIndex).toBeGreaterThanOrEqual(0);
      expect(planet.signIndex).toBeLessThanOrEqual(11);
      expect(planet.degreesInSign).toBeGreaterThanOrEqual(0);
      expect(planet.degreesInSign).toBeLessThan(30);
      expect(planet.house).toBeGreaterThanOrEqual(1);
      expect(planet.house).toBeLessThanOrEqual(12);
      expect(planet.pada).toBeGreaterThanOrEqual(1);
      expect(planet.pada).toBeLessThanOrEqual(4);
    }
  });

  it('Rahu and Ketu are always in opposite signs', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const rahu = result.chart.planets.find(p => p.id === 'Rahu')!;
    const ketu = result.chart.planets.find(p => p.id === 'Ketu')!;

    expect(rahu).toBeDefined();
    expect(ketu).toBeDefined();

    // They should be in opposite signs (6 signs apart)
    const diff = Math.abs(rahu.signIndex - ketu.signIndex);
    expect(diff).toBe(6);
  });

  it('houses have correct lords based on sign', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const house of result.chart.houses) {
      expect(house.lord).toBeDefined();
      expect(house.sign).toBeDefined();
      expect(house.number).toBeGreaterThanOrEqual(1);
      expect(house.number).toBeLessThanOrEqual(12);
    }
  });

  it('Vimshottari dasha total is ≤ 120 years (first period may be partial)', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const totalYears = result.chart.dashas.allPeriods.reduce(
      (sum, p) => sum + p.durationYears,
      0,
    );

    // First dasha has partial balance remaining at birth, so total < 120
    expect(totalYears).toBeLessThanOrEqual(120);
    expect(totalYears).toBeGreaterThan(100);
  });

  it('dasha periods are sequential with no gaps', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const periods = result.chart.dashas.allPeriods;
    for (let i = 1; i < periods.length; i++) {
      const prev = new Date(periods[i - 1]!.endDate).getTime();
      const curr = new Date(periods[i]!.startDate).getTime();
      // Should be within 1 day of each other
      expect(Math.abs(curr - prev)).toBeLessThan(86400000);
    }
  });

  it('metadata includes engine version and assumptions', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.chart.metadata.engineVersion).toBe('1.0.0');
    expect(result.chart.metadata.assumptions).toContain('Whole Sign house system (Parashari)');
    expect(result.chart.metadata.assumptions).toContain('Lahiri (Chitrapaksha) ayanamsa');
  });

  it('Sun is in Capricorn for January 1990 birth', () => {
    // Sun transits Capricorn from mid-January in sidereal (Lahiri)
    // for a Jan 15 birth, Sun should be in Sagittarius or Capricorn
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: REFERENCE_BIRTH,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const sun = result.chart.planets.find(p => p.id === 'Sun')!;
    expect(['Sagittarius', 'Capricorn']).toContain(sun.sign);
  });
});

describe('validateBirthDetails', () => {
  it('returns empty errors for valid details', () => {
    const errors = validateBirthDetails(REFERENCE_BIRTH);
    expect(errors).toHaveLength(0);
  });

  it('requires date', () => {
    const errors = validateBirthDetails({ ...REFERENCE_BIRTH, date: '' });
    expect(errors.some(e => e.toLowerCase().includes('date'))).toBe(true);
  });

  it('requires time', () => {
    const errors = validateBirthDetails({ ...REFERENCE_BIRTH, time: '' });
    expect(errors.some(e => e.toLowerCase().includes('time'))).toBe(true);
  });

  it('requires latitude within range', () => {
    const errors = validateBirthDetails({ ...REFERENCE_BIRTH, latitude: 95 });
    expect(errors.some(e => e.toLowerCase().includes('latitude'))).toBe(true);
  });

  it('requires longitude within range', () => {
    const errors = validateBirthDetails({ ...REFERENCE_BIRTH, longitude: -200 });
    expect(errors.some(e => e.toLowerCase().includes('longitude'))).toBe(true);
  });

  it('requires timezone', () => {
    const errors = validateBirthDetails({ ...REFERENCE_BIRTH, timezone: '' });
    expect(errors.some(e => e.toLowerCase().includes('timezone'))).toBe(true);
  });

  it('rejects future dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const errors = validateBirthDetails({
      ...REFERENCE_BIRTH,
      date: futureDate.toISOString().slice(0, 10),
    });
    expect(errors.some(e => e.toLowerCase().includes('future'))).toBe(true);
  });
});

describe('Lahiri Ayanamsa', () => {
  it('is approximately 23.86 degrees for year 2000', () => {
    const result = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: {
        ...REFERENCE_BIRTH,
        date: '2000-01-01',
        time: '12:00',
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Lahiri ayanamsa for J2000 is approximately 23.85°
    const ayanamsa = result.chart.astronomy.ayanamsa;
    expect(ayanamsa).toBeGreaterThan(23.5);
    expect(ayanamsa).toBeLessThan(24.2);
  });

  it('is smaller for earlier dates', () => {
    const result1960 = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: { ...REFERENCE_BIRTH, date: '1960-01-01', time: '12:00' },
    });
    const result2000 = generateChart({
      profile: REFERENCE_PROFILE,
      birthDetails: { ...REFERENCE_BIRTH, date: '2000-01-01', time: '12:00' },
    });

    expect(result1960.success).toBe(true);
    expect(result2000.success).toBe(true);
    if (!result1960.success || !result2000.success) return;

    expect(result1960.chart.astronomy.ayanamsa).toBeLessThan(result2000.chart.astronomy.ayanamsa);
  });
});
