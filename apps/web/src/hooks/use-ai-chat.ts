'use client';

import { useCallback, useRef } from 'react';
import type { AIMessage, ChartContext } from '@luckyray/shared';

interface UseAIChatOptions {
  chartContext?: ChartContext;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

export function useAIChat({
  chartContext,
  onToken,
  onComplete,
  onError,
}: UseAIChatOptions) {
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (messages: AIMessage[]) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, chartContext, stream: true }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Request failed' }));
          onError(error.error ?? `HTTP ${response.status}`);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onError('No response stream');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.trim();
            if (!line || line === 'data: [DONE]') continue;
            if (!line.startsWith('data: ')) continue;

            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onToken(delta);
              }
            } catch {
              // Skip malformed SSE events
            }
          }
        }

        onComplete(fullText);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        onError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [chartContext, onToken, onComplete, onError],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, abort };
}
