'use client';

import { useCallback, useRef } from 'react';
import type { AIMessage, ChartContext } from '@luckyray/shared';

interface UseAIChatOptions {
  chartContext?: ChartContext;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

const MAX_CONTINUATION_PASSES = 5;

/**
 * Parse SSE lines from a buffer split on '\n\n'.
 * Returns { tokens, finishReason } extracted from the batch.
 */
function parseSSEChunk(raw: string): { content: string; finishReason: string | null } {
  let content = '';
  let finishReason: string | null = null;
  for (const part of raw.split('\n')) {
    const line = part.trim();
    if (!line || !line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const json = JSON.parse(line.slice(6));
      const choice = json.choices?.[0];
      const delta = choice?.delta?.content;
      if (typeof delta === 'string' && delta) content += delta;
      // finish_reason is the string "stop"/"length"/null-json-value
      const fr = choice?.finish_reason;
      if (typeof fr === 'string' && fr && fr !== 'null') finishReason = fr;
    } catch {
      // ignore malformed chunks
    }
  }
  return { content, finishReason };
}

export function useAIChat({
  chartContext,
  onToken,
  onComplete,
  onError,
}: UseAIChatOptions) {
  const abortRef = useRef<AbortController | null>(null);

  // Stable refs to callbacks so 'send' closure never goes stale between renders
  const onTokenRef = useRef(onToken);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const send = useCallback(
    async (initialMessages: AIMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let accumulatedText = '';
      let conversationMessages = [...initialMessages];

      try {
        for (let pass = 0; pass < MAX_CONTINUATION_PASSES; pass++) {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationMessages, chartContext, stream: true }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Request failed' }));
            onErrorRef.current(err.error ?? `HTTP ${response.status}`);
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) { onErrorRef.current('No response stream'); return; }

          const decoder = new TextDecoder();
          let buffer = '';
          let passText = '';
          let finishReason: string | null = null;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              // SSE events are double-newline delimited; keep the last incomplete segment
              const events = buffer.split('\n\n');
              buffer = events.pop() ?? '';

              for (const event of events) {
                if (!event.trim() || event.trim() === 'data: [DONE]') continue;
                const { content, finishReason: fr } = parseSSEChunk(event);
                if (content) {
                  passText += content;
                  accumulatedText += content;
                  onTokenRef.current(content);
                }
                if (fr) finishReason = fr;
              }
            }

            // Flush anything left in the buffer after the stream closes
            if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
              const { content, finishReason: fr } = parseSSEChunk(buffer);
              if (content) {
                passText += content;
                accumulatedText += content;
                onTokenRef.current(content);
              }
              if (fr) finishReason = fr;
            }
          } finally {
            reader.releaseLock();
          }

          // If model hit token limit, send continuation
          if (finishReason === 'length') {
            conversationMessages = [
              ...conversationMessages,
              { role: 'assistant', content: passText },
              { role: 'user', content: 'Continue from exactly where you left off.' },
            ];
            continue;
          }

          // Natural end or unknown — stop
          break;
        }

        onCompleteRef.current(accumulatedText);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        onErrorRef.current(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    // chartContext is the only external dep — callbacks use stable refs
    [chartContext],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, abort };
}
