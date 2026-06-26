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

export function useAIChat({
  chartContext,
  onToken,
  onComplete,
  onError,
}: UseAIChatOptions) {
  const abortRef = useRef<AbortController | null>(null);

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
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            onError(error.error ?? `HTTP ${response.status}`);
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) { onError('No response stream'); return; }

          const decoder = new TextDecoder();
          let buffer = '';
          let passText = '';
          let finishReason: string | null = null;

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
                const choice = json.choices?.[0];
                const delta = choice?.delta?.content;
                if (delta) {
                  passText += delta;
                  accumulatedText += delta;
                  onToken(delta);
                }
                if (choice?.finish_reason && choice.finish_reason !== 'null') {
                  finishReason = choice.finish_reason;
                }
              } catch {
                // Skip malformed SSE events
              }
            }
          }

          // Natural end — done
          if (finishReason !== 'length') {
            break;
          }

          // Token limit hit — set up continuation
          conversationMessages = [
            ...conversationMessages,
            { role: 'assistant', content: passText },
            { role: 'user', content: 'Continue.' },
          ];
        }

        onComplete(accumulatedText);
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
