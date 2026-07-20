/**
 * Subjective non-time-period questions for birth time rectification.
 *
 * These questions reveal the person's character, interests, and inclinations —
 * all of which are expressions of the rising sign's nature and its lord.
 * They help narrow the birth time window independently of life events and dasha periods.
 *
 * The AI uses the answers to apply likelihood updates to candidate signs/sub-lords.
 */

import type { PlanetId } from '@luckyray/shared';

export interface SubjectiveQuestion {
  id: string;
  questionText: string;
  hint: string;
  /** Primary KP indicators this question reveals */
  reveals: {
    planets: PlanetId[];
    houses: number[];
  };
  /** Domain tag for deduplication */
  domain: 'personality' | 'education' | 'interests' | 'social' | 'body-health' | 'values' | 'arts';
  /**
   * If present, the question includes a 1–5 scale in the UI.
   * lowLabel and highLabel describe the extremes.
   */
  scale?: {
    lowLabel: string;
    highLabel: string;
  };
}

export const SUBJECTIVE_QUESTIONS: SubjectiveQuestion[] = [

  // ── Education & Intellect ─────────────────────────────────────────────────
  {
    id: 'subj-education-field',
    questionText: 'What field did you study, or are most drawn to intellectually — sciences, arts, law, commerce, medicine, engineering, humanities, or something else?',
    hint: 'Include what you formally studied and what genuinely interests you if they differ.',
    reveals: { planets: ['Mercury', 'Jupiter', 'Saturn'], houses: [4, 5, 9] },
    domain: 'education',
  },
  {
    id: 'subj-learning-style',
    questionText: 'How do you prefer to learn — through reading and research, hands-on practice, listening and discussion, or observation?',
    hint: 'There is no right answer — just what feels most natural to you.',
    reveals: { planets: ['Mercury', 'Jupiter', 'Moon', 'Saturn'], houses: [3, 5] },
    domain: 'education',
  },
  {
    id: 'subj-subject-passion',
    questionText: 'Which subjects or fields genuinely fascinate you — the kind you read about even when you do not have to?',
    hint: 'Include both academic interests and informal curiosities.',
    reveals: { planets: ['Jupiter', 'Mercury', 'Sun', 'Venus', 'Ketu'], houses: [5, 9] },
    domain: 'education',
  },

  // ── Arts & Creative Pursuits ──────────────────────────────────────────────
  {
    id: 'subj-arts-music',
    questionText: 'Have you ever seriously pursued music — playing an instrument, singing, or composing — even as a hobby or in school?',
    hint: 'Even a brief period of dedicated practice counts. Describe your instrument or voice type if relevant.',
    reveals: { planets: ['Venus', 'Moon', 'Mercury'], houses: [2, 5] },
    domain: 'arts',
  },
  {
    id: 'subj-arts-visual',
    questionText: 'Have you practiced any visual arts — painting, drawing, photography, sculpture, design, or similar?',
    hint: 'Include both formal study and personal practice at any level.',
    reveals: { planets: ['Venus', 'Moon', 'Mercury', 'Sun'], houses: [5, 3] },
    domain: 'arts',
  },
  {
    id: 'subj-arts-writing',
    questionText: 'Have you ever written creatively — fiction, poetry, journaling, blogging, or screenwriting — even privately?',
    hint: 'All forms count, including private diaries.',
    reveals: { planets: ['Mercury', 'Moon', 'Venus', 'Jupiter'], houses: [3, 5] },
    domain: 'arts',
  },
  {
    id: 'subj-arts-performance',
    questionText: 'Have you been drawn to performing arts — theatre, dance, public speaking, or presentation?',
    hint: 'This includes formal training as well as natural comfort being in front of people.',
    reveals: { planets: ['Sun', 'Venus', 'Mars', 'Mercury'], houses: [1, 5] },
    domain: 'arts',
  },

  // ── Personality & Character ────────────────────────────────────────────────
  {
    id: 'subj-personality-core',
    questionText: 'How would your closest friends describe you — your most consistent trait that shows up no matter the situation?',
    hint: 'Think about the quality people always mention when they talk about you.',
    reveals: { planets: ['Sun', 'Moon', 'Mercury', 'Mars', 'Jupiter', 'Venus', 'Saturn'], houses: [1] },
    domain: 'personality',
  },
  {
    id: 'subj-decision-making',
    questionText: 'When facing a major decision, do you tend to analyze and research extensively, trust your gut instinct, consult others, or follow established rules and principles?',
    hint: 'Think of how you actually behave, not how you think you should.',
    reveals: { planets: ['Mercury', 'Moon', 'Jupiter', 'Saturn', 'Mars'], houses: [1, 5] },
    domain: 'personality',
  },
  {
    id: 'subj-social-energy',
    questionText: 'Do you feel energized after spending time with many people, or do you prefer fewer, deeper connections and need time alone to recharge?',
    hint: 'This is about energy, not preference — which genuinely leaves you feeling better?',
    reveals: { planets: ['Moon', 'Mercury', 'Jupiter', 'Saturn', 'Ketu'], houses: [1, 3, 11] },
    domain: 'social',
  },
  {
    id: 'subj-risk-attitude',
    questionText: 'How do you relate to risk — do you tend to seek out new challenges and novelty, or do you prefer stability and certainty?',
    hint: 'Think of major decisions in your life — were they generally bold moves or careful ones?',
    reveals: { planets: ['Mars', 'Rahu', 'Saturn', 'Moon', 'Jupiter'], houses: [1, 5, 8] },
    domain: 'personality',
  },
  {
    id: 'subj-conflict-style',
    questionText: 'When you are in conflict or disagreement, do you tend to confront it directly, withdraw, seek compromise, or work diplomatically behind the scenes?',
    hint: 'Your natural instinct, not what you think is correct.',
    reveals: { planets: ['Mars', 'Venus', 'Saturn', 'Moon', 'Sun'], houses: [1, 7] },
    domain: 'personality',
  },

  // ── Body & Health Inclinations ─────────────────────────────────────────────
  {
    id: 'subj-body-type',
    questionText: 'How would you describe your natural body type and energy level — are you generally high-energy or calmer, heavier or lighter in build?',
    hint: 'Not what you are now after exercise or diet, but what comes naturally without effort.',
    reveals: { planets: ['Sun', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Venus'], houses: [1] },
    domain: 'body-health',
  },
  {
    id: 'subj-sleep',
    questionText: 'Are you naturally an early riser or a night person? Has this been consistent throughout your life?',
    hint: 'The tendency you default to when you have no external pressure.',
    reveals: { planets: ['Sun', 'Moon', 'Saturn', 'Rahu', 'Ketu'], houses: [1, 12] },
    domain: 'body-health',
  },
  {
    id: 'subj-health-pattern',
    questionText: 'Is there a recurring area of the body where health issues tend to cluster for you — digestive, respiratory, joints, head, or somewhere else?',
    hint: 'Recurring patterns matter more than isolated incidents.',
    reveals: { planets: ['Mars', 'Saturn', 'Moon', 'Ketu', 'Rahu'], houses: [1, 6] },
    domain: 'body-health',
  },

  // ── Values & Life Philosophy ───────────────────────────────────────────────
  {
    id: 'subj-values-core',
    questionText: 'What do you consider the most important quality in a person — honesty, intelligence, kindness, loyalty, ambition, creativity, or something else?',
    hint: 'The quality you genuinely admire most and try to embody.',
    reveals: { planets: ['Sun', 'Moon', 'Mercury', 'Jupiter', 'Venus', 'Saturn'], houses: [1, 9] },
    domain: 'values',
  },
  {
    id: 'subj-spiritual-inclination',
    questionText: 'How would you describe your relationship with religion or spirituality — deeply practicing, casually connected, philosophically interested, or sceptical?',
    hint: 'What actually describes your life, not what you were raised with.',
    reveals: { planets: ['Jupiter', 'Ketu', 'Saturn', 'Rahu'], houses: [9, 12] },
    domain: 'values',
  },
  {
    id: 'subj-achievement-drive',
    questionText: 'Is your deepest sense of fulfillment driven by achievement and recognition, by relationships and belonging, by inner peace and understanding, or by service to others?',
    hint: 'There is no correct answer — which genuinely gives you the deepest satisfaction?',
    reveals: { planets: ['Sun', 'Moon', 'Jupiter', 'Saturn', 'Venus', 'Ketu'], houses: [1, 4, 10] },
    domain: 'values',
  },

  // ── Interests & Hobbies ───────────────────────────────────────────────────
  {
    id: 'subj-interests-general',
    questionText: 'What do you spend free time on when you have complete freedom — what would you do on an ideal free day?',
    hint: 'Think of what you actually end up doing, not what you feel you should do.',
    reveals: { planets: ['Venus', 'Moon', 'Mercury', 'Jupiter', 'Sun', 'Mars', 'Ketu'], houses: [3, 5, 12] },
    domain: 'interests',
  },
  {
    id: 'subj-interests-sports',
    questionText: 'Have you been drawn to competitive sports, physical training, or martial arts at any point in your life?',
    hint: 'Even casual interest or a few years of playing counts.',
    reveals: { planets: ['Mars', 'Sun', 'Saturn', 'Rahu'], houses: [1, 3, 6] },
    domain: 'interests',
  },
  {
    id: 'subj-interests-technology',
    questionText: 'Are you naturally drawn to technology, systems, engineering, or how things work — or is this more of an obligation than an interest?',
    hint: 'How you relate to technical complexity in your daily life.',
    reveals: { planets: ['Mercury', 'Saturn', 'Rahu', 'Ketu'], houses: [3, 10] },
    domain: 'interests',
  },

  // ── Scale questions ────────────────────────────────────────────────────────
  {
    id: 'subj-scale-spiritual',
    questionText: 'How spiritual or religiously inclined are you?',
    hint: '1 = completely non-religious, 5 = deeply and actively spiritual or devout. Add details about what this looks like for you.',
    reveals: { planets: ['Jupiter', 'Ketu', 'Saturn'], houses: [9, 12] },
    domain: 'values',
    scale: { lowLabel: 'Not at all spiritual', highLabel: 'Deeply devout' },
  },
  {
    id: 'subj-scale-extroversion',
    questionText: 'How extroverted or socially oriented are you?',
    hint: '1 = very introverted, 5 = very extroverted. Describe what social situations feel like for you.',
    reveals: { planets: ['Moon', 'Mercury', 'Jupiter', 'Saturn', 'Ketu'], houses: [1, 3, 11] },
    domain: 'social',
    scale: { lowLabel: 'Very introverted', highLabel: 'Very extroverted' },
  },
  {
    id: 'subj-scale-organization',
    questionText: 'How structured and organized is your natural approach to life?',
    hint: '1 = very spontaneous and go-with-the-flow, 5 = highly systematic and organized.',
    reveals: { planets: ['Saturn', 'Mercury', 'Mars', 'Moon', 'Ketu'], houses: [1, 6, 10] },
    domain: 'personality',
    scale: { lowLabel: 'Very spontaneous', highLabel: 'Highly structured' },
  },
  {
    id: 'subj-scale-emotional',
    questionText: 'How emotionally expressive are you?',
    hint: '1 = very reserved and private with feelings, 5 = openly and easily expressive. You can add context below.',
    reveals: { planets: ['Moon', 'Venus', 'Mars', 'Saturn', 'Ketu'], houses: [1, 4, 5] },
    domain: 'personality',
    scale: { lowLabel: 'Very reserved', highLabel: 'Openly expressive' },
  },
  {
    id: 'subj-scale-risk',
    questionText: 'How much of a risk-taker are you in life decisions?',
    hint: '1 = very cautious and security-seeking, 5 = comfortable with high risk and uncertainty.',
    reveals: { planets: ['Mars', 'Rahu', 'Saturn', 'Moon', 'Jupiter'], houses: [1, 5, 8] },
    domain: 'personality',
    scale: { lowLabel: 'Very cautious', highLabel: 'High risk tolerance' },
  },
  {
    id: 'subj-scale-ambition',
    questionText: 'How driven by achievement and external success are you?',
    hint: '1 = contentment matters more than achievement, 5 = deeply motivated by accomplishment and recognition.',
    reveals: { planets: ['Sun', 'Mars', 'Saturn', 'Rahu', 'Jupiter'], houses: [1, 10, 11] },
    domain: 'values',
    scale: { lowLabel: 'Inner peace over success', highLabel: 'Highly achievement-driven' },
  },
];

/** Returns the count of subjective questions available */
export const SUBJECTIVE_QUESTION_COUNT = SUBJECTIVE_QUESTIONS.length;

/**
 * Returns a subjective question not yet asked, cycling through the domains
 * to keep variety. Returns null if all have been asked.
 */
export function getNextSubjectiveQuestion(
  askedIds: string[],
  preferredDomains?: SubjectiveQuestion['domain'][],
): SubjectiveQuestion | null {
  const remaining = SUBJECTIVE_QUESTIONS.filter(q => !askedIds.includes(q.id));
  if (remaining.length === 0) return null;

  if (preferredDomains && preferredDomains.length > 0) {
    for (const domain of preferredDomains) {
      const fromDomain = remaining.find(q => q.domain === domain);
      if (fromDomain) return fromDomain;
    }
  }

  return remaining[0] ?? null;
}

/**
 * Serializes a subjective question's KP context for the AI scoring prompt.
 */
export function serializeSubjectiveQuestionForAI(q: SubjectiveQuestion): string {
  return [
    `── SUBJECTIVE QUESTION CONTEXT ──────────────────────────────────────────`,
    `Question domain: ${q.domain}`,
    `Primary planets this answer reveals: ${q.reveals.planets.join(', ')}`,
    `Primary KP houses activated: ${q.reveals.houses.join(', ')}`,
    ``,
    `SCORING GUIDANCE:`,
    `- The user's answer is an expression of their rising sign's and its lord's energy.`,
    `- Boost probability for candidates whose ascendant sub-lord matches the revealed planets.`,
    `- Adjust sign-level probability: if the answer strongly matches a sign's character, multiply those candidates.`,
    `- Be conservative — character traits show planetary patterns but are not deterministic.`,
    ``,
  ].join('\n');
}
