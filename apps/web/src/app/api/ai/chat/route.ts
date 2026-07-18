import { NextRequest, NextResponse } from 'next/server';
import {
  buildSystemPrompt, buildRulesPrompt,
  buildUserModeSystemPrompt, buildAstrologerModeSystemPrompt,
  serializeChartContext,
} from '@luckyray/ai';
import type { AIMessage, ChartContext } from '@luckyray/shared';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.7;

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NVIDIA_API_KEY is not configured' },
      { status: 503 },
    );
  }

  let body: {
    messages: AIMessage[];
    chartContext?: ChartContext;
    model?: string;
    stream?: boolean;
    maxTokens?: number;
    systemPromptOverride?: string;
    systemMode?: 'user' | 'astrologer';
    language?: 'en' | 'hi';
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages, chartContext, model = DEFAULT_MODEL, stream = true, maxTokens = MAX_TOKENS, systemPromptOverride, systemMode = 'user', language = 'en' } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  // Build system content
  const chartText = chartContext ? serializeChartContext(chartContext) : '';
  let basePrompt: string;
  if (systemPromptOverride) {
    basePrompt = systemPromptOverride;
  } else if (systemMode === 'astrologer') {
    basePrompt = [buildAstrologerModeSystemPrompt(), buildRulesPrompt()].join('\n\n');
  } else {
    basePrompt = buildUserModeSystemPrompt();
  }

  const langInstruction = language === 'hi'
    ? 'LANGUAGE REQUIREMENT: You MUST respond entirely in Hindi using Devanagari script. This applies regardless of what language the user writes in. Do not use English except for planet names (which should use their Hindi equivalents: सूर्य, चंद्र, मंगल, बुध, गुरु, शुक्र, शनि, राहु, केतु) and rashi names (मेष, वृषभ, मिथुन, कर्क, सिंह, कन्या, तुला, वृश्चिक, धनु, मकर, कुंभ, मीन). Numbers may remain as digits (1, 2, 3…). Respond naturally and fluently in Hindi.'
    : '';

  const systemContent = [basePrompt, chartText, langInstruction].filter(Boolean).join('\n\n');

  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: TEMPERATURE,
        max_tokens: maxTokens,
        stream,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API error:', response.status, errorText);
      const headers: Record<string, string> = {};
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) headers['retry-after'] = retryAfter;
      return NextResponse.json(
        { error: `AI service error: ${response.status}`, status: response.status },
        { status: response.status, headers },
      );
    }

    if (!stream) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Stream response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                controller.enqueue(encoder.encode(trimmed + '\n\n'));
              }
            }
          }

          // Flush remaining buffer
          if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
            controller.enqueue(encoder.encode(buffer.trim() + '\n\n'));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to AI service' },
      { status: 502 },
    );
  }
}
