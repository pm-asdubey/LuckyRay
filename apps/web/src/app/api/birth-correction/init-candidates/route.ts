/**
 * POST /api/birth-correction/init-candidates
 *
 * Given a birth date + uncertainty window + location, generates all candidate
 * birth times, computes the Placidus ascendant + KP sub-lord for each, and
 * builds a compact dasha grid for discrimination.
 *
 * The dasha grid is computed ONCE from the first chart (Moon moves <0.02° over
 * one day, so the dasha sequence is identical for all candidates in a window).
 * Per-candidate work is ascendant sign + KP cuspal sub-lord only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCandidateTimes } from '@luckyray/birth-correction';
import type { TimeWindow, CandidateBirthTime, CompactDashaMap } from '@luckyray/birth-correction';
import type { DashaPeriod, CanonicalChart } from '@luckyray/shared';

export const runtime = 'nodejs';

type GenerateChartFn = (input: {
  profile: { id: string; name: string };
  birthDetails: {
    date: string; time: string; place: string;
    latitude: number; longitude: number; timezone: string; utcOffset: number;
  };
}) => { success: boolean; chart?: CanonicalChart; error?: string };

/** Build compact year-keyed dasha grid from already-computed allPeriods. */
function buildGridFromPeriods(
  allPeriods: DashaPeriod[],
  fromYear: number,
  toYear: number,
): CompactDashaMap {
  const grid: CompactDashaMap = {};
  for (let year = fromYear; year <= toYear; year++) {
    const ref = new Date(year, 5, 15); // June 15 — mid-year reference
    const md = allPeriods.find(p => new Date(p.startDate) <= ref && new Date(p.endDate) >= ref);
    if (!md) continue;
    const ad = md.antardasha?.find(a => new Date(a.startDate) <= ref && new Date(a.endDate) >= ref) ?? null;
    grid[String(year)] = { md: md.planet, ad: ad?.planet ?? null };
  }
  return grid;
}

export async function POST(req: NextRequest) {
  let window: TimeWindow;
  try {
    window = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { birthDate, latitude, longitude, timezone, utcOffset } = window;

  if (!birthDate || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'birthDate, latitude, longitude required' }, { status: 400 });
  }

  const { generateChart } = require('@luckyray/jyotish') as { generateChart: GenerateChartFn };

  const birthDetails = {
    place: 'Unknown',
    latitude,
    longitude,
    timezone: timezone || 'Asia/Kolkata',
    utcOffset: utcOffset ?? 330,
  };

  const candidateTimes = generateCandidateTimes(window);
  const birthYear = parseInt(birthDate.slice(0, 4), 10);
  const currentYear = new Date().getFullYear();

  const candidates: CandidateBirthTime[] = [];
  const initialProbability = 1 / candidateTimes.length;

  // Shared dasha grid — computed from first successful chart, reused for all candidates
  let sharedDashaGrid: CompactDashaMap | null = null;
  let sharedMoonLon = 0;

  for (const time of candidateTimes) {
    let result;
    try {
      result = generateChart({
        profile: { id: 'rectification', name: 'Candidate' },
        birthDetails: { date: birthDate, time, ...birthDetails },
      });
    } catch {
      continue;
    }

    if (!result.success || !result.chart) continue;

    const chart = result.chart;
    const moon = chart.planets.find(p => p.id === 'Moon');
    if (!moon) continue;

    // Build dasha grid once — Moon longitude changes ~0.5° per day, negligible over 24h
    if (!sharedDashaGrid) {
      sharedMoonLon = moon.siderealLongitude;
      sharedDashaGrid = buildGridFromPeriods(chart.dashas.allPeriods, birthYear, currentYear);
    }

    candidates.push({
      time,
      probability: initialProbability,
      ascendantSign: chart.ascendant.sign,
      ascendantDegrees: chart.ascendant.signIndex * 30 + chart.ascendant.degree + chart.ascendant.minute / 60,
      ascendantSubLord: chart.kp?.cusps?.[0]?.subLord ?? '',
      moonSiderealLon: sharedMoonLon,
      dashaData: sharedDashaGrid,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: 'Could not compute any candidates — check birth details' }, { status: 500 });
  }

  return NextResponse.json({ candidates, totalCount: candidates.length });
}
