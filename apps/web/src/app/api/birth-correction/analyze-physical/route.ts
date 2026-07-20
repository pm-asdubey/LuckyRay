/**
 * POST /api/birth-correction/analyze-physical
 *
 * AI call that analyzes physical appearance (face photo, palm photo, voice notes)
 * to produce a likelihood score for each of the 12 rising signs.
 *
 * IMPORTANT ARCHITECTURE NOTES:
 * - Must use Node.js runtime (not edge) — base64 photos are 2–6 MB each,
 *   which exceeds the 4 MB edge function body limit.
 * - When photos are provided we use the vision model with a COMPACT system prompt.
 *   The full sign profiles + palmistry RAG are too large for a single vision call
 *   (combined with image tokens they hit the model context limit). Instead we rely
 *   on the model's training knowledge and provide targeted keywords.
 * - Face and palm are analyzed in one call when both are present. If the vision
 *   model rejects multiple images we fall back to face-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { serializeSignProfiles, serializePalmistryRAG } from '@luckyray/birth-correction';
import type { AnalyzePhysicalPayload, AnalyzePhysicalResponse } from '@luckyray/birth-correction';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const TEXT_MODEL  = 'meta/llama-3.1-70b-instruct';
const VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct';

// Node.js runtime — handles large base64 image payloads without body-size limits
export const runtime = 'nodejs';

const ALL_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Compact sign keywords for vision calls (avoids context overflow with image tokens)
const COMPACT_SIGN_KEYWORDS = `
Aries: sharp angular features, prominent brow, reddish tinge, athletic wiry build, direct intense gaze
Taurus: square round face, full lips, stocky solid build, large eyes, graceful deliberate movement
Gemini: youthful expressive face, quick eyes, slender animated build, lively hands, changeable expression
Cancer: round soft face, pale full cheeks, maternal bearing, soft eyes, gentle nurturing quality
Leo: mane-like hair, broad forehead, strong jaw, upright dignified posture, commanding warm presence
Virgo: fine delicate features, alert eyes, neat appearance, slender or medium build, precise careful air
Libra: symmetrical balanced face, refined pleasant features, graceful dimples, charming poised manner
Scorpio: intense penetrating eyes, strong brow, magnetic brooding presence, sharp often angular features
Sagittarius: long oval face, athletic build, open expansive expression, cheerful free-spirited movement
Capricorn: lean angular bony face, serious reserved expression, prominent cheekbones, disciplined bearing
Aquarius: distinctive unusual features, broad forehead, detached observing gaze, unconventional style
Pisces: dreamy soft large eyes, gentle melancholic expression, soft rounded features, ethereal quality
`.trim();

// Compact palmistry reference for vision calls
const COMPACT_PALM_KEYWORDS = `
Dominant mount reveals ruling planet — assess which mount is most raised/firm:
Mount of Jupiter (index base) = Jupiter — Sagittarius/Pisces rising
Mount of Saturn (middle base) = Saturn — Capricorn/Aquarius rising
Mount of Apollo/Sun (ring base) = Sun — Leo rising
Mount of Mercury (little base) = Mercury — Gemini/Virgo rising
Mount of Venus (thumb base, fleshy pad) = Venus — Taurus/Libra rising
Mount of Moon (outer lower palm) = Moon — Cancer rising
Mount of Mars (between thumb and lifeline) = Mars — Aries/Scorpio rising
Hand shape: Earth (square palm, short fingers) = Taurus/Virgo/Capricorn
            Air (square palm, long fingers) = Gemini/Libra/Aquarius
            Fire (oblong palm, short fingers) = Aries/Leo/Sagittarius
            Water (oblong palm, long fingers) = Cancer/Scorpio/Pisces
`.trim();

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

  const {
    userDescriptions,
    voiceTranscription,
    photoBase64,
    palmPhotoBase64,
    analysisMode = 'face',
  } = payload;

  const hasAnyPhoto = !!photoBase64 || !!palmPhotoBase64;

  if (hasAnyPhoto) {
    return analyzeWithVision(apiKey, {
      photoBase64,
      palmPhotoBase64,
      analysisMode,
      faceNotes: userDescriptions?.faceNotes ?? '',
      additionalFeatures: userDescriptions?.additionalFeatures ?? '',
      voiceNotes: userDescriptions?.voiceNotes ?? '',
    });
  }

  // Text-only path (voice description, no photos)
  return analyzeTextOnly(apiKey, {
    faceNotes: userDescriptions?.faceNotes ?? '',
    additionalFeatures: userDescriptions?.additionalFeatures ?? '',
    voiceNotes: userDescriptions?.voiceNotes ?? '',
    voiceTranscription,
  });
}

// ── Vision analysis path ──────────────────────────────────────────────────────

async function analyzeWithVision(
  apiKey: string,
  opts: {
    photoBase64?: string;
    palmPhotoBase64?: string;
    analysisMode: string;
    faceNotes: string;
    additionalFeatures: string;
    voiceNotes: string;
  },
): Promise<NextResponse> {
  const { photoBase64, palmPhotoBase64, analysisMode, faceNotes, additionalFeatures, voiceNotes } = opts;

  const systemPrompt = buildVisionSystemPrompt(analysisMode);

  const textParts: string[] = [];
  if (opts.faceNotes || additionalFeatures) {
    textParts.push('USER NOTES:');
    if (faceNotes) textParts.push(`Face: ${faceNotes}`);
    if (additionalFeatures) textParts.push(`Additional: ${additionalFeatures}`);
  }
  if (voiceNotes) textParts.push(`Voice style: ${voiceNotes}`);

  if (photoBase64) {
    textParts.push(analysisMode === 'palm'
      ? 'Analyze this image as a PALM photo — look for hand shape and dominant mounts.'
      : 'Analyze this FACE photo — assess facial structure, eyes, complexion, and bearing.');
  }
  if (palmPhotoBase64 && analysisMode === 'both') {
    textParts.push('A PALM photo is also included — identify hand shape and dominant mount.');
  }

  const userParts: Array<Record<string, unknown>> = [
    { type: 'text', text: textParts.join('\n') || 'Please analyze the provided image(s).' },
  ];

  // Attach photos — face first, then palm
  if (photoBase64 && analysisMode !== 'palm') {
    userParts.push({ type: 'image_url', image_url: { url: photoBase64 } });
  }
  if (palmPhotoBase64) {
    // If vision model rejects two images we fall back; for now try face photo first if both present
    if (analysisMode === 'palm') {
      userParts.push({ type: 'image_url', image_url: { url: palmPhotoBase64 } });
    } else if (analysisMode === 'both' && !photoBase64) {
      userParts.push({ type: 'image_url', image_url: { url: palmPhotoBase64 } });
    } else if (analysisMode === 'both' && photoBase64) {
      // Some vision models don't support multiple images — add palm as second image but
      // if this fails we'll fall back to face-only in the error handler
      userParts.push({ type: 'image_url', image_url: { url: palmPhotoBase64 } });
    }
  }

  try {
    const response = await fetchNVIDIA(apiKey, VISION_MODEL, systemPrompt, userParts);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[analyze-physical] vision model error:', response.status, errText.slice(0, 500));

      // If multi-image failed and we have a face photo, retry with face only
      if (photoBase64 && palmPhotoBase64 && analysisMode === 'both') {
        console.warn('[analyze-physical] retrying with face photo only');
        return analyzeWithVision(apiKey, { ...opts, palmPhotoBase64: undefined, analysisMode: 'face' });
      }

      return NextResponse.json(buildUniformResponse(`Vision model error: ${response.status}`));
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data?.choices?.[0]?.message?.content ?? '';
    return parseAndReturnResult(content, `Vision analysis error — content: ${content.slice(0, 200)}`);

  } catch (err) {
    console.error('[analyze-physical] vision exception:', err);
    // Retry with just text if vision completely fails
    return analyzeTextOnly(apiKey, {
      faceNotes: opts.faceNotes,
      additionalFeatures: opts.additionalFeatures,
      voiceNotes: opts.voiceNotes,
    });
  }
}

// ── Text-only analysis path ───────────────────────────────────────────────────

async function analyzeTextOnly(
  apiKey: string,
  opts: {
    faceNotes: string;
    additionalFeatures: string;
    voiceNotes: string;
    voiceTranscription?: string;
  },
): Promise<NextResponse> {
  const signProfilesBlock = serializeSignProfiles();

  const systemPrompt = `You are a KP Jyotish birth time rectification assistant.
Analyze the user's self-description and assign rising sign likelihood scores (0.0–1.0).

${signProfilesBlock}

Return ONLY valid JSON:
{"signLikelihoods":{"Aries":<float>,...all 12 signs...},"reasoning":"<2 sentences>"}`;

  const parts: string[] = [];
  if (opts.faceNotes) parts.push(`Appearance notes: ${opts.faceNotes}`);
  if (opts.additionalFeatures) parts.push(`Additional features: ${opts.additionalFeatures}`);
  if (opts.voiceNotes) parts.push(`Voice style: ${opts.voiceNotes}`);
  if (opts.voiceTranscription) parts.push(`Voice transcription: ${opts.voiceTranscription}`);

  if (!parts.length) {
    return NextResponse.json(buildUniformResponse('No description provided'));
  }

  try {
    const response = await fetchNVIDIA(apiKey, TEXT_MODEL, systemPrompt, parts.join('\n'));
    if (!response.ok) {
      console.error('[analyze-physical] text model error:', response.status);
      return NextResponse.json(buildUniformResponse('Text model error'));
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data?.choices?.[0]?.message?.content ?? '';
    return parseAndReturnResult(content, 'Text parse error');
  } catch (err) {
    console.error('[analyze-physical] text exception:', err);
    return NextResponse.json(buildUniformResponse('Unexpected error'));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildVisionSystemPrompt(analysisMode: string): string {
  const usesPalm = analysisMode === 'palm' || analysisMode === 'both';
  return `You are a KP Jyotish birth time rectification assistant analyzing visual evidence.

RISING SIGN APPEARANCE KEYWORDS:
${COMPACT_SIGN_KEYWORDS}

${usesPalm ? `PALMISTRY MOUNT KEYWORDS:\n${COMPACT_PALM_KEYWORDS}\n` : ''}
TASK: Examine the image(s) carefully and score each of the 12 rising signs (0.0–1.0).
- Scores are independent likelihoods, not percentages that sum to 1.
- Signs with no matching features: minimum 0.05 (planetary energy can override appearance).
- If image quality is low or unclear, keep scores closer together (max spread of 0.3).
- Base your assessment on structural features, not ethnicity or skin tone.

Respond ONLY with valid JSON — no extra text:
{
  "signLikelihoods": {"Aries":<f>,"Taurus":<f>,"Gemini":<f>,"Cancer":<f>,"Leo":<f>,"Virgo":<f>,"Libra":<f>,"Scorpio":<f>,"Sagittarius":<f>,"Capricorn":<f>,"Aquarius":<f>,"Pisces":<f>},
  "reasoning": "<2-3 sentences: which features you observed and which signs they point to>",
  "palmSignal": "<1 sentence on dominant mount and hand shape, omit if no palm image>"
}`;
}

async function fetchNVIDIA(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string | Array<Record<string, unknown>>,
): Promise<Response> {
  return fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 600,
      temperature: 0.15,
      stream: false,
    }),
  });
}

function parseAndReturnResult(content: string, fallbackReason: string): NextResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[analyze-physical] no JSON in response:', content.slice(0, 300));
    return NextResponse.json(buildUniformResponse(fallbackReason));
  }

  let parsed: {
    signLikelihoods: Record<string, number>;
    reasoning?: string;
    palmSignal?: string;
    voiceSignal?: string;
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('[analyze-physical] JSON parse failed:', jsonMatch[0].slice(0, 300));
    return NextResponse.json(buildUniformResponse('JSON parse error'));
  }

  const likelihoods = parsed.signLikelihoods ?? {};
  for (const sign of ALL_SIGNS) {
    if (typeof likelihoods[sign] !== 'number') likelihoods[sign] = 0.05;
    else likelihoods[sign] = Math.max(0.01, Math.min(1.0, likelihoods[sign]));
  }

  const eliminatedSigns = ALL_SIGNS.filter(s => (likelihoods[s] ?? 0) < 0.15);
  const topSigns = [...ALL_SIGNS].sort((a, b) => (likelihoods[b] ?? 0) - (likelihoods[a] ?? 0)).slice(0, 4);

  const reasoningParts = [parsed.reasoning ?? 'Analysis complete.'];
  if (parsed.palmSignal) reasoningParts.push(parsed.palmSignal);
  if (parsed.voiceSignal) reasoningParts.push(parsed.voiceSignal);

  const result: AnalyzePhysicalResponse = {
    signLikelihoods: likelihoods,
    eliminatedSigns,
    reasoning: reasoningParts.join(' '),
    topSigns,
  };

  return NextResponse.json(result);
}

function buildUniformResponse(reason = 'Analysis unavailable'): AnalyzePhysicalResponse {
  const uniform = Object.fromEntries(ALL_SIGNS.map(s => [s, 1 / 12]));
  return {
    signLikelihoods: uniform,
    eliminatedSigns: [],
    reasoning: `${reason}. All signs remain equally probable — continuing with life event evidence.`,
    topSigns: ALL_SIGNS.slice(0, 4),
  };
}
