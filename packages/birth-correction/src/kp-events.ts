/**
 * KP Jyotish life event taxonomy for birth time rectification.
 *
 * In KP, every life event is signified by specific house combinations.
 * The event happening during a dasha period means the dasha planet must be
 * a significator of the event's relevant houses (through occupancy, star-lordship,
 * sign-lordship, or star-of-sign-lord chain).
 *
 * Events are grouped by life domain and filtered by the person's age at the
 * time being asked about — no point asking a 15-year-old about retirement
 * or a 65-year-old about joining school.
 */

import type { PlanetId } from '@luckyray/shared';

export interface KPEvent {
  id: string;
  label: string;
  /** Houses whose sub-lords and significators are activated by this event */
  houses: number[];
  /** Minimum age for this event to be age-appropriate */
  minAge?: number;
  /** Maximum age for this event to be age-appropriate */
  maxAge?: number;
  /** Natural planets that typically signify this event (for AI context) */
  planets: PlanetId[];
  /** Optional follow-up question shown after the user selects this event */
  followUp?: string;
  /** KP domain for grouping in UI */
  domain: KPDomain;
}

export type KPDomain =
  | 'education'
  | 'siblings'
  | 'home-property'
  | 'mother'
  | 'children'
  | 'health'
  | 'career'
  | 'marriage'
  | 'finance'
  | 'father'
  | 'travel-foreign'
  | 'spirituality'
  | 'losses'
  | 'self';

export const DOMAIN_LABELS: Record<KPDomain, string> = {
  'education':      'Education',
  'siblings':       'Siblings',
  'home-property':  'Home & Property',
  'mother':         'Mother',
  'children':       'Children',
  'health':         'Health',
  'career':         'Career & Job',
  'marriage':       'Marriage & Relationships',
  'finance':        'Finance & Assets',
  'father':         'Father',
  'travel-foreign': 'Travel & Foreign',
  'spirituality':   'Spirituality & Religion',
  'losses':         'Losses & Endings',
  'self':           'Self & Major Shifts',
};

export const KP_EVENTS: KPEvent[] = [

  // ── Education (H4, H5, H9) ────────────────────────────────────────────────
  {
    id: 'edu-school-start',
    label: 'Started school or kindergarten',
    houses: [4, 5], planets: ['Mercury', 'Moon'],
    minAge: 3, maxAge: 10,
    domain: 'education',
    followUp: 'Was this in the same city the family lived in, or did the family move for it?',
  },
  {
    id: 'edu-school-change',
    label: 'Changed school or switched medium of education',
    houses: [4, 9], planets: ['Mercury', 'Jupiter'],
    minAge: 5, maxAge: 20,
    domain: 'education',
    followUp: 'What led to the change? Was it planned or sudden?',
  },
  {
    id: 'edu-study-disruption',
    label: 'There was a disruption or interruption in studies',
    houses: [5, 12], planets: ['Saturn', 'Rahu'],
    minAge: 8, maxAge: 30,
    domain: 'education',
    followUp: 'What happened? How long was the disruption?',
  },
  {
    id: 'edu-board-pass',
    label: 'Passed major school or board exams (10th, 12th, or equivalent)',
    houses: [4, 5, 9], planets: ['Mercury', 'Jupiter', 'Sun'],
    minAge: 14, maxAge: 22,
    domain: 'education',
    followUp: 'Did the result differ from expectations?',
  },
  {
    id: 'edu-college-join',
    label: 'Joined college, university, or a professional course',
    houses: [4, 9, 11], planets: ['Jupiter', 'Mercury', 'Sun'],
    minAge: 17, maxAge: 30,
    domain: 'education',
    followUp: 'Did this involve moving to a new city?',
  },
  {
    id: 'edu-degree-complete',
    label: 'Completed a degree or professional qualification',
    houses: [4, 9, 11], planets: ['Jupiter', 'Mercury'],
    minAge: 19, maxAge: 40,
    domain: 'education',
  },
  {
    id: 'edu-competitive-result',
    label: 'Sat a competitive entrance exam or selection process',
    houses: [5, 6, 11], planets: ['Saturn', 'Mars', 'Mercury'],
    minAge: 16, maxAge: 30,
    domain: 'education',
    followUp: 'How did it go? Did the outcome match your expectations?',
  },

  // ── Siblings (H3, H11) ───────────────────────────────────────────────────
  {
    id: 'sib-born',
    label: 'A sibling was born',
    houses: [3], planets: ['Mercury', 'Mars'],
    minAge: 0, maxAge: 25,
    domain: 'siblings',
  },
  {
    id: 'sib-marriage',
    label: 'A sibling got married',
    houses: [3, 7], planets: ['Venus', 'Jupiter', 'Mercury'],
    minAge: 10, maxAge: 55,
    domain: 'siblings',
    followUp: 'Older or younger sibling? What was the overall feeling around that time?',
  },
  {
    id: 'sib-child',
    label: 'A sibling had a child',
    houses: [3, 5], planets: ['Jupiter', 'Moon', 'Mercury'],
    minAge: 12, maxAge: 60,
    domain: 'siblings',
  },
  {
    id: 'sib-move',
    label: 'A sibling moved to a different city or abroad',
    houses: [3, 9, 12], planets: ['Rahu', 'Jupiter', 'Mercury'],
    minAge: 8, maxAge: 55,
    domain: 'siblings',
    followUp: 'Did this change your relationship with them?',
  },
  {
    id: 'sib-life-change',
    label: 'A sibling went through a significant health or life challenge',
    houses: [3, 6, 8], planets: ['Mars', 'Saturn', 'Ketu'],
    minAge: 5, maxAge: 65,
    domain: 'siblings',
    followUp: 'Please describe what happened and roughly how long it lasted.',
  },
  {
    id: 'sib-tension',
    label: 'There was a significant period of tension or distance with a sibling',
    houses: [3, 6], planets: ['Mars', 'Saturn', 'Rahu'],
    minAge: 10, maxAge: 65,
    domain: 'siblings',
    followUp: 'Was this resolved or did the distance persist?',
  },

  // ── Home & Property (H4) ─────────────────────────────────────────────────
  {
    id: 'home-move',
    label: 'The family moved to a new home or different city',
    houses: [4, 9], planets: ['Moon', 'Mars', 'Rahu'],
    minAge: 0, maxAge: 80,
    domain: 'home-property',
    followUp: 'Was it within the same city, or was it a longer-distance move?',
  },
  {
    id: 'home-buy',
    label: 'Purchased a home or property',
    houses: [4, 11], planets: ['Mars', 'Venus', 'Saturn'],
    minAge: 22, maxAge: 70,
    domain: 'home-property',
    followUp: 'Was it a first purchase or an additional property?',
  },
  {
    id: 'home-property-change',
    label: 'A property was sold, let go, or changed significantly',
    houses: [4, 12], planets: ['Mars', 'Saturn', 'Rahu'],
    minAge: 22, maxAge: 75,
    domain: 'home-property',
    followUp: 'Was this by choice or circumstance?',
  },
  {
    id: 'home-construction',
    label: 'Major home construction or renovation',
    houses: [4], planets: ['Mars', 'Saturn', 'Venus'],
    minAge: 20, maxAge: 70,
    domain: 'home-property',
  },
  {
    id: 'home-vehicle',
    label: 'Got a new vehicle or had a major change related to a vehicle',
    houses: [4], planets: ['Mars', 'Venus', 'Moon'],
    minAge: 18, maxAge: 70,
    domain: 'home-property',
    followUp: 'Please describe — new purchase, accident, sale, or something else?',
  },

  // ── Mother (H4) ──────────────────────────────────────────────────────────
  {
    id: 'mother-health-life',
    label: "Mother had a health event, surgery, or significant life change",
    houses: [4, 6, 8], planets: ['Moon', 'Mars', 'Saturn'],
    minAge: 5, maxAge: 70,
    domain: 'mother',
    followUp: 'Please describe what happened and the overall impact on the family.',
  },
  {
    id: 'mother-career',
    label: "Mother had a major career change, new role, or retirement",
    houses: [4, 10], planets: ['Moon', 'Saturn', 'Sun'],
    minAge: 10, maxAge: 60,
    domain: 'mother',
  },
  {
    id: 'mother-move',
    label: "Mother moved to a different city or abroad",
    houses: [4, 9, 12], planets: ['Moon', 'Rahu', 'Saturn'],
    minAge: 5, maxAge: 60,
    domain: 'mother',
    followUp: 'Was this a temporary separation or a permanent move?',
  },

  // ── Father (H9) ──────────────────────────────────────────────────────────
  {
    id: 'father-health-life',
    label: "Father had a health event, surgery, or significant life change",
    houses: [9, 6, 8], planets: ['Sun', 'Mars', 'Saturn'],
    minAge: 5, maxAge: 70,
    domain: 'father',
    followUp: 'Please describe what happened and the overall impact on the family.',
  },
  {
    id: 'father-career',
    label: "Father had a major career change, new role, or retirement",
    houses: [9, 10, 12], planets: ['Sun', 'Saturn'],
    minAge: 5, maxAge: 60,
    domain: 'father',
  },
  {
    id: 'father-move',
    label: "Father was transferred, moved to a different city, or went abroad",
    houses: [9, 12], planets: ['Sun', 'Rahu', 'Saturn'],
    minAge: 5, maxAge: 60,
    domain: 'father',
    followUp: 'Did the family follow, or did he go alone?',
  },

  // ── Marriage & Relationships (H7) ────────────────────────────────────────
  {
    id: 'rel-engagement',
    label: 'Got engaged or a formal proposal happened',
    houses: [7, 11], planets: ['Venus', 'Jupiter'],
    minAge: 18, maxAge: 55,
    domain: 'marriage',
  },
  {
    id: 'rel-marriage',
    label: 'Got married',
    houses: [2, 7, 11], planets: ['Venus', 'Jupiter', 'Moon'],
    minAge: 18, maxAge: 60,
    domain: 'marriage',
    followUp: 'Arranged or choice-based? What was the overall atmosphere of that period?',
  },
  {
    id: 'rel-marriage-change',
    label: 'There was a significant change or difficult period in a marriage or relationship',
    houses: [6, 8, 12], planets: ['Saturn', 'Rahu', 'Mars'],
    minAge: 20, maxAge: 70,
    domain: 'marriage',
    followUp: 'Please describe — this could be reconciliation, separation, or any major shift.',
  },
  {
    id: 'rel-relationship-milestone',
    label: 'A significant long-term relationship began or ended',
    houses: [7, 12], planets: ['Saturn', 'Venus', 'Rahu'],
    minAge: 16, maxAge: 65,
    domain: 'marriage',
    followUp: 'Briefly describe the nature of the relationship and what happened.',
  },
  {
    id: 'rel-spouse-event',
    label: "Spouse or partner went through a major health, career, or life event",
    houses: [7, 6, 10], planets: ['Venus', 'Saturn', 'Sun'],
    minAge: 20, maxAge: 70,
    domain: 'marriage',
  },

  // ── Children (H5) ────────────────────────────────────────────────────────
  {
    id: 'child-born-1',
    label: 'First child was born',
    houses: [2, 5, 11], planets: ['Jupiter', 'Moon', 'Sun'],
    minAge: 18, maxAge: 50,
    domain: 'children',
    followUp: 'Was the birth straightforward? What was the overall energy of that period?',
  },
  {
    id: 'child-born-2',
    label: 'Another child was born (second, third, etc.)',
    houses: [5, 11], planets: ['Jupiter', 'Moon'],
    minAge: 20, maxAge: 55,
    domain: 'children',
  },
  {
    id: 'child-health-life',
    label: 'A child went through a health challenge or significant life event',
    houses: [5, 6], planets: ['Moon', 'Mars', 'Saturn'],
    minAge: 22, maxAge: 60,
    domain: 'children',
    followUp: 'Please describe what happened.',
  },
  {
    id: 'child-school',
    label: 'A child started school or reached a major academic milestone',
    houses: [5, 4, 9], planets: ['Mercury', 'Jupiter', 'Moon'],
    minAge: 25, maxAge: 60,
    domain: 'children',
  },

  // ── Career & Job (H6, H10) ───────────────────────────────────────────────
  {
    id: 'job-first',
    label: 'Started the first job or entered professional life',
    houses: [6, 10, 11], planets: ['Saturn', 'Mercury', 'Sun'],
    minAge: 18, maxAge: 35,
    domain: 'career',
    followUp: 'In which field? Was it in your home city or did you relocate?',
  },
  {
    id: 'job-change',
    label: 'Changed job, company, or field of work',
    houses: [6, 10], planets: ['Saturn', 'Mercury', 'Rahu'],
    minAge: 20, maxAge: 60,
    domain: 'career',
    followUp: 'Was it a step up or lateral? By choice or necessity?',
  },
  {
    id: 'job-promotion',
    label: 'Received a significant promotion or rise in responsibilities',
    houses: [10, 11], planets: ['Sun', 'Saturn', 'Jupiter'],
    minAge: 22, maxAge: 60,
    domain: 'career',
  },
  {
    id: 'job-employment-change',
    label: 'There was a major change in employment status (job ended, long break, or restart)',
    houses: [6, 12], planets: ['Saturn', 'Rahu', 'Mars'],
    minAge: 20, maxAge: 65,
    domain: 'career',
    followUp: 'Please describe what happened and roughly how long the change lasted.',
  },
  {
    id: 'job-business-start',
    label: 'Started own business or independent practice',
    houses: [7, 10, 11], planets: ['Mercury', 'Rahu', 'Saturn'],
    minAge: 22, maxAge: 60,
    domain: 'career',
  },
  {
    id: 'job-business-challenge',
    label: 'Business or career went through a major challenge or reversal',
    houses: [6, 8, 12], planets: ['Saturn', 'Rahu', 'Mars'],
    minAge: 22, maxAge: 65,
    domain: 'career',
    followUp: 'Please describe what happened and how things resolved.',
  },
  {
    id: 'job-retirement',
    label: 'Retired or stepped back significantly from active work',
    houses: [12, 4], planets: ['Saturn', 'Ketu'],
    minAge: 50, maxAge: 80,
    domain: 'career',
  },

  // ── Finance & Assets (H2, H11) ───────────────────────────────────────────
  {
    id: 'fin-windfall',
    label: 'An unexpected or significant financial gain or inheritance came in',
    houses: [2, 8, 11], planets: ['Jupiter', 'Venus', 'Moon'],
    minAge: 15, maxAge: 80,
    domain: 'finance',
    followUp: 'Was this planned or a surprise? What did it change?',
  },
  {
    id: 'fin-challenge',
    label: 'Went through a significant financial challenge or period of strain',
    houses: [6, 8, 12], planets: ['Saturn', 'Rahu', 'Mars'],
    minAge: 20, maxAge: 70,
    domain: 'finance',
    followUp: 'Please describe the nature of the challenge and how long it lasted.',
  },
  {
    id: 'fin-investment',
    label: 'Made a major investment — stocks, real estate, or business',
    houses: [2, 5, 11], planets: ['Jupiter', 'Venus', 'Rahu'],
    minAge: 25, maxAge: 65,
    domain: 'finance',
    followUp: 'Did it go well overall?',
  },

  // ── Health (H1, H6, H8) ──────────────────────────────────────────────────
  {
    id: 'health-surgery',
    label: 'Had a surgery or major medical procedure',
    houses: [1, 6, 8], planets: ['Mars', 'Saturn', 'Ketu'],
    minAge: 0, maxAge: 80,
    domain: 'health',
    followUp: 'Which part of the body was involved? Was it planned or an emergency?',
  },
  {
    id: 'health-illness',
    label: 'Went through a prolonged illness or serious health challenge',
    houses: [6, 8, 12], planets: ['Saturn', 'Rahu', 'Ketu'],
    minAge: 0, maxAge: 80,
    domain: 'health',
    followUp: 'Did it require hospitalization? How long did recovery take?',
  },
  {
    id: 'health-accident',
    label: 'Had an accident or sustained an injury',
    houses: [1, 6, 8], planets: ['Mars', 'Rahu', 'Saturn'],
    minAge: 5, maxAge: 75,
    domain: 'health',
    followUp: 'What happened? Was recovery complete?',
  },
  {
    id: 'health-mental',
    label: 'Went through a period of significant emotional or mental difficulty',
    houses: [6, 8, 12], planets: ['Moon', 'Saturn', 'Rahu', 'Ketu'],
    minAge: 13, maxAge: 75,
    domain: 'health',
    followUp: 'Please describe the nature of the difficulty and how long it lasted.',
  },

  // ── Travel & Foreign (H9, H12) ───────────────────────────────────────────
  {
    id: 'travel-abroad-first',
    label: 'First trip abroad',
    houses: [9, 12], planets: ['Rahu', 'Jupiter', 'Moon'],
    minAge: 5, maxAge: 55,
    domain: 'travel-foreign',
    followUp: 'For what purpose? How did the experience feel?',
  },
  {
    id: 'travel-emigrate',
    label: 'Moved to or settled in a foreign country',
    houses: [9, 12, 4], planets: ['Rahu', 'Saturn', 'Jupiter'],
    minAge: 18, maxAge: 60,
    domain: 'travel-foreign',
    followUp: 'Was it for work, study, or family?',
  },
  {
    id: 'travel-return',
    label: 'Returned from a long stay abroad or ended a period of living away from home',
    houses: [4, 9, 12], planets: ['Ketu', 'Moon', 'Saturn'],
    minAge: 18, maxAge: 70,
    domain: 'travel-foreign',
  },

  // ── Spirituality (H9, H12) ───────────────────────────────────────────────
  {
    id: 'spirit-initiation',
    label: 'Underwent spiritual initiation, received diksha, or met a significant guru',
    houses: [9, 12], planets: ['Jupiter', 'Ketu', 'Saturn'],
    minAge: 16, maxAge: 75,
    domain: 'spirituality',
  },
  {
    id: 'spirit-pilgrimage',
    label: 'Undertook a major pilgrimage or religious journey',
    houses: [9, 12], planets: ['Jupiter', 'Ketu', 'Moon'],
    minAge: 10, maxAge: 80,
    domain: 'spirituality',
  },

  // ── Losses & Endings (H2, H7, H8) ───────────────────────────────────────
  {
    id: 'loss-elder-relative',
    label: 'A grandparent, elder relative, or close family member went through a major health event or significant change',
    houses: [2, 7], planets: ['Saturn', 'Ketu', 'Rahu'],
    minAge: 5, maxAge: 75,
    domain: 'losses',
    followUp: 'Please describe what happened and the impact on the family.',
  },
  {
    id: 'loss-legal',
    label: 'Was involved in a legal dispute or court matter',
    houses: [6, 9], planets: ['Saturn', 'Rahu', 'Mars'],
    minAge: 18, maxAge: 70,
    domain: 'losses',
    followUp: 'Was it resolved? What was the nature of the matter?',
  },
];

/**
 * Returns age-appropriate events for a given year, filtered by the person's
 * birth year to compute their approximate age at the time.
 */
export function getAgeFilteredEvents(
  targetYear: number,
  birthYear: number,
): KPEvent[] {
  const age = targetYear - birthYear;
  return KP_EVENTS.filter(e => {
    if (e.minAge !== undefined && age < e.minAge) return false;
    if (e.maxAge !== undefined && age > e.maxAge) return false;
    return true;
  });
}

/**
 * Group a list of events by domain for UI rendering.
 */
export function groupEventsByDomain(events: KPEvent[]): Record<KPDomain, KPEvent[]> {
  const groups: Partial<Record<KPDomain, KPEvent[]>> = {};
  for (const event of events) {
    if (!groups[event.domain]) groups[event.domain] = [];
    groups[event.domain]!.push(event);
  }
  return groups as Record<KPDomain, KPEvent[]>;
}

/**
 * Serialize events for AI prompt injection.
 * Tells the AI which houses are activated by each selected event.
 */
export function serializeSelectedEventsForAI(
  selectedEventIds: string[],
  details: Record<string, string>,
): string {
  const lines: string[] = ['── KP LIFE EVENTS SELECTED ──────────────────────────────────'];
  for (const id of selectedEventIds) {
    const ev = KP_EVENTS.find(e => e.id === id);
    if (!ev) continue;
    lines.push(`EVENT: ${ev.label}`);
    lines.push(`  KP Houses activated: ${ev.houses.join(', ')}`);
    lines.push(`  Natural significator planets: ${ev.planets.join(', ')}`);
    if (details[id]) lines.push(`  User detail: "${details[id]}"`);
  }
  lines.push('');
  return lines.join('\n');
}
