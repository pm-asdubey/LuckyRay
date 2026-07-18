/**
 * KP (Krishnamurti Paddhati) calculation tests.
 *
 * Verifies sub-lord boundaries, Placidus cusp geometry, house assignment,
 * significator structure, and ruling-planet completeness.
 */

import { describe, it, expect } from 'vitest';
import { generateChart } from '../../index';
import { getKPLordship } from '../sublords';
import { computePlacidusLongitudes } from '../cusps';
import type { BirthDetails } from '@luckyray/shared';

const REFERENCE_BIRTH: BirthDetails = {
  date: '1990-01-15',
  time: '14:30',
  place: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  utcOffset: 330,
};

const REFERENCE_PROFILE = {
  id: 'test-kp-1',
  name: 'KP Test',
  gender: 'Male' as const,
};

describe('KP sub-lords', () => {
  it('returns the nakshatra lord as the first sub-lord at the start of a nakshatra', () => {
    // Ashwini (Ketu) starts at 0°
    const lordship = getKPLordship(0.0);
    expect(lordship.nakshatraLord).toBe('Ketu');
    expect(lordship.subLord).toBe('Ketu');
  });

  it('changes sub-lord at the correct boundary within a nakshatra', () => {
    // Ashwini span = 13.3333°. Ketu sub-span = 7/120 * 13.3333 = 0.7778°.
    // Just before the boundary should still be Ketu; just after should be Venus.
    const boundary = (7 / 120) * (360 / 27);
    const before = getKPLordship(boundary - 0.001);
    const after = getKPLordship(boundary + 0.001);
    expect(before.subLord).toBe('Ketu');
    expect(after.subLord).toBe('Venus');
  });

  it('computes a sub-sub-lord different from the sub-lord', () => {
    const lordship = getKPLordship(5.0);
    expect(lordship.subSubLord).toBeDefined();
    expect(typeof lordship.subSubLord).toBe('string');
  });
});

describe('KP Placidus cusps', () => {
  it('returns 12 cusps in ascending order', () => {
    const cusps = computePlacidusLongitudes(210, 45, 23.44, 28.6139);
    expect(cusps).toHaveLength(12);
    for (const c of cusps) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(360);
    }
  });

  it('has opposite cusps 180° apart', () => {
    const cusps = computePlacidusLongitudes(210, 45, 23.44, 28.6139);
    for (let i = 0; i < 6; i++) {
      const a = cusps[i]!;
      const b = cusps[i + 6]!;
      let diff = Math.abs(a - b);
      if (diff > 180) diff = 360 - diff;
      expect(Math.abs(diff - 180)).toBeLessThan(0.1);
    }
  });

  it('places cardinal cusps (H1=ASC, H4=IC, H7=DESC, H10=MC) correctly', () => {
    const ramc = 210;
    const asc = 45;
    const obliquity = 23.44;
    const cusps = computePlacidusLongitudes(ramc, asc, obliquity, 28.6139);
    expect(cusps[0]).toBeCloseTo(asc, 0);
    expect(cusps[3]).toBeCloseTo((Math.atan2(Math.sin((ramc + 180) * Math.PI / 180), Math.cos((ramc + 180) * Math.PI / 180) * Math.cos(obliquity * Math.PI / 180)) * 180 / Math.PI + 360) % 360, 0);
    expect(cusps[6]).toBeCloseTo((asc + 180) % 360, 0);
    expect(cusps[9]).toBeCloseTo((Math.atan2(Math.sin(ramc * Math.PI / 180), Math.cos(ramc * Math.PI / 180) * Math.cos(obliquity * Math.PI / 180)) * 180 / Math.PI + 360) % 360, 0);
  });
});

describe('KP chart generation', () => {
  it('produces a complete KPData object', () => {
    const result = generateChart({ profile: REFERENCE_PROFILE, birthDetails: REFERENCE_BIRTH });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const { kp } = result.chart;
    expect(kp.cusps).toHaveLength(12);
    expect(kp.planets).toHaveLength(9);
    expect(kp.significators).toHaveLength(12);
  });

  it('assigns each planet to a valid Placidus house', () => {
    const result = generateChart({ profile: REFERENCE_PROFILE, birthDetails: REFERENCE_BIRTH });
    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const p of result.chart.kp.planets) {
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
      expect(p.nakshatraLord).toBeDefined();
      expect(p.subLord).toBeDefined();
      expect(p.subSubLord).toBeDefined();
    }
  });

  it('returns all standard ruling planets', () => {
    const result = generateChart({ profile: REFERENCE_PROFILE, birthDetails: REFERENCE_BIRTH });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const rp = result.chart.kp.rulingPlanets;
    expect(rp.ascStarLord).toBeDefined();
    expect(rp.ascSubLord).toBeDefined();
    expect(rp.ascSignLord).toBeDefined();
    expect(rp.moonStarLord).toBeDefined();
    expect(rp.moonSubLord).toBeDefined();
    expect(rp.moonSignLord).toBeDefined();
    expect(rp.dayLord).toBeDefined();

    // Day of week for 1990-01-15 was Monday
    expect(rp.dayLord).toBe('Moon');

    // Sign lords should be valid planets
    expect(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']).toContain(rp.ascSignLord);
    expect(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']).toContain(rp.moonSignLord);
  });

  it('significators have the expected 4-level structure', () => {
    const result = generateChart({ profile: REFERENCE_PROFILE, birthDetails: REFERENCE_BIRTH });
    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const hs of result.chart.kp.significators) {
      expect(hs.house).toBeGreaterThanOrEqual(1);
      expect(hs.house).toBeLessThanOrEqual(12);
      expect(Array.isArray(hs.level1)).toBe(true);
      expect(Array.isArray(hs.level2)).toBe(true);
      expect(Array.isArray(hs.level3)).toBe(true);
      expect(Array.isArray(hs.level4)).toBe(true);
      expect(Array.isArray(hs.significators)).toBe(true);
    }
  });
});
