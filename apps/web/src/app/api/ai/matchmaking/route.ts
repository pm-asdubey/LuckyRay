import { NextRequest, NextResponse } from 'next/server';
import { buildMatchmakingSystemPrompt, buildMatchmakingUserMessage } from '@luckyray/ai';
import { serializeChartContext } from '@luckyray/ai';
import type { ChartContext } from '@luckyray/shared';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.65;

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY is not configured' }, { status: 503 });
  }

  let body: {
    chart1Context: ChartContext;
    chart2Context: ChartContext;
    gunaMilanSummary: string;
    person1Name: string;
    person2Name: string;
    continuationMessages?: { role: 'user' | 'assistant'; content: string }[];
    language?: 'en' | 'hi';
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { chart1Context, chart2Context, gunaMilanSummary, person1Name, person2Name, continuationMessages, language = 'en' } = body;

  const chart1Summary = serializeChartContext(chart1Context);
  const chart2Summary = serializeChartContext(chart2Context);
  const baseSystemPrompt = buildMatchmakingSystemPrompt();
  const langInstruction = language === 'hi'
    ? 'LANGUAGE REQUIREMENT: You MUST respond entirely in Hindi using Devanagari script, regardless of what language the user writes in. Planet names in Hindi: सूर्य, चंद्र, मंगल, बुध, गुरु, शुक्र, शनि, राहु, केतु. Rashi names in Hindi: मेष, वृषभ, मिथुन, कर्क, सिंह, कन्या, तुला, वृश्चिक, धनु, मकर, कुंभ, मीन. Numbers may remain as digits.'
    : '';
  const systemContent = [baseSystemPrompt, langInstruction].filter(Boolean).join('\n\n');

  // For initial call, build the user message. For continuations, use the provided messages.
  const messages = continuationMessages && continuationMessages.length > 0
    ? continuationMessages
    : [{ role: 'user' as const, content: buildMatchmakingUserMessage(chart1Summary, chart2Summary, gunaMilanSummary, person1Name, person2Name) }];

  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages,
  ];

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: apiMessages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        stream: true,
        top_p: 1,
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

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }
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
    console.error('Matchmaking route error:', err);
    return NextResponse.json({ error: 'Failed to connect to AI service' }, { status: 502 });
  }
}
