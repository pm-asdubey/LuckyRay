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
import { serializeSignProfiles, serializePalmistryRAG } from '@luckyray/birth-correction';
import type { AnalyzePhysicalPayload, AnalyzePhysicalResponse } from '@luckyray/birth-correction';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const TEXT_MODEL = 'meta/llama-3.1-70b-instruct';
const VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct';

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
    photoBase64?: string;
    palmPhotoBase64?: string;
    analysisMode?: 'face' | 'palm' | 'both';
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userDescriptions, clientPhotoAnalysis, voiceTranscription, photoBase64, palmPhotoBase64, analysisMode = 'face' } = payload;

  const signProfilesBlock = serializeSignProfiles();
  const palmistryBlock = (analysisMode === 'palm' || analysisMode === 'both') ? serializePalmistryRAG() : '';

  const systemPrompt = `You are a Vedic astrology birth time rectification assistant specializing in physical appearance and palmistry analysis.

Your task is to analyze the provided information and assign likelihood scores to each of the 12 rising signs in KP Jyotish.

${signProfilesBlock}

${palmistryBlock}

IMPORTANT GUIDELINES:
- Scores are LIKELIHOODS, not certainties. Physical appearance varies by ethnicity, age, health, and genetics.
- The sum of all scores does NOT need to equal 1 — each sign gets its own independent score (0.0–1.0).
- A sign can score 0.8 if features strongly match, even if other signs also score moderately.
- Signs with zero matching features score 0.05 (never 0 — ruling planets can override appearance).
- Voice analysis carries MODERATE weight. Speech style is planetary in origin, not just sign-based.
- Face photo analysis carries strong weight for facial structure and bearing.
- Palm photo analysis is highly valuable — focus on the dominant mount and hand shape.
- If both face and palm photos are provided, synthesize both sets of signals.
- If image quality is poor, widen your probability range and note it in reasoning.

RESPOND ONLY WITH VALID JSON:
{
  "signLikelihoods": {
    "Aries": <float>,
    "Taurus": <float>,
    "Gemini": <float>,
    "Cancer": <float>,
    "Leo": <float>,
    "Virgo": <float>,
    "Libra": <float>,
    "Scorpio": <float>,
    "Sagittarius": <float>,
    "Capricorn": <float>,
    "Aquarius": <float>,
    "Pisces": <float>
  },
  "reasoning": "<2-4 sentences explaining the top matches, which physical or palmistry features led to that conclusion, and any uncertainty>",
  "palmSignal": "<1-2 sentences on what the palm reveals — dominant mount, hand shape, and which signs this points to. Omit if no palm photo was provided.>",
  "voiceSignal": "<1 sentence on what the voice reveals if voice data was provided, otherwise omit>"
}`;

  const userParts: string[] = [];

  if (analysisMode === 'face' || analysisMode === 'both') {
    if (userDescriptions.additionalFeatures || userDescriptions.faceNotes || userDescriptions.voiceNotes) {
      userParts.push('USER-PROVIDED PHYSICAL NOTES:');
      if (userDescriptions.faceNotes) userParts.push(`Face notes: ${userDescriptions.faceNotes}`);
      if (userDescriptions.additionalFeatures) userParts.push(`Additional features: ${userDescriptions.additionalFeatures}`);
    }
    if (photoBase64) {
      userParts.push('\nA FACE PHOTO has been provided. Please assess facial structure, complexion, eye shape, jaw, build impression, and overall bearing from the image.');
    } else if (clientPhotoAnalysis) {
      userParts.push('\nFACE PHOTO ANALYSIS (automated):');
      userParts.push(clientPhotoAnalysis);
    }
  }

  if ((analysisMode === 'palm' || analysisMode === 'both') && palmPhotoBase64) {
    userParts.push('\nA PALM PHOTO has been provided (dominant hand, palm facing up).');
    userParts.push('Please: (1) identify the hand shape (Earth/Air/Fire/Water), (2) note which mounts appear most prominent, (3) assess the major lines, and (4) return your sign likelihood assessment based on the palmistry RAG above.');
  }

  if (voiceTranscription || userDescriptions.voiceNotes) {
    userParts.push('\nVOICE ANALYSIS:');
    if (userDescriptions.voiceNotes) userParts.push(`User's self-described voice style: ${userDescriptions.voiceNotes}`);
    if (voiceTranscription) userParts.push(`Voice characteristics: ${voiceTranscription}`);
  }

  // Determine which model and message format to use
  const hasAnyPhoto = !!photoBase64 || !!palmPhotoBase64;
  const model = hasAnyPhoto ? VISION_MODEL : TEXT_MODEL;

  // Build multipart message for vision model
  let userMessageContent: string | Array<Record<string, unknown>>;
  if (hasAnyPhoto) {
    const parts: Array<Record<string, unknown>> = [{ type: 'text', text: userParts.join('\n') }];
    if (photoBase64) parts.push({ type: 'image_url', image_url: { url: photoBase64 } });
    if (palmPhotoBase64) parts.push({ type: 'image_url', image_url: { url: palmPhotoBase64 } });
    userMessageContent = parts;
  } else {
    userMessageContent = userParts.join('\n') || 'No physical description provided. Return uniform scores of 0.083 for all signs.';
  }

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent },
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
      palmSignal?: string;
      voiceSignal?: string;
    };

    const likelihoods = parsed.signLikelihoods ?? {};
    for (const sign of ALL_SIGNS) {
      if (typeof likelihoods[sign] !== 'number') likelihoods[sign] = 0.05;
    }

    const eliminatedSigns = ALL_SIGNS.filter(s => (likelihoods[s] ?? 0) < 0.15);
    const topSigns = [...ALL_SIGNS]
      .sort((a, b) => (likelihoods[b] ?? 0) - (likelihoods[a] ?? 0))
      .slice(0, 4);

    const reasoningParts = [parsed.reasoning];
    if (parsed.palmSignal) reasoningParts.push(parsed.palmSignal);
    if (parsed.voiceSignal) reasoningParts.push(parsed.voiceSignal);

    const result: AnalyzePhysicalResponse = {
      signLikelihoods: likelihoods,
      eliminatedSigns,
      reasoning: reasoningParts.join(' '),
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
