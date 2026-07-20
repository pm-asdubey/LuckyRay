/**
 * @luckyray/kp-rag
 *
 * KP Jyotish Retrieval-Augmented Generation (RAG) layer.
 *
 * This package provides:
 * 1. A curated, collision-free database of KP Jyotish rules (200+ rules
 *    across 15 topic sections).
 * 2. A retrieval module that selects the most relevant sections for a given
 *    chart + report topic — either via a lightweight AI call or a fast
 *    deterministic fallback.
 * 3. A formatter that turns selected sections into a prompt-ready text block
 *    for injection into the AI system prompt.
 *
 * Architecture Decision (ADR-017):
 *   A lightweight AI call (maxTokens: 200, temperature: 0) selects which
 *   sections to inject. This keeps the total context size bounded while
 *   ensuring the AI sees the most relevant KP principles for each query.
 *   If the selector call fails or returns invalid JSON, the package falls
 *   back to a deterministic topic-based selection with zero latency.
 */

export { getRulesForSections, RULE_SET, ALL_RULES } from './rules/index';
export type { KPRule, KPSection, KPRuleSet, ReportTopic, RAGSelectionInput } from './types';
export {
  buildRAGSelectorPayload,
  buildSelectorUserMessage,
  getDefaultSections,
  resolveSections,
} from './retrieval';
