/**
 * POST /api/birth-correction/score-answer
 *
 * AI call that interprets a user's answer to a birth-time rectification question
 * and returns a likelihood score for each candidate birth time.
 *
 * Accepts:
 * - question: the question that was asked (dasha period, event, or subjective)
 * - answer: the user's free-text response
 * - candidates: current candidate birth times with probabilities
 * - questionHistory: ALL previous Q&A pairs (for AI context continuity)
 * - selectedEventIds: for KP event questions, structured event selections
 * - eventDetails: per-event followup answers
 * - isSubjective: whether this is a personality/interest question (not time-period)
 * - subjectiveContext: KP context for subjective questions
 *
 * Falls back to equal weighting on failure — never crashes the journey.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  serializePlanetThemes,
  applyLikelihoodUpdate,
  applySignLikelihoodUpdate,
  serializeSelectedEventsForAI,
} from '@luckyray/birth-correction';
import type {
  ScoreAnswerPayload,
  ScoreAnswerResponse,
  AnswerScoringResult,
  CandidateBirthTime,
  GeneratedQuestion,
  InterviewAnswer,
} from '@luckyray/birth-correction';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

export const runtime = 'edge';

interface QuestionHistoryEntry {
  questionText: string;
  answerText: string;
  reasoning?: string;
}

interface ExtendedPayload extends ScoreAnswerPayload {
  candidates: CandidateBirthTime[];
  questionHistory?: QuestionHistoryEntry[];
  selectedEventIds?: string[];
  eventDetails?: Record<string, string>;
  isSubjective?: boolean;
  subjectiveContext?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 503 });
  }

  let payload: ExtendedPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    question,
    answer,
    candidates,
    questionHistory = [],
    selectedEventIds = [],
    eventDetails = {},
    isSubjective = false,
    subjectiveContext = '',
  } = payload;

  if (!question || !answer || !candidates) {
    return NextResponse.json({ error: 'question, answer, and candidates required' }, { status: 400 });
  }

  // Build the planet theme block for this question's candidate groups
  const allPlanets = question.groups.flatMap(g => g.planets);
  const uniquePlanets = [...new Set(allPlanets)] as import('@luckyray/birth-correction').CandidateBirthTime['ascendantSubLord'][];
  const themeBlock = serializePlanetThemes(uniquePlanets as Parameters<typeof serializePlanetThemes>[0]);

  // Build KP event context if structured events were selected
  const eventBlock = selectedEventIds.length > 0
    ? serializeSelectedEventsForAI(selectedEventIds, eventDetails)
    : '';

  // Build prior conversation context (last 6 entries to stay within token budget)
  const historyBlock = questionHistory.length > 0
    ? [
        '── PREVIOUS QUESTIONS AND ANSWERS (for context) ───────────────────────────',
        ...questionHistory.slice(-6).map((entry, i) => [
          `[Q${i + 1}] ${entry.questionText}`,
          `[A${i + 1}] ${entry.answerText}`,
          entry.reasoning ? `[Reasoning] ${entry.reasoning}` : '',
        ].filter(Boolean).join('\n')),
        '',
      ].join('\n')
    : '';

  const groupDescriptions = question.groups.map((g, i) => {
    const label = String.fromCharCode(65 + i);
    return `Group ${label} (${g.candidateCount} birth time candidates): ${g.themeLabel}`;
  }).join('\n');

  const systemPrompt = isSubjective
    ? buildSubjectiveSystemPrompt(themeBlock, subjectiveContext, historyBlock)
    : buildPeriodSystemPrompt(themeBlock, eventBlock, historyBlock);

  const userMessage = buildUserMessage(question, answer, groupDescriptions, selectedEventIds, eventDetails, isSubjective);

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
        max_tokens: 250,
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
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(buildFallbackResponse(question, answer, candidates));
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      bestMatchGroup: number;
      confidence: number;
      reasoning: string;
      signLikelihoods?: Record<string, number>;
    };

    const result = buildScoringResult(question, parsed, candidates);

    // For subjective questions, also apply sign-level updates if the AI returned them
    let updatedCandidates = applyLikelihoodUpdate(candidates, result.candidateScores);
    if (parsed.signLikelihoods && Object.keys(parsed.signLikelihoods).length > 0) {
      updatedCandidates = applySignLikelihoodUpdate(updatedCandidates, parsed.signLikelihoods);
    }

    const responseData: ScoreAnswerResponse = { result, updatedCandidates };
    return NextResponse.json(responseData);

  } catch {
    return NextResponse.json(buildFallbackResponse(question, answer, candidates));
  }
}

function buildPeriodSystemPrompt(themeBlock: string, eventBlock: string, historyBlock: string): string {
  return `You are a KP Jyotish birth time rectification assistant.

Your task: analyze the user's description of a specific life period and determine which dasha/sub-lord group their experience best matches.

${themeBlock}

${eventBlock}

${historyBlock}

SCORING RULES:
- bestMatchGroup: 0-indexed group number (0=A, 1=B, ...)
- confidence: 0.0–0.95 (never 1.0 — dasha periods blend at boundaries)
- If the answer is vague or matches multiple groups: confidence ≤ 0.35
- If the answer clearly matches one group's planetary themes: confidence 0.65–0.85
- Use the prior conversation context to avoid contradicting earlier inferences
- The reasoning must quote specific words or themes from the user's answer

RESPOND ONLY WITH VALID JSON:
{
  "bestMatchGroup": <integer>,
  "confidence": <float>,
  "reasoning": "<one sentence referencing specific themes from the answer>"
}`;
}

function buildSubjectiveSystemPrompt(themeBlock: string, subjectiveContext: string, historyBlock: string): string {
  return `You are a KP Jyotish birth time rectification assistant.

Your task: analyze the user's answer to a personality/interest question and update likelihood scores for both candidate groups AND rising signs.

${themeBlock}

${subjectiveContext}

${historyBlock}

SCORING RULES:
- bestMatchGroup: which candidate group the answer weakly points to (use 0 if unclear)
- confidence: keep LOW for subjective questions (0.2–0.5 max) — character traits are not deterministic
- signLikelihoods: REQUIRED for subjective questions — assign 0.0–1.0 per sign based on the answer
  - Creative/artistic answers → boost Taurus, Libra, Pisces, Leo
  - Scientific/analytical answers → boost Virgo, Gemini, Capricorn, Aquarius
  - Leadership/authority answers → boost Leo, Aries, Capricorn
  - Sensitive/emotional answers → boost Cancer, Scorpio, Pisces
  - Philosophy/spirituality → boost Sagittarius, Pisces, Aquarius
  - Sports/physical → boost Aries, Scorpio, Capricorn
- Never set a sign below 0.05 — subjective evidence is weak
- reasoning: quote specific words from the answer

RESPOND ONLY WITH VALID JSON:
{
  "bestMatchGroup": <integer>,
  "confidence": <float 0.2-0.5>,
  "reasoning": "<one sentence>",
  "signLikelihoods": {
    "Aries": <float>, "Taurus": <float>, "Gemini": <float>, "Cancer": <float>,
    "Leo": <float>, "Virgo": <float>, "Libra": <float>, "Scorpio": <float>,
    "Sagittarius": <float>, "Capricorn": <float>, "Aquarius": <float>, "Pisces": <float>
  }
}`;
}

function buildUserMessage(
  question: GeneratedQuestion,
  answer: InterviewAnswer,
  groupDescriptions: string,
  selectedEventIds: string[],
  eventDetails: Record<string, string>,
  isSubjective: boolean,
): string {
  const parts: string[] = [];

  if (!isSubjective) {
    parts.push(`Time period: ${question.yearStart}–${question.yearEnd}`);
    parts.push('');
  }

  parts.push('Candidate groups:');
  parts.push(groupDescriptions);
  parts.push('');

  parts.push(`Question asked: "${question.questionText}"`);
  parts.push('');

  parts.push(`User's answer: "${answer.freeText}"`);

  if (selectedEventIds.length > 0) {
    parts.push('');
    parts.push('Structured events selected for this period:');
    parts.push(serializeSelectedEventsForAI(selectedEventIds, eventDetails));
  }

  return parts.join('\n');
}

function buildScoringResult(
  question: GeneratedQuestion,
  parsed: { bestMatchGroup: number; confidence: number; reasoning: string },
  candidates: CandidateBirthTime[],
): AnswerScoringResult {
  const matchGroup = question.groups[parsed.bestMatchGroup];
  const matchTimes = new Set(matchGroup?.candidateTimes ?? []);

  const candidateScores: Record<string, number> = {};
  // Score formula: high match → multiply by up to 4x; low match → divide by up to 3x
  const highScore = 1 + parsed.confidence * 3;      // 1.0 → 4.0
  const lowScore = 1 / (1 + parsed.confidence * 2); // 1.0 → 0.33

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
  question: GeneratedQuestion,
  answer: InterviewAnswer,
  candidates: CandidateBirthTime[],
): ScoreAnswerResponse {
  const result: AnswerScoringResult = {
    questionId: question.id,
    bestMatchGroup: 0,
    confidence: 0.05,
    reasoning: 'Could not determine a clear match — no probability update applied.',
    candidateScores: Object.fromEntries(candidates.map(c => [c.time, 1.0])),
  };
  return { result, updatedCandidates: candidates };
}
