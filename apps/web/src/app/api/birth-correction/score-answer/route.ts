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
      subLordLikelihoods?: Record<string, number>;
    };

    let updatedCandidates: CandidateBirthTime[];

    if (isSubjective) {
      // Subjective questions: sub-lord groups have no meaningful relationship to
      // personality traits — the group pick would be random noise that hurts more
      // than it helps. Only apply sign-level update (already dampened in candidates.ts).
      if (parsed.signLikelihoods && Object.keys(parsed.signLikelihoods).length > 0) {
        updatedCandidates = applySignLikelihoodUpdate(candidates, parsed.signLikelihoods);
      } else {
        updatedCandidates = candidates; // No usable signal — leave unchanged
      }

      // Build a neutral result for the response
      const result: AnswerScoringResult = {
        questionId: question.id,
        bestMatchGroup: parsed.bestMatchGroup,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        candidateScores: Object.fromEntries(candidates.map(c => [c.time, 1.0])),
      };
      return NextResponse.json({ result, updatedCandidates } satisfies ScoreAnswerResponse);
    }

    // Event/dasha questions: apply group-based update only (no sign overlay).
    // If the AI also returned sub-lord likelihoods, apply those instead of the binary group pick.
    if (parsed.subLordLikelihoods && Object.keys(parsed.subLordLikelihoods).length > 0) {
      // Sub-lord-rated event scoring: each candidate's probability is multiplied by the
      // AI's rating for their ascendant sub-lord. Much more accurate than binary group pick.
      const subLordMap = parsed.subLordLikelihoods as Record<string, number>;
      const scoreMap: Record<string, number> = {};
      for (const c of candidates) {
        const raw = subLordMap[c.ascendantSubLord] ?? 0.5;
        const clamped = Math.max(0, Math.min(1, raw));
        // Dampen: 0→0.35, 0.5→0.675, 1→1.0 — never eliminates a candidate
        scoreMap[c.time] = 0.35 + 0.65 * clamped;
      }
      updatedCandidates = applyLikelihoodUpdate(candidates, scoreMap);
      const result: AnswerScoringResult = {
        questionId: question.id,
        bestMatchGroup: parsed.bestMatchGroup,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        candidateScores: scoreMap,
      };
      return NextResponse.json({ result, updatedCandidates } satisfies ScoreAnswerResponse);
    }

    // Standard group-based scoring for dasha period questions
    const result = buildScoringResult(question, parsed, candidates);
    updatedCandidates = applyLikelihoodUpdate(candidates, result.candidateScores);

    const responseData: ScoreAnswerResponse = { result, updatedCandidates };
    return NextResponse.json(responseData);

  } catch {
    return NextResponse.json(buildFallbackResponse(question, answer, candidates));
  }
}

function buildPeriodSystemPrompt(themeBlock: string, eventBlock: string, historyBlock: string): string {
  const hasEvents = eventBlock.length > 0;

  if (hasEvents) {
    // For event-based questions: rate each KP sub-lord planet by how well it explains
    // the events described. Much more accurate than a single binary group pick.
    return `You are a KP Jyotish birth time rectification assistant.

The user has described life events that occurred during a specific period. Your task is to rate
how well each Ascendant sub-lord planet would explain these events happening in this period.

In KP Jyotish, the Ascendant sub-lord shapes the native's overall life quality and which
planetary significations manifest most strongly. An Ascendant sub-lord that is also a significator
of the event's houses makes those events more likely.

${eventBlock}

${themeBlock}

${historyBlock}

SCORING RULES:
- Rate each planet as a sub-lord likelihood (0.0–1.0) for causing/allowing this event
- Example: for marriage, Jupiter and Venus should rate high (0.7–0.9); Ketu or Saturn low (0.2–0.4)
- bestMatchGroup: the group index most consistent with these ratings (0-indexed)
- confidence: keep MODERATE (0.3–0.6) — single events rarely confirm the sub-lord definitively
- reasoning: explain which planets you rated high and why, referencing the specific events

RESPOND ONLY WITH VALID JSON:
{
  "bestMatchGroup": <integer>,
  "confidence": <float 0.2-0.6>,
  "reasoning": "<2 sentences: which planets rated high and why>",
  "subLordLikelihoods": {
    "Sun": <float>, "Moon": <float>, "Mars": <float>, "Mercury": <float>,
    "Jupiter": <float>, "Venus": <float>, "Saturn": <float>, "Rahu": <float>, "Ketu": <float>
  }
}`;
  }

  // For dasha-period questions without events
  return `You are a KP Jyotish birth time rectification assistant.

Your task: analyze the user's description of a life period and determine which dasha pattern it matches.

${themeBlock}

${historyBlock}

SCORING RULES:
- bestMatchGroup: 0-indexed group number (0=A, 1=B, ...)
- confidence: 0.0–0.70 (never above 0.70 — dasha periods blend at transitions)
- If the answer is vague: confidence ≤ 0.30
- If the answer clearly matches one group: confidence 0.50–0.70
- Prior conversation context: avoid contradicting earlier inferences
- reasoning must quote specific words from the user's answer

RESPOND ONLY WITH VALID JSON:
{
  "bestMatchGroup": <integer>,
  "confidence": <float>,
  "reasoning": "<one sentence>"
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
  // Gentler formula: high match → up to 2.5x boost; low match → minimum 0.5x
  // This prevents a single wrong pick from catastrophically penalizing correct candidates.
  const highScore = 1 + parsed.confidence * 1.5;    // 1.0 → 2.5 (was 4.0)
  const lowScore = 1 / (1 + parsed.confidence);     // 1.0 → 0.5 (was 0.33)

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
