import type { KPRule, KPSection, KPRuleSet } from '../types';
import { kpFundamentals } from './01-kp-fundamentals';
import { significators } from './02-significators';
import { cuspalSubLords } from './03-cuspal-sublords';
import { marriage } from './04-marriage';
import { career } from './05-career';
import { wealth } from './06-wealth';
import { health } from './07-health';
import { childrenEducation } from './08-children-education';
import { propertyForeign } from './09-property-foreign';
import { timingDasha } from './10-timing-dasha';
import { rulingPlanets } from './11-ruling-planets';
import { planets } from './12-planets';
import { transit } from './13-transit';
import { specialCombinations } from './14-special-combinations';
import { spiritualityMoksha } from './15-spirituality-moksha';

export const ALL_RULES: KPRule[] = [
  ...kpFundamentals,
  ...significators,
  ...cuspalSubLords,
  ...marriage,
  ...career,
  ...wealth,
  ...health,
  ...childrenEducation,
  ...propertyForeign,
  ...timingDasha,
  ...rulingPlanets,
  ...planets,
  ...transit,
  ...specialCombinations,
  ...spiritualityMoksha,
];

export const RULE_SET: KPRuleSet = {
  version: '1.0.0',
  totalRules: ALL_RULES.length,
  rules: ALL_RULES,
};

/**
 * Return rules for the requested sections, formatted as a single text block
 * ready for injection into the AI system prompt.
 */
export function getRulesForSections(sections: KPSection[]): string {
  if (sections.length === 0) return '';

  const sectionSet = new Set<KPSection>(sections);
  const relevant = ALL_RULES.filter(r => sectionSet.has(r.section));

  if (relevant.length === 0) return '';

  const grouped = new Map<KPSection, KPRule[]>();
  for (const rule of relevant) {
    const bucket = grouped.get(rule.section) ?? [];
    bucket.push(rule);
    grouped.set(rule.section, bucket);
  }

  const SECTION_LABELS: Record<KPSection, string> = {
    'kp-fundamentals':      'KP Fundamentals',
    'significators':        'KP Significator Rules',
    'cuspal-sublords':      'Cuspal Sub-Lord Rules',
    'marriage':             'Marriage & Partnership',
    'career':               'Career & Profession',
    'wealth':               'Wealth & Finance',
    'health':               'Health & Vitality',
    'children-education':   'Children & Education',
    'property-vehicles':    'Property & Vehicles',
    'foreign-travel':       'Foreign Travel & Settlement',
    'timing-dasha':         'Dasha Timing Rules',
    'ruling-planets':       'Ruling Planets (KP)',
    'planets':              'Planet Significations (KP)',
    'transit':              'Transit (Gochar) Rules',
    'special-combinations': 'Special Combinations & Yogas',
    'spirituality-moksha':  'Spirituality & Moksha',
  };

  const lines: string[] = [
    '── VERIFIED KP JYOTISH PRINCIPLES ─────────────────────────',
    'Apply the following KP rules precisely when forming your analysis.',
    'These override general Vedic assumptions where they conflict.',
    '',
  ];

  for (const [section, rules] of grouped.entries()) {
    lines.push(`▸ ${SECTION_LABELS[section] ?? section}`);
    for (const r of rules) {
      lines.push(`  • ${r.rule}`);
    }
    lines.push('');
  }

  lines.push('────────────────────────────────────────────────────────────');
  return lines.join('\n');
}

export { ALL_RULES as rules };
export type { KPRule, KPSection };
