/**
 * POST /api/birth-correction/analyze-physical
 *
 * AI call that analyzes physical appearance descriptions + optional voice notes
 * to produce a likelihood score for each of the 12 rising signs.
 *
 * Input:
 * - userDescriptions: height, build, complexion, face notes, voice notes
 * - hasPhoto: whether a photo was also analyzed client-side
 * - clientPhotoAnalysis: optional pre-analyzed photo description (from client vision model)
 *
 * Output:
 * - signLikelihoods: Record<sign, 0–1>
 * - eliminatedSigns: signs with score < 0.1
 * - topSigns: top 4 candidates
 * - reasoning: explanation
 */

import { NextRequest, NextResponse } from 'next/server';
import { serializeSignProfiles } from '@luckyray/birth-correction';
import type { AnalyzePhysicalPayload, AnalyzePhysicalResponse } from '@luckyray/birth-correction';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

export const runtime = 'edge';

const ALL_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 503 });
  }

  let payload: AnalyzePhysicalPayload & {
    clientPhotoAnalysis?: string;
    voiceTranscription?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userDescriptions, clientPhotoAnalysis, voiceTranscription } = payload;

  const signProfilesBlock = serializeSignProfiles();

  const systemPrompt = `You are a Vedic astrology birth time rectification assistant specializing in physical appearance analysis.

Your task is to analyze physical and vocal descriptions and assign likelihood scores to each of the 12 rising signs in KP Jyotish.

${signProfilesBlock}

IMPORTANT GUIDELINES:
- Scores are LIKELIHOODS, not certainties. Physical appearance varies by ethnicity, age, health, and genetics.
- The sum of all scores does NOT need to equal 1 — each sign gets its own independent score (0.0–1.0).
- A sign can score 0.8 if features strongly match, even if other signs also score moderately.
- Signs with zero matching features score 0.05 (never 0 — ruling planets can override appearance).
- Voice analysis carries MODERATE weight. Speech style is planetary in origin, not just sign-based.
- Photo analysis (if provided) carries the most weight for facial structure.

RESPOND ONLY WITH VALID JSON:
{
  "signLikelihoods": {
    "Aries": <float>,
    "Taurus": <float>,
    ...all 12 signs...
  },
  "reasoning": "<2-3 sentences explaining the top matches and what physical features led to that conclusion>",
  "voiceSignal": "<1 sentence on what the voice reveals if voice data was provided, otherwise omit>"
}`;

  const userParts: string[] = [];

  userParts.push('PHYSICAL DESCRIPTION FROM USER:');
  userParts.push(`Height: ${userDescriptions.height}`);
  userParts.push(`Build: ${userDescriptions.build}`);
  userParts.push(`Complexion: ${userDescriptions.complexion}`);
  userParts.push(`Face notes: ${userDescriptions.faceNotes}`);
  if (userDescriptions.additionalFeatures) {
    userParts.push(`Additional features: ${userDescriptions.additionalFeatures}`);
  }

  if (clientPhotoAnalysis) {
    userParts.push('\nPHOTO ANALYSIS (automated facial feature extraction):');
    userParts.push(clientPhotoAnalysis);
  }

  if (voiceTranscription && userDescriptions.voiceNotes) {
    userParts.push('\nVOICE ANALYSIS:');
    userParts.push(`User's self-described voice style: ${userDescriptions.voiceNotes}`);
    userParts.push(`Voice transcription characteristics: ${voiceTranscription}`);
  }

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
          { role: 'user', content: userParts.join('\n') },
        ],
        max_tokens: 500,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(buildUniformResponse());
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data?.choices?.[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json(buildUniformResponse());

    const parsed = JSON.parse(jsonMatch[0]) as {
      signLikelihoods: Record<string, number>;
      reasoning: string;
      voiceSignal?: string;
    };

    const likelihoods = parsed.signLikelihoods ?? {};
    // Ensure all signs present with at least 0.05
    for (const sign of ALL_SIGNS) {
      if (typeof likelihoods[sign] !== 'number') likelihoods[sign] = 0.05;
    }

    const eliminatedSigns = ALL_SIGNS.filter(s => (likelihoods[s] ?? 0) < 0.15);
    const topSigns = ALL_SIGNS
      .sort((a, b) => (likelihoods[b] ?? 0) - (likelihoods[a] ?? 0))
      .slice(0, 4);

    const result: AnalyzePhysicalResponse = {
      signLikelihoods: likelihoods,
      eliminatedSigns,
      reasoning: parsed.reasoning + (parsed.voiceSignal ? ` ${parsed.voiceSignal}` : ''),
      topSigns,
    };

    return NextResponse.json(result);

  } catch {
    return NextResponse.json(buildUniformResponse());
  }
}

function buildUniformResponse(): AnalyzePhysicalResponse {
  const uniform = Object.fromEntries(ALL_SIGNS.map(s => [s, 1 / 12]));
  return {
    signLikelihoods: uniform,
    eliminatedSigns: [],
    reasoning: 'Could not analyze features. All signs remain equally probable.',
    topSigns: ALL_SIGNS.slice(0, 4),
  };
}
