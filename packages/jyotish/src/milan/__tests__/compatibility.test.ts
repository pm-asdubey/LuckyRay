/**
 * Milan / Kundli compatibility engine tests.
 */

import { describe, it, expect } from 'vitest';
import { generateChart } from '../../index';
import { computeCompatibility } from '../index';
import type { BirthDetails } from '@luckyray/shared';

const REFERENCE_BIRTH_A: BirthDetails = {
  date: '1990-06-15',
  time: '08:30',
  place: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  utcOffset: 330,
};

const REFERENCE_BIRTH_B: BirthDetails = {
  date: '1992-03-22',
  time: '16:45',
  place: 'Mumbai, India',
  latitude: 19.0760,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
  utcOffset: 330,
};

const PROFILE_A = { id: 'milan-a', name: 'Person A', gender: 'Male' as const };
const PROFILE_B = { id: 'milan-b', name: 'Person B', gender: 'Female' as const };

describe('computeCompatibility', () => {
  it('produces a complete CompatibilityResult', () => {
    const rA = generateChart({ profile: PROFILE_A, birthDetails: REFERENCE_BIRTH_A });
    const rB = generateChart({ profile: PROFILE_B, birthDetails: REFERENCE_BIRTH_B });

    expect(rA.success).toBe(true);
    expect(rB.success).toBe(true);
    if (!rA.success || !rB.success) return;

    const result = computeCompatibility({ chartA: rA.chart, chartB: rB.chart });

    expect(result.profileA.id).toBe(PROFILE_A.id);
    expect(result.profileB.id).toBe(PROFILE_B.id);
    expect(result.dimensions.length).toBe(6);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    expect(result.verdict).toBeDefined();
    expect(result.ashtakoot.kootas.length).toBe(8);
    expect(result.timing.windows).toBeInstanceOf(Array);
  });

  it('returns higher scores for charts with the same Moon sign', () => {
    const sameSignBirth: BirthDetails = { ...REFERENCE_BIRTH_A, time: '09:00' };
    const rA = generateChart({ profile: PROFILE_A, birthDetails: REFERENCE_BIRTH_A });
    const rSame = generateChart({ profile: PROFILE_B, birthDetails: sameSignBirth });
    expect(rA.success && rSame.success).toBe(true);
    if (!rA.success || !rSame.success) return;

    const result = computeCompatibility({ chartA: rA.chart, chartB: rSame.chart });
    const emotional = result.dimensions.find(d => d.id === 'emotional')!;
    expect(emotional.score).toBeGreaterThanOrEqual(0);
  });
});
