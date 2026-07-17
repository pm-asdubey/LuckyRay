'use client';

import { useCallback, useRef } from 'react';
import type { AIMessage, ChartContext } from '@luckyray/shared';

interface UseAIChatOptions {
  chartContext?: ChartContext;
  systemMode?: 'user' | 'astrologer';
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

const MAX_CONTINUATION_PASSES = 5;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 1500;
const CONTINUE_PROMPT = 'Continue from exactly where you left off.';

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
      const fr = choice?.finish_reason;
      if (typeof fr === 'string' && fr && fr !== 'null') finishReason = fr;
    } catch {
      // ignore malformed chunks
    }
  }
  return { content, finishReason };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useAIChat({
  chartContext,
  systemMode = 'user',
  onToken,
  onComplete,
  onError,
}: UseAIChatOptions) {
  const abortRef = useRef<AbortController | null>(null);

  // Stable refs to callbacks so closures never go stale between renders
  const onTokenRef = useRef(onToken);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runStream = useCallback(
    async (
      conversationMessages: AIMessage[],
      accumulatedText: string,
      onPartial?: (text: string) => void,
    ): Promise<{ success: true; text: string } | { success: false; error: string; partial: string }> => {
      let pass = 0;
      let messages = [...conversationMessages];
      let fullText = accumulatedText;

      while (pass < MAX_CONTINUATION_PASSES) {
        let lastError: string | null = null;
        let response: Response | null = null;

        // Retry loop for transient HTTP/network failures
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;

          try {
            response = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages, chartContext, stream: true, systemMode }),
              signal: controller.signal,
            });
            break; // Success — exit retry loop
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              return { success: false, error: 'Aborted', partial: fullText };
            }
            lastError = err instanceof Error ? err.message : 'Network error';
            if (attempt < MAX_RETRIES) {
              await sleep(RETRY_BACKOFF_MS * (attempt + 1));
            }
          }
        }

        if (!response) {
          return { success: false, error: lastError ?? 'Failed to connect to AI service', partial: fullText };
        }

        if (!response.ok) {
          const retryAfter = response.headers.get('retry-after');
          const retryAfterMs = retryAfter ? Math.max(1000, parseInt(retryAfter, 10) * 1000) : null;
          const err = await response.json().catch(() => ({ error: `AI service error: ${response.status}` }));

          // Retry on rate-limit (429) or server errors (5xx)
          if ((response.status === 429 || response.status >= 500) && retryAfterMs) {
            await sleep(retryAfterMs);
            continue; // retry the same pass
          }

          return { success: false, error: err.error ?? `AI service error: ${response.status}`, partial: fullText };
        }

        const reader = response.body?.getReader();
        if (!reader) {
          return { success: false, error: 'No response stream', partial: fullText };
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let passText = '';
        let finishReason: string | null = null;
        let receivedAnyChunk = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            receivedAnyChunk = true;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const event of events) {
              if (!event.trim() || event.trim() === 'data: [DONE]') continue;
              const { content, finishReason: fr } = parseSSEChunk(event);
              if (content) {
                passText += content;
                fullText += content;
                onTokenRef.current(content);
                onPartial?.(fullText);
              }
              if (fr) finishReason = fr;
            }
          }

          // Flush anything left in the buffer after the stream closes
          if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
            const { content, finishReason: fr } = parseSSEChunk(buffer);
            if (content) {
              passText += content;
              fullText += content;
              onTokenRef.current(content);
              onPartial?.(fullText);
            }
            if (fr) finishReason = fr;
          }
        } catch (err) {
          reader.releaseLock();
          if (err instanceof Error && err.name === 'AbortError') {
            return { success: false, error: 'Aborted', partial: fullText };
          }
          return { success: false, error: err instanceof Error ? err.message : 'Stream error', partial: fullText };
        } finally {
          reader.releaseLock();
        }

        // If the stream closed without any chunks, treat it as a system halt
        if (!receivedAnyChunk && passText === '') {
          return { success: false, error: 'AI response stream closed unexpectedly', partial: fullText };
        }

        // If model hit token limit, continue automatically
        if (finishReason === 'length') {
          messages = [
            ...messages,
            { role: 'assistant', content: passText },
            { role: 'user', content: CONTINUE_PROMPT },
          ];
          pass++;
          continue;
        }

        // Natural end or any other finish reason — stop
        return { success: true, text: fullText };
      }

      return { success: true, text: fullText };
    },
    [chartContext, systemMode],
  );

  const send = useCallback(
    async (initialMessages: AIMessage[]) => {
      const result = await runStream(initialMessages, '');
      if (result.success) {
        onCompleteRef.current(result.text);
      } else {
        onErrorRef.current(result.error);
      }
    },
    [runStream],
  );

  /**
   * Continue a previously halted assistant response.
   * `partialAssistantText` is appended as an assistant message, followed by a
   * user "continue" prompt, then the stream resumes.
   */
  const continueResponse = useCallback(
    async (messages: AIMessage[], partialAssistantText: string) => {
      const continuationMessages: AIMessage[] = [
        ...messages,
        { role: 'assistant', content: partialAssistantText },
        { role: 'user', content: CONTINUE_PROMPT },
      ];
      const result = await runStream(continuationMessages, partialAssistantText);
      if (result.success) {
        onCompleteRef.current(result.text);
      } else {
        onErrorRef.current(result.error);
      }
    },
    [runStream],
  );

  return { send, continue: continueResponse, abort };
}
