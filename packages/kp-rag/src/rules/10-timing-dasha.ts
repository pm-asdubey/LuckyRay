import type { KPRule } from '../types';

export const timingDasha: KPRule[] = [
  {
    id: 'tim-01',
    section: 'timing-dasha',
    rule: 'The KP timing rule: an event manifests ONLY when all three dasha levels simultaneously satisfy the house requirements — Mahadasha lord is a significator of the relevant houses, Antardasha lord is also a significator, and Pratyantar lord confirms the timing. Failure at any level means the event waits for the next alignment.',
  },
  {
    id: 'tim-02',
    section: 'timing-dasha',
    rule: 'The Sookshma dasha (4th level) gives the precise window — often the exact week or fortnight — within a Pratyantar when an event occurs. The Sookshma lord must also be a significator of the relevant houses for pinpoint accuracy.',
  },
  {
    id: 'tim-03',
    section: 'timing-dasha',
    rule: 'The Mahadasha lord sets the dominant life theme for its entire period (up to 20 years). No Antardasha can fundamentally override the Mahadasha theme — it can only modulate it. An unfavorable Mahadasha with a favorable Antardasha gives temporary relief, not transformation.',
  },
  {
    id: 'tim-04',
    section: 'timing-dasha',
    rule: 'Rahu and Ketu dashas produce results of the planet they represent (the planet they conjoin, aspect, or whose star they occupy). A Rahu dasha in the star of Venus in the 7th house produces Venus-like relationship results, not Rahu\'s own significations.',
  },
  {
    id: 'tim-05',
    section: 'timing-dasha',
    rule: 'If the Mahadasha lord is retrograde at birth, the themes of that Mahadasha arrive with initial obstacles, false starts, and frustration before eventual fulfillment. The native often revisits themes multiple times before resolution.',
  },
  {
    id: 'tim-06',
    section: 'timing-dasha',
    rule: 'Ketu dasha or Ketu antardasha brings sudden, unexpected, and often spiritually-tinged events. What manifests is entirely determined by the planet Ketu is most closely associated with. Ketu periods often coincide with separations, endings, and sudden course-changes.',
  },
  {
    id: 'tim-07',
    section: 'timing-dasha',
    rule: 'The transit confirmation rule: an event is most likely to occur when the transiting planet (especially Jupiter or Saturn) passes over the natal sub-lord of the relevant cusp, or over the cusp degree itself. The dasha alone, without transit confirmation, may delay the event.',
  },
  {
    id: 'tim-08',
    section: 'timing-dasha',
    keywords: ['double transit', 'jupiter saturn'],
    rule: 'The double-transit rule in KP: for major life events (marriage, career change, childbirth, foreign settlement), Jupiter and Saturn must BOTH be transiting positions favorable to the natal Moon and the relevant house cusp simultaneously. One planet transiting alone brings partial results at best.',
  },
  {
    id: 'tim-09',
    section: 'timing-dasha',
    rule: 'The dasha of a planet that is the sub-lord of the relevant house cusp is the single most reliable trigger for that house\'s event. When the Antardasha or Pratyantar of this cuspal sub-lord planet runs, the event for that house is highly likely.',
  },
  {
    id: 'tim-10',
    section: 'timing-dasha',
    rule: 'Moon\'s transit (daily movement) provides the final trigger within a Sookshma period. The event often crystallizes when the Moon transits over the degree of the relevant house cusp, the natal sub-lord of that cusp, or the star of the current dasha planet.',
  },
  {
    id: 'tim-11',
    section: 'timing-dasha',
    rule: 'A planet\'s dasha return (transit of the dasha lord over its own natal position) within a Mahadasha marks a significant amplification of that period\'s themes. The year of the dasha lord\'s return is often the most eventful year of that Mahadasha.',
  },
  {
    id: 'tim-12',
    section: 'timing-dasha',
    keywords: ['stalled event', 'delayed'],
    rule: 'When a promised event is significantly delayed beyond its expected dasha window, KP looks at whether: (a) the sub-lord is in a retrograde planet\'s star (most common cause), (b) the dasha lord is in the star of a planet in an enemy sign, or (c) a Saturn transit is suppressing the relevant house during this period.',
  },
  {
    id: 'tim-13',
    section: 'timing-dasha',
    keywords: ['multiple events', 'same period'],
    rule: 'When multiple life events coincide (e.g., marriage and job change in the same year), the current dasha planets are significators of multiple house combinations simultaneously — this is the hallmark of a pivotal life year. Such years are preceded and followed by relative calm.',
  },
  {
    id: 'tim-14',
    section: 'timing-dasha',
    planets: ['Saturn'],
    keywords: ['sade sati'],
    rule: 'Saturn\'s Sade Sati (7.5 years) begins when Saturn enters the sign immediately before the natal Moon\'s sign. The three phases — entry, Moon\'s own sign, exit — bring decreasing then increasing pressure. The middle phase (Moon\'s sign) is most challenging for health, finances, and relationships.',
  },
  {
    id: 'tim-15',
    section: 'timing-dasha',
    planets: ['Jupiter'],
    keywords: ['jupiter return', 'guru transit'],
    rule: 'Jupiter\'s transit through the 1st, 5th, 9th, and 11th houses from the natal Moon (Janma Rashi) marks periods of expansion, opportunity, and good fortune. These occur once every 12 years for each position and last approximately 1 year. They are among the strongest positive transits in KP.',
  },
  {
    id: 'tim-16',
    section: 'timing-dasha',
    keywords: ['antardasha selection', 'which period brings event'],
    rule: 'To identify which Antardasha within a Mahadasha brings a specific event: filter all Antardasha lords for that Mahadasha and identify those that are significators of the relevant event houses. The first such Antardasha after the Mahadasha begins (given the 5-year rule minimum if planet is in an unfavorable star) is most likely.',
  },
  {
    id: 'tim-17',
    section: 'timing-dasha',
    rule: 'In KP, the first year of a new Mahadasha is rarely the year of its major events — the native is adjusting to the new planetary energy. Major events typically occur in years 2-4 of the Mahadasha, when both dasha AND antardasha lords are in full alignment.',
  },
  {
    id: 'tim-18',
    section: 'timing-dasha',
    rule: 'Concurrent events in two different life domains (e.g., health crisis and financial gain in the same period) indicate that the current dasha planet is a significator of both the problematic houses (6/8/12) and the positive houses (2/10/11). Mixed periods are common — they should be interpreted holistically, not as pure blessing or pure curse.',
  },
];
