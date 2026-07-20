// ─── KP RAG Types ─────────────────────────────────────────────────────────────

export type KPSection =
  | 'kp-fundamentals'
  | 'significators'
  | 'cuspal-sublords'
  | 'marriage'
  | 'career'
  | 'wealth'
  | 'health'
  | 'children-education'
  | 'property-vehicles'
  | 'foreign-travel'
  | 'timing-dasha'
  | 'ruling-planets'
  | 'planets'
  | 'transit'
  | 'special-combinations'
  | 'spirituality-moksha';

export interface KPRule {
  id: string;
  section: KPSection;
  subsection?: string;
  /** House numbers this rule primarily concerns (for context-aware filtering) */
  houses?: number[];
  /** Planet names this rule primarily concerns */
  planets?: string[];
  /** Additional search keywords */
  keywords?: string[];
  /** The authoritative rule text injected into the AI prompt */
  rule: string;
}

export interface KPRuleSet {
  version: string;
  totalRules: number;
  rules: KPRule[];
}

export type ReportTopic = 'career' | 'love' | 'wealth' | 'health' | 'general';

export interface RAGSelectionInput {
  reportTopic: ReportTopic;
  ascendantSign: string;
  moonSign: string;
  currentMahadasha: string;
  currentAntardasha: string;
  /** Key cuspal sub-lords for rapid relevance matching */
  cuspalSubLords?: Record<string, string>;
}
