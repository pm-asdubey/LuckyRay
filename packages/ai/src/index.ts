/**
 * @luckyray/ai
 *
 * AI Engine — transforms deterministic chart data into conversational guidance.
 *
 * This package:
 * - Builds system prompts
 * - Builds optimized chart context
 * - Assembles complete prompt messages
 * - Does NOT call any AI API directly (that happens in the Next.js API route)
 *
 * AI Model Decision (ADR-013):
 *   Provider: NVIDIA NIM (https://integrate.api.nvidia.com/v1)
 *   Default model: meta/llama-3.1-70b-instruct
 *   Rationale:
 *   - OpenAI-compatible API (easy integration)
 *   - High-quality instruction following for contextual reasoning
 *   - Good performance for long-form explanatory text
 *   - Configurable via NVIDIA_MODEL env variable
 *   Trade-off: Requires internet connection; model may change availability.
 *   Future: Abstraction layer supports adding other providers (OpenAI, Anthropic, local).
 */

export { buildSystemPrompt, buildRulesPrompt, buildUserModeSystemPrompt, buildAstrologerModeSystemPrompt, PROMPT_VERSION } from './system-prompt';
export {
  buildChartContext,
  serializeChartContext,
  buildPromptMessages,
  detectQuestionTopic,
} from './context-builder';
export type { QuestionTopic } from './context-builder';

export { buildMatchmakingSystemPrompt, buildMatchmakingUserMessage } from './matchmaking-prompt';

export const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct';
export const MAX_TOKENS = 2048;
export const TEMPERATURE = 0.7;
