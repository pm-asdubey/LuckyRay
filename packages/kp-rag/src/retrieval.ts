import type { KPSection, RAGSelectionInput, ReportTopic } from './types';

// ─── Section catalogue available for AI selection ─────────────────────────────
const ALL_SECTIONS: KPSection[] = [
  'kp-fundamentals',
  'significators',
  'cuspal-sublords',
  'marriage',
  'career',
  'wealth',
  'health',
  'children-education',
  'property-vehicles',
  'foreign-travel',
  'timing-dasha',
  'ruling-planets',
  'planets',
  'transit',
  'special-combinations',
  'spirituality-moksha',
];

// ─── Deterministic baseline — always injected for every report type ───────────
const BASE_SECTIONS: KPSection[] = [
  'kp-fundamentals',
  'significators',
  'cuspal-sublords',
  'timing-dasha',
  'transit',
];

// ─── Topic-specific additions (hard-coded fast path) ─────────────────────────
const TOPIC_SECTIONS: Record<ReportTopic, KPSection[]> = {
  career:  ['career', 'planets', 'special-combinations', 'ruling-planets'],
  love:    ['marriage', 'planets', 'special-combinations', 'ruling-planets'],
  wealth:  ['wealth', 'property-vehicles', 'planets', 'special-combinations'],
  health:  ['health', 'planets', 'ruling-planets'],
  general: ['planets', 'special-combinations', 'ruling-planets', 'spirituality-moksha'],
};

// ─── System prompt for the AI section selector ────────────────────────────────
function buildSelectorSystemPrompt(): string {
  return `You are a KP Jyotish knowledge selector. Given a brief chart summary and a report topic, return a JSON array of the most relevant KP rule sections to inject into the analysis prompt.

Available sections:
${ALL_SECTIONS.map(s => `  - "${s}"`).join('\n')}

Rules:
- Return ONLY a valid JSON array of section IDs (strings). No other text.
- Choose 6–10 sections maximum.
- Always include: "kp-fundamentals", "significators", "cuspal-sublords", "timing-dasha", "transit".
- Add topic-specific sections based on the report type and chart highlights.
- If the chart shows foreign connections, add "foreign-travel".
- If special yogas or combinations are likely, add "special-combinations".
- Do not repeat sections.

Example output: ["kp-fundamentals","significators","cuspal-sublords","career","timing-dasha","transit","planets"]`;
}

// ─── User message for the AI selector ────────────────────────────────────────
export function buildSelectorUserMessage(input: RAGSelectionInput): string {
  const parts: string[] = [
    `Report topic: ${input.reportTopic}`,
    `Ascendant: ${input.ascendantSign}`,
    `Moon sign: ${input.moonSign}`,
    `Current Mahadasha: ${input.currentMahadasha}`,
    `Current Antardasha: ${input.currentAntardasha}`,
  ];

  if (input.cuspalSubLords && Object.keys(input.cuspalSubLords).length > 0) {
    parts.push('Key cuspal sub-lords:');
    for (const [cusp, subLord] of Object.entries(input.cuspalSubLords)) {
      parts.push(`  H${cusp}: ${subLord}`);
    }
  }

  return parts.join('\n');
}

// ─── Parse and validate AI response ─────────────────────────────────────────
function parseAISections(raw: string): KPSection[] | null {
  try {
    // Strip markdown code fences if the model added them
    const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter((s): s is KPSection =>
      typeof s === 'string' && (ALL_SECTIONS as string[]).includes(s),
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

// ─── Deterministic fallback — used when AI selection fails ───────────────────
export function getDefaultSections(topic: ReportTopic): KPSection[] {
  const extra = TOPIC_SECTIONS[topic] ?? [];
  return dedupe([...BASE_SECTIONS, ...extra]);
}

function dedupe(sections: KPSection[]): KPSection[] {
  return Array.from(new Set(sections));
}

// ─── Build the full selector request payload ─────────────────────────────────
export interface RAGSelectorPayload {
  systemPrompt: string;
  messages: Array<{ role: 'user'; content: string }>;
  maxTokens: number;
  temperature: number;
}

export function buildRAGSelectorPayload(input: RAGSelectionInput): RAGSelectorPayload {
  return {
    systemPrompt: buildSelectorSystemPrompt(),
    messages: [{ role: 'user', content: buildSelectorUserMessage(input) }],
    maxTokens: 200,
    temperature: 0,
  };
}

// ─── Post-process AI response into a validated section list ──────────────────
/**
 * Given the raw text returned by the AI selector call, parse and validate it.
 * Falls back to the deterministic topic baseline if parsing fails.
 */
export function resolveSections(
  aiResponseText: string,
  topic: ReportTopic,
): KPSection[] {
  const parsed = parseAISections(aiResponseText);
  if (parsed && parsed.length >= 3) {
    // Always guarantee the baseline sections are present
    return dedupe([...BASE_SECTIONS, ...parsed]);
  }
  return getDefaultSections(topic);
}
