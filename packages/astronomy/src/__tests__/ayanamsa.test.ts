/**
 * Lahiri Ayanamsa Calculation Tests
 *
 * Tests against known reference values:
 * - Lahiri ayanamsa at J1900.0 = 22.46047°
 * - At J2000.0 = approximately 23.85°
 * - Precesses at ~50.29"/year
 */

import { describe, it, expect } from 'vitest';
import { computeLahiriAyanamsa, dateToJulianDay, julianDayToDate } from '../ayanamsa';

// Known reference: J1900.0 = Julian Day 2415020.0
const J1900 = 2415020.0;

// J2000.0 = Julian Day 2451545.0
const J2000 = 2451545.0;

describe('computeLahiriAyanamsa', () => {
  it('returns base value at J1900.0', () => {
    // Lahiri base = 22.46047° at J1900.0
    const ayanamsa = computeLahiriAyanamsa(J1900);
    expect(ayanamsa).toBeCloseTo(22.46047, 2);
  });

  it('returns approximately 23.85° at J2000.0', () => {
    // Standard reference: Lahiri at J2000 ≈ 23.85°
    const ayanamsa = computeLahiriAyanamsa(J2000);
    expect(ayanamsa).toBeGreaterThan(23.5);
    expect(ayanamsa).toBeLessThan(24.2);
  });

  it('increases monotonically over time', () => {
    const a1900 = computeLahiriAyanamsa(J1900);
    const a1950 = computeLahiriAyanamsa(J1900 + 50 * 365.25);
    const a2000 = computeLahiriAyanamsa(J2000);
    const a2050 = computeLahiriAyanamsa(J2000 + 50 * 365.25);

    expect(a1950).toBeGreaterThan(a1900);
    expect(a2000).toBeGreaterThan(a1950);
    expect(a2050).toBeGreaterThan(a2000);
  });

  it('precesses at approximately 50.29 arcseconds per year', () => {
    const a2000 = computeLahiriAyanamsa(J2000);
    const a2001 = computeLahiriAyanamsa(J2000 + 365.25);

    const precessionDegrees = a2001 - a2000;
    const precessionArcseconds = precessionDegrees * 3600;

    // Lahiri precession rate: approximately 50.29 arcseconds/year
    expect(precessionArcseconds).toBeGreaterThan(49.5);
    expect(precessionArcseconds).toBeLessThan(51.0);
  });

  it('works for historical dates (pre-1900)', () => {
    // Should not throw for historical dates
    const jd1800 = J1900 - 100 * 365.25;
    expect(() => computeLahiriAyanamsa(jd1800)).not.toThrow();
    const ayanamsa = computeLahiriAyanamsa(jd1800);
    expect(ayanamsa).toBeGreaterThan(21.0);
    expect(ayanamsa).toBeLessThan(23.0);
  });

  it('is within valid range for 20th-21st century', () => {
    for (let year = 1900; year <= 2050; year += 10) {
      const jd = dateToJulianDay(new Date(`${year}-06-15T12:00:00Z`));
      const ayanamsa = computeLahiriAyanamsa(jd);
      expect(ayanamsa).toBeGreaterThan(20);
      expect(ayanamsa).toBeLessThan(27);
    }
  });
});

describe('dateToJulianDay', () => {
  it('returns correct JD for J2000 epoch', () => {
    // J2000.0 = 2000-01-01 12:00 UTC = JD 2451545.0
    const jd = dateToJulianDay(new Date('2000-01-01T12:00:00Z'));
    expect(jd).toBeCloseTo(2451545.0, 2);
  });

  it('returns correct JD for J1900 epoch', () => {
    // J1900.0 = 1900-Jan-0.5 = 1899-Dec-31 12:00 UTC = JD 2415020.0
    // 1900-Jan-01 12:00 UTC = JD 2415021.0
    const jd = dateToJulianDay(new Date('1900-01-01T12:00:00Z'));
    expect(jd).toBeCloseTo(2415021.0, 1);
  });

  it('is monotonically increasing', () => {
    const dates = ['1990-01-01', '1995-06-15', '2000-01-01', '2010-03-20', '2023-12-31'];
    const jds = dates.map(d => dateToJulianDay(new Date(`${d}T00:00:00Z`)));
    for (let i = 1; i < jds.length; i++) {
      expect(jds[i]!).toBeGreaterThan(jds[i - 1]!);
    }
  });

  it('differs by 1 for consecutive days', () => {
    const jd1 = dateToJulianDay(new Date('2000-01-01T12:00:00Z'));
    const jd2 = dateToJulianDay(new Date('2000-01-02T12:00:00Z'));
    expect(jd2 - jd1).toBeCloseTo(1.0, 4);
  });
});

describe('julianDayToDate', () => {
  it('round-trips correctly', () => {
    const original = new Date('1990-06-15T14:30:00Z');
    const jd = dateToJulianDay(original);
    const restored = julianDayToDate(jd);

    // Should be within 1 minute
    const diffMs = Math.abs(original.getTime() - restored.getTime());
    expect(diffMs).toBeLessThan(60000);
  });

  it('restores J2000 epoch correctly', () => {
    const date = julianDayToDate(J2000);
    expect(date.getUTCFullYear()).toBe(2000);
    expect(date.getUTCMonth()).toBe(0); // January
    expect(date.getUTCDate()).toBe(1);
  });
});
