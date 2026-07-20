import type { KPRule } from '../types';

export const significators: KPRule[] = [
  {
    id: 'sig-01',
    section: 'significators',
    rule: 'To find significators for any life matter, first identify the relevant houses. Proceed in strict priority order: (1) Planets in the star of occupants of the relevant houses, (2) Occupants of the relevant houses, (3) Planets in the star of the house lord, (4) The house lord itself. Planets in category 1 are strongest.',
  },
  {
    id: 'sig-02',
    section: 'significators',
    rule: 'A planet qualifies as a significator of a house if it: (a) occupies that house, (b) is in the nakshatra of a planet occupying that house, (c) is in the nakshatra of that house\'s sign lord, or (d) is the sign lord of that house.',
  },
  {
    id: 'sig-03',
    section: 'significators',
    rule: 'When no planet occupies a house, the planets in the star of that house\'s sign lord become the primary significators and carry the weight of the house\'s unfulfilled occupancy.',
  },
  {
    id: 'sig-04',
    section: 'significators',
    rule: 'Rahu and Ketu are the most powerful significators when they occupy a house or sit in the star of a planet in a house. They amplify the house matters intensely, often to extremes, and introduce sudden or unexpected fulfillment.',
  },
  {
    id: 'sig-05',
    section: 'significators',
    rule: 'If Rahu occupies a sign without any planet in that sign, Rahu absorbs and represents the sign lord\'s significations — it becomes a proxy for that sign lord across all relevant houses.',
  },
  {
    id: 'sig-06',
    section: 'significators',
    rule: 'A planet in the star of Rahu or Ketu signifies all the houses that Rahu or Ketu represent in the chart — not the planet\'s own houses. This frequently surprises traditional astrologers who expect that planet to give its own-house results.',
  },
  {
    id: 'sig-07',
    section: 'significators',
    rule: 'The sub-lord of the relevant cusp must itself be a significator of the houses that support the event. If the sub-lord\'s star lord does not connect to the event houses, the event will not occur regardless of how many other planets are favorable.',
  },
  {
    id: 'sig-08',
    section: 'significators',
    rule: 'A retrograde planet is a weaker significator — its promises are delayed, initially denied, or fulfilled only after a reversal. However, retrograde planets in their own nakshatra can still be powerful if they rule the matter in question.',
  },
  {
    id: 'sig-09',
    section: 'significators',
    rule: 'The strongest possible significator is a planet that: (1) is in the star of an occupant of the relevant house, (2) is simultaneously the sub-lord of that house\'s cusp, and (3) is a Ruling Planet at the time of judgment. All three conditions together indicate an imminent, powerful event.',
  },
  {
    id: 'sig-10',
    section: 'significators',
    rule: 'For event fulfillment, the dasha lord (Mahadasha) must be a significator of the relevant houses, the Antardasha lord must also be a significator, and the Pratyantar lord confirms the timing window. If even one of the three primary levels is not a significator of the relevant houses, the event is unlikely in that sub-period.',
  },
  {
    id: 'sig-11',
    section: 'significators',
    rule: 'Combustion (a planet within close orb of the Sun) reduces a planet\'s power as a significator. Combust planets tend to give results with struggle, ego conflict, or obscured outcomes, though they are not completely nullified.',
  },
  {
    id: 'sig-12',
    section: 'significators',
    rule: 'When identifying significators for timing, always check if the potential significator is also a Ruling Planet for the current moment. Convergence between significator status and Ruling Planet status is the most reliable confirmation of timing.',
  },
  {
    id: 'sig-13',
    section: 'significators',
    rule: 'In KP, a planet\'s own nakshatra (e.g., Sun in Krittika, which is Sun\'s nakshatra) makes that planet an exceptionally powerful self-referential significator — it signifies its own-house matters with concentrated force.',
  },
  {
    id: 'sig-14',
    section: 'significators',
    rule: 'Exaltation and debilitation are noted in KP but do not override the star-lord hierarchy. A debilitated planet in the star of a strong occupant can still be an effective significator, while an exalted planet in the star of a weak or retrograde planet may fail to deliver its expected results.',
  },
  {
    id: 'sig-15',
    section: 'significators',
    rule: 'For multiple simultaneous events (e.g., marriage AND career change in the same year), the current dasha planets must be significators of all the relevant house combinations simultaneously — this is rare and marks a particularly pivotal life period.',
  },
];
