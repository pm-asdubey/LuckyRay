/**
 * POST /api/birth-correction/next-question
 *
 * Deterministically finds the next most-discriminating interview question
 * based on the current set of candidate birth times and what has already been asked.
 *
 * No AI call needed — the discriminator is purely algorithmic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findBestDiscriminatingPeriod, computeConvergence, estimateInformationGain } from '@luckyray/birth-correction';
import type { NextQuestionPayload, NextQuestionResponse } from '@luckyray/birth-correction';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  let payload: NextQuestionPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { candidates, questionsAlreadyAsked, birthYear } = payload;

  if (!candidates || !Array.isArray(candidates) || typeof birthYear !== 'number') {
    return NextResponse.json({ error: 'candidates and birthYear required' }, { status: 400 });
  }

  const question = findBestDiscriminatingPeriod(candidates, questionsAlreadyAsked ?? [], birthYear);
  const convergence = computeConvergence(candidates);

  const topCandidates = [...candidates]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5)
    .map(c => ({ time: c.time, probability: c.probability, ascendantSign: c.ascendantSign }));

  const informationGain = question ? estimateInformationGain(question, candidates) : 0;

  const response: NextQuestionResponse & {
    convergence: typeof convergence;
    informationGain: number;
  } = {
    question,
    remainingCandidateCount: candidates.filter(c => c.probability >= 0.01).length,
    topCandidates,
    convergence,
    informationGain,
  };

  return NextResponse.json(response);
}
