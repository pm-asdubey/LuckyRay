/**
 * POST /api/birth-correction/score-answer
 *
 * AI call that interprets the user's free-text answer to an interview question
 * and returns a likelihood score for each candidate group.
 *
 * The AI receives:
 * - The question that was asked (year range + candidate groups with themes)
 * - The user's free-text answer
 * - Planet theme descriptions for each group
 *
 * The AI returns which group the answer matches most strongly, with confidence.
 *
 * Non-streaming, low-latency. Falls back to equal weighting on failure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { serializePlanetThemes, applyLikelihoodUpdate } from '@luckyray/birth-correction';
import type { ScoreAnswerPayload, ScoreAnswerResponse, AnswerScoringResult, CandidateBirthTime } from '@luckyray/birth-correction';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 503 });
  }

  let payload: ScoreAnswerPayload & { candidates: CandidateBirthTime[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { question, answer, candidates } = payload;

  if (!question || !answer || !candidates) {
    return NextResponse.json({ error: 'question, answer, and candidates required' }, { status: 400 });
  }

  // Build planet themes for the planets in this question's groups
  const allPlanets = question.groups.flatMap(g => g.planets);
  const uniquePlanets = [...new Set(allPlanets)];
  const themeBlock = serializePlanetThemes(uniquePlanets);

  const groupDescriptions = question.groups.map((g, i) => {
    const label = String.fromCharCode(65 + i); // A, B, C...
    return `Group ${label} (${g.candidateCount} candidates): ${g.themeLabel}`;
  }).join('\n');

  const systemPrompt = `You are a Vedic astrology birth time rectification assistant.
Your task is to analyze a person's description of a life period and determine which planetary dasha pattern it best matches.

${themeBlock}

RESPOND ONLY WITH VALID JSON in this format:
{
  "bestMatchGroup": <0-indexed integer>,
  "confidence": <float 0.0-1.0>,
  "reasoning": "<one sentence explaining the match>"
}

Rules:
- bestMatchGroup is the 0-indexed group number (0=A, 1=B, 2=C, etc.)
- If the answer is very vague or matches multiple groups equally, set confidence to 0.3 or lower
- If the answer clearly matches one group's themes, confidence can be 0.7-0.9
- Never set confidence above 0.95 (planetary periods blend)
- The reasoning should reference specific words or themes from the user's answer`;

  const userMessage = `Period: ${question.yearStart}–${question.yearEnd}

Candidate groups:
${groupDescriptions}

User's answer: "${answer.freeText}"
${answer.selectedThemes?.length ? `Selected themes: ${answer.selectedThemes.join(', ')}` : ''}

Which group does this answer match?`;

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(buildFallbackResponse(question, answer, candidates));
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data?.choices?.[0]?.message?.content ?? '';

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(buildFallbackResponse(question, answer, candidates));
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      bestMatchGroup: number;
      confidence: number;
      reasoning: string;
    };

    const result = buildScoringResult(question, parsed, candidates);
    const updatedCandidates = applyLikelihoodUpdate(candidates, result.candidateScores);

    const responseData: ScoreAnswerResponse = { result, updatedCandidates };
    return NextResponse.json(responseData);

  } catch {
    return NextResponse.json(buildFallbackResponse(question, answer, candidates));
  }
}

function buildScoringResult(
  question: import('@luckyray/birth-correction').GeneratedQuestion,
  parsed: { bestMatchGroup: number; confidence: number; reasoning: string },
  candidates: CandidateBirthTime[],
): AnswerScoringResult {
  const matchGroup = question.groups[parsed.bestMatchGroup];
  const matchTimes = new Set(matchGroup?.candidateTimes ?? []);

  const candidateScores: Record<string, number> = {};
  const highScore = 1 + parsed.confidence * 3;  // 1.0 – 4.0
  const lowScore = 1 / (1 + parsed.confidence * 2); // 0.33 – 1.0

  for (const c of candidates) {
    candidateScores[c.time] = matchTimes.has(c.time) ? highScore : lowScore;
  }

  return {
    questionId: question.id,
    bestMatchGroup: parsed.bestMatchGroup,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    candidateScores,
  };
}

function buildFallbackResponse(
  question: import('@luckyray/birth-correction').GeneratedQuestion,
  answer: import('@luckyray/birth-correction').InterviewAnswer,
  candidates: CandidateBirthTime[],
): ScoreAnswerResponse {
  // Equal weights — no information gained, but don't break the journey
  const result: AnswerScoringResult = {
    questionId: question.id,
    bestMatchGroup: 0,
    confidence: 0.1,
    reasoning: 'Could not determine a clear match from the description.',
    candidateScores: Object.fromEntries(candidates.map(c => [c.time, 1.0])),
  };
  return { result, updatedCandidates: candidates };
}
