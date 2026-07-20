/**
 * Candidate birth time generation and dasha grid computation.
 *
 * For a given birth date and uncertainty window, generates candidate birth times
 * every 2 minutes, computes the Placidus ascendant and KP sub-lord for each,
 * and builds a compact dasha grid (year → MD/AD pair) for discrimination.
 */

import type { PlanetId } from '@luckyray/shared';
import type { CandidateBirthTime, CompactDashaMap, TimeWindow } from './types';

const INTERVAL_MINUTES = 2;

/**
 * Generate candidate birth times across the uncertainty window.
 * Returns at most 360 candidates (12 hours × 30 per hour) for a full-day window.
 */
export function generateCandidateTimes(window: TimeWindow): string[] {
  const candidates: string[] = [];

  let startMinutes: number;
  let endMinutes: number;

  if (window.centerTime) {
    const [h, m] = window.centerTime.split(':').map(Number);
    const centerMin = (h ?? 0) * 60 + (m ?? 0);
    startMinutes = Math.max(0, centerMin - window.windowMinutes);
    endMinutes = Math.min(1439, centerMin + window.windowMinutes);
  } else {
    startMinutes = 0;
    endMinutes = 1438;
  }

  for (let min = startMinutes; min <= endMinutes; min += INTERVAL_MINUTES) {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    candidates.push(`${h}:${m}`);
  }

  return candidates;
}

/**
 * Build a compact dasha grid for a candidate birth time.
 * Uses the provided moon longitude and dasha computation from jyotish.
 *
 * @param moonSiderealLon  Moon's sidereal longitude at birth
 * @param birthJulianDay   Julian Day of the birth moment
 * @param fromYear         First year to include (typically birth year)
 * @param toYear           Last year to include (typically current year + 1)
 */
export function buildDashaGrid(
  moonSiderealLon: number,
  birthJulianDay: number,
  fromYear: number,
  toYear: number,
): CompactDashaMap {
  const { computeVimshottariDasha } = require('@luckyray/jyotish') as {
    computeVimshottariDasha: (lon: number, jd: number) => import('@luckyray/shared').DashaData;
  };

  const dashaData = computeVimshottariDasha(moonSiderealLon, birthJulianDay);
  const grid: CompactDashaMap = {};

  for (let year = fromYear; year <= toYear; year++) {
    const refDate = new Date(year, 5, 15); // Mid-year reference: June 15
    const md = dashaData.allPeriods.find(p =>
      new Date(p.startDate) <= refDate && new Date(p.endDate) >= refDate,
    );
    if (!md) continue;

    const ad = md.antardasha?.find(a =>
      new Date(a.startDate) <= refDate && new Date(a.endDate) >= refDate,
    ) ?? null;

    grid[String(year)] = { md: md.planet, ad: ad?.planet ?? null };
  }

  return grid;
}

/**
 * Given a list of CandidateBirthTime objects, find what MD+AD was running
 * for each candidate at a specific date.
 */
export function getDashaAtDate(candidate: CandidateBirthTime, date: Date): { md: PlanetId; ad: PlanetId | null } | null {
  if (!candidate.dashaData) return null;
  const year = String(date.getFullYear());
  return candidate.dashaData[year] ?? null;
}

/**
 * Returns the window width in minutes based on how many candidates remain
 * and the current top probability.
 */
export function computeConvergence(candidates: CandidateBirthTime[]): {
  hasConverged: boolean;
  topProbability: number;
  effectiveWindowMinutes: number;
} {
  const sorted = [...candidates].sort((a, b) => b.probability - a.probability);
  const top = sorted[0];
  if (!top) return { hasConverged: false, topProbability: 0, effectiveWindowMinutes: 720 };

  // Compute the window containing 80% of probability mass
  let cumulative = 0;
  let count = 0;
  for (const c of sorted) {
    cumulative += c.probability;
    count++;
    if (cumulative >= 0.80) break;
  }
  const effectiveWindowMinutes = count * INTERVAL_MINUTES;

  // Convergence: top candidate holds ≥85% probability AND the 80%-mass window
  // is ≤15 minutes. This corresponds to the AI being confident to within
  // roughly ±7 minutes — a meaningful clinical threshold for KP rectification.
  const converged = top.probability >= 0.85 && effectiveWindowMinutes <= 15;

  return {
    hasConverged: converged,
    topProbability: top.probability,
    effectiveWindowMinutes,
  };
}

/**
 * Normalize probabilities so they sum to 1.
 */
export function normalizeProbabilities(candidates: CandidateBirthTime[]): CandidateBirthTime[] {
  const total = candidates.reduce((sum, c) => sum + c.probability, 0);
  if (total === 0) return candidates;
  return candidates.map(c => ({ ...c, probability: c.probability / total }));
}

/**
 * Apply a likelihood multiplier to each candidate based on a scoring function.
 * Re-normalizes after applying.
 */
export function applyLikelihoodUpdate(
  candidates: CandidateBirthTime[],
  scoreMap: Record<string, number>,
): CandidateBirthTime[] {
  const updated = candidates.map(c => ({
    ...c,
    probability: c.probability * (scoreMap[c.time] ?? 1.0),
  }));
  return normalizeProbabilities(updated);
}

/**
 * Apply an ascendant-sign based likelihood update.
 *
 * Uses a DAMPENED multiplier so a single subjective question can never
 * catastrophically drop a candidate. Formula: 0.4 + 0.6 * likelihood
 * maps the AI's 0–1 score to a 0.4–1.0 multiplier range.
 *
 * This means even the "worst" sign match still retains 40% of its prior
 * probability — we adjust gently rather than eliminate based on soft evidence.
 */
export function applySignLikelihoodUpdate(
  candidates: CandidateBirthTime[],
  signLikelihoods: Record<string, number>,
): CandidateBirthTime[] {
  const updated = candidates.map(c => {
    const raw = signLikelihoods[c.ascendantSign] ?? 0.5;
    const clamped = Math.max(0, Math.min(1, raw));
    // Dampen: 0→0.4, 0.5→0.7, 1→1.0 — never wipes out a candidate
    const multiplier = 0.4 + 0.6 * clamped;
    return { ...c, probability: c.probability * multiplier };
  });
  return normalizeProbabilities(updated);
}
