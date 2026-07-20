/**
 * /api/ai/rag-select
 *
 * Lightweight AI call that selects which KP RAG sections are most relevant
 * for a given chart + report topic. Returns a JSON array of KPSection IDs.
 *
 * This is a non-streaming, low-latency route:
 *   - maxTokens: 200
 *   - temperature: 0 (deterministic)
 *   - No streaming — waits for the full response
 *
 * The caller falls back to deterministic section selection if this route
 * fails or returns invalid JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildRAGSelectorPayload, getDefaultSections } from '@luckyray/kp-rag';
import type { RAGSelectionInput, ReportTopic } from '@luckyray/kp-rag';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 503 });
  }

  let input: RAGSelectionInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const payload = buildRAGSelectorPayload(input);

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
          { role: 'system', content: payload.systemPrompt },
          ...payload.messages,
        ],
        max_tokens: payload.maxTokens,
        temperature: payload.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      // Fall back to deterministic selection on any API error
      const fallback = getDefaultSections(input.reportTopic as ReportTopic);
      return NextResponse.json({ sections: fallback, source: 'fallback' });
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ sections: content, source: 'ai' });
  } catch {
    const fallback = getDefaultSections(input.reportTopic as ReportTopic);
    return NextResponse.json({ sections: fallback, source: 'fallback' });
  }
}
