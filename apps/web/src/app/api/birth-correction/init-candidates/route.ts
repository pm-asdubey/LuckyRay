/**
 * POST /api/birth-correction/init-candidates
 *
 * Given a birth date + uncertainty window + location, generates all candidate
 * birth times, computes the Placidus ascendant + KP sub-lord for each, and
 * builds the dasha grid for discrimination.
 *
 * This is the first call in the birth correction journey.
 * Returns a list of CandidateBirthTime objects with uniform probabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCandidateTimes, buildDashaGrid } from '@luckyray/birth-correction';
import type { TimeWindow, CandidateBirthTime } from '@luckyray/birth-correction';

export const runtime = 'nodejs'; // Needs jyotish package which uses require()

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

  // Use jyotish to compute chart for each candidate time
  const { generateChart } = require('@luckyray/jyotish') as {
    generateChart: (input: {
      profile: { id: string; name: string };
      birthDetails: {
        date: string; time: string; place: string;
        latitude: number; longitude: number; timezone: string; utcOffset: number;
      };
    }) => { success: boolean; chart?: import('@luckyray/shared').CanonicalChart; error?: string };
  };

  const candidateTimes = generateCandidateTimes(window);
  const birthYear = parseInt(birthDate.slice(0, 4), 10);
  const currentYear = new Date().getFullYear();

  const candidates: CandidateBirthTime[] = [];
  const initialProbability = 1 / candidateTimes.length;

  for (const time of candidateTimes) {
    const result = generateChart({
      profile: { id: 'rectification', name: 'Candidate' },
      birthDetails: {
        date: birthDate,
        time,
        place: 'Unknown',
        latitude,
        longitude,
        timezone: timezone || 'Asia/Kolkata',
        utcOffset: utcOffset ?? 330,
      },
    });

    if (!result.success || !result.chart) continue;

    const chart = result.chart;
    const moon = chart.planets.find(p => p.id === 'Moon');
    if (!moon) continue;

    // Compute Julian Day for this candidate birth time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hours, mins] = time.split(':').map(Number);
    const utcHours = (hours ?? 0) + (mins ?? 0) / 60 - (utcOffset ?? 330) / 60;
    const julianDay = dateToJulianDay(year!, month!, day!, utcHours);

    const dashaData = buildDashaGrid(
      moon.siderealLongitude,
      julianDay,
      birthYear,
      currentYear,
    );

    candidates.push({
      time,
      probability: initialProbability,
      ascendantSign: chart.ascendant.sign,
      ascendantDegrees: chart.ascendant.signIndex * 30 + chart.ascendant.degree + chart.ascendant.minute / 60,
      ascendantSubLord: chart.kp?.cusps?.[0]?.subLord ?? '',
      moonSiderealLon: moon.siderealLongitude,
      dashaData,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: 'Could not compute any candidates' }, { status: 500 });
  }

  return NextResponse.json({ candidates, totalCount: candidates.length });
}

function dateToJulianDay(year: number, month: number, day: number, utcHour: number): number {
  // Standard Julian Day calculation
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + utcHour / 24 + B - 1524.5;
}
