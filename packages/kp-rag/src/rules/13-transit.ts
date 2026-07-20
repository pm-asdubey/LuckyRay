import type { KPRule } from '../types';

export const transit: KPRule[] = [
  {
    id: 'trn-01',
    section: 'transit',
    rule: 'In KP, transits (Gochar) must always be read in conjunction with the current dasha — a favorable transit during an unfavorable dasha gives only partial and temporary relief. A transit alone never overrides the dasha promise.',
  },
  {
    id: 'trn-02',
    section: 'transit',
    planets: ['Jupiter'],
    rule: 'Jupiter\'s favorable transits from natal Moon: houses 1, 2, 5, 7, 9, 11 are considered positive in traditional Vedic (Guru Chandal exception aside). In KP, Jupiter\'s transit is beneficial when it crosses the degree of planets that are house-11 and house-10 significators — confirming the dasha promise of career or gains.',
  },
  {
    id: 'trn-03',
    section: 'transit',
    planets: ['Saturn'],
    keywords: ['sade sati'],
    rule: 'Saturn\'s Sade Sati: the 7.5-year period when Saturn transits through the sign before the natal Moon, the natal Moon\'s sign, and the sign after. This is a period of karma resolution — themes of delay, loss, health pressure, and restructuring. Native must work harder for the same results. Positive outcomes are possible but require sustained effort.',
  },
  {
    id: 'trn-04',
    section: 'transit',
    planets: ['Saturn'],
    keywords: ['sade sati', 'phases'],
    rule: 'Sade Sati has three phases: (1) Rising phase (sign before natal Moon): financial and career pressure begins; (2) Peak phase (Saturn on natal Moon): maximum emotional and physical stress, greatest transformation; (3) Setting phase (sign after natal Moon): gradual release and recovery. The nature of each phase depends also on which houses Saturn rules in the natal chart.',
  },
  {
    id: 'trn-05',
    section: 'transit',
    planets: ['Jupiter', 'Saturn'],
    keywords: ['double transit'],
    rule: 'The double-transit rule: for major positive events (marriage, career breakthrough, wealth surge, childbirth), both Jupiter and Saturn must simultaneously transit favorable positions relative to the natal Moon — typically 1/5/9/11 for Jupiter and non-Sade-Sati positions for Saturn. This convergence occurs only every 12-30 years and marks truly significant life events.',
  },
  {
    id: 'trn-06',
    section: 'transit',
    planets: ['Rahu', 'Ketu'],
    rule: 'Rahu and Ketu\'s 18-month transit through each sign brings themes of the houses involved. Rahu transiting the natal 7th house can precipitate relationship events; through the 10th it can bring career disruption or unconventional opportunity. Ketu through the same houses tends to bring closure or endings of those house themes.',
  },
  {
    id: 'trn-07',
    section: 'transit',
    planets: ['Moon'],
    rule: 'Moon\'s daily transit provides the final, most precise trigger for events. Within a favorable dasha-antardasha and with favorable Saturn-Jupiter transits in place, the specific day an event occurs is often when the Moon transits the degree of the relevant cusp or the degree of the current dasha lord\'s natal position.',
  },
  {
    id: 'trn-08',
    section: 'transit',
    rule: 'In KP transit analysis, the transit over the natal sub-lord of a cusp is more meaningful than the transit over the cusp itself. When a planet transits the exact degree occupied by the natal cusp sub-lord, it activates that cusp\'s promise directly.',
  },
  {
    id: 'trn-09',
    section: 'transit',
    planets: ['Saturn'],
    keywords: ['saturn return'],
    rule: 'Saturn\'s return (transit over its natal position, approximately every 29.5 years) is a profound life review moment in KP. The first return (age ~29) brings career and relationship restructuring; the second return (age ~58) brings life philosophy and legacy assessment. In favorable dashas, Saturn returns can mark major milestone achievements.',
  },
  {
    id: 'trn-10',
    section: 'transit',
    rule: 'Transit results are always filtered through the natal chart\'s promise. A planet transiting the 11th house brings gains only if the natal 11th cusp sub-lord already promises gains. If the 11th house is fundamentally not promising, the transit over it brings disappointment rather than fulfillment.',
  },
  {
    id: 'trn-11',
    section: 'transit',
    planets: ['Jupiter'],
    keywords: ['jupiter transit', 'annual'],
    rule: 'Jupiter spends approximately 1 year in each sign. The year Jupiter transits the natal 5th house from Moon brings opportunities for children, romance, education, and creative expression; through the 11th brings financial gains and social expansion; through the 9th brings fortune, travel, and spiritual growth.',
  },
  {
    id: 'trn-12',
    section: 'transit',
    keywords: ['void of course', 'transit confirmation'],
    rule: 'In KP, when no major planet (Jupiter or Saturn) is simultaneously transiting a favorable position for the natal Moon while the dasha is active, the event is likely in place but crystallization is delayed. The next Jupiter or Saturn transit correction typically unlocks it.',
  },
];
