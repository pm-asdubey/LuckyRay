import type { KPRule } from '../types';

export const kpFundamentals: KPRule[] = [
  {
    id: 'kpf-01',
    section: 'kp-fundamentals',
    rule: 'KP Astrology uses the Placidus house system (unequal houses), not the equal-house system used in traditional Vedic Jyotish. Each house cusp falls at a specific zodiacal degree that may differ significantly from the equal-division point.',
  },
  {
    id: 'kpf-02',
    section: 'kp-fundamentals',
    rule: 'The zodiac (360°) is subdivided into 249 equal sub-divisions called sub-lords, distributed proportionally according to the Vimshottari dasha planet-year cycle. These sub-lord zones are the fundamental unit of KP analysis.',
  },
  {
    id: 'kpf-03',
    section: 'kp-fundamentals',
    rule: 'Every zodiacal degree has three layers: Sign Lord → Star Lord (nakshatra lord) → Sub-Lord. The sub-lord is the final determinant; it overrides the sign and star lords for predictive purposes.',
  },
  {
    id: 'kpf-04',
    section: 'kp-fundamentals',
    rule: 'In KP, house "lordship" (which sign a planet rules) is secondary. What matters most is which star (nakshatra) a planet occupies — that star lord\'s house positions determine what the planet actually signifies in practice.',
  },
  {
    id: 'kpf-05',
    section: 'kp-fundamentals',
    rule: 'Aspects between planets are NOT used as primary indicators in KP. The star-lord and sub-lord positions are the primary mechanism. This eliminates aspect-based ambiguity common in traditional Vedic analysis.',
  },
  {
    id: 'kpf-06',
    section: 'kp-fundamentals',
    rule: 'A planet\'s effective significations follow the cascade: (1) houses occupied by planets in whose star the planet sits, (2) houses occupied by the planet itself, (3) houses whose lords\' stars the planet occupies, (4) houses owned by the planet. Priority descends in this order.',
  },
  {
    id: 'kpf-07',
    section: 'kp-fundamentals',
    rule: 'The sub-lord of a house cusp is the single most important factor for that house\'s promise. If the sub-lord\'s significations support the house matter, the event is promised; if they oppose it, the event is denied or heavily modified regardless of other favorable factors.',
  },
  {
    id: 'kpf-08',
    section: 'kp-fundamentals',
    rule: 'If the sub-lord of a cusp is in the constellation (nakshatra) of a retrograde planet, that house\'s matter is initially frustrated, delayed, or denied. After the native makes a second attempt or after the dasha changes, it may eventually manifest.',
  },
  {
    id: 'kpf-09',
    section: 'kp-fundamentals',
    rule: 'If the sub-lord of a cusp occupies its own star (own nakshatra), it is an extremely powerful indicator for that house — both the promise and the eventual result are concentrated and unambiguous.',
  },
  {
    id: 'kpf-10',
    section: 'kp-fundamentals',
    rule: 'In KP, the 6th, 8th, and 12th houses are not automatically "bad." The 6th house signifies service and employment (positive for employed professionals). The 8th signifies longevity, legacies, and transformation. The 12th signifies foreign lands, spiritual withdrawal, and bed comforts. Their sub-lords determine whether the outcomes are beneficial or difficult.',
  },
  {
    id: 'kpf-11',
    section: 'kp-fundamentals',
    rule: 'Natural benefic/malefic status (Jupiter benefic, Saturn malefic, etc.) is de-emphasized in KP. What matters is functional role: a planet\'s house significations in a specific chart determine whether it produces good or difficult results for that native.',
  },
  {
    id: 'kpf-12',
    section: 'kp-fundamentals',
    rule: 'KP considers the Lagna (Ascendant) cuspal degree — not merely the Ascendant sign — as the birth marker. The star lord and sub-lord of the exact Lagna degree define the native\'s fundamental life pattern.',
  },
  {
    id: 'kpf-13',
    section: 'kp-fundamentals',
    rule: 'An event manifests only when all three conditions are simultaneously satisfied: (1) the natal chart promises the event through the relevant cusp sub-lord, (2) the current dasha periods align with that promise, and (3) transits confirm the timing. All three gates must open.',
  },
  {
    id: 'kpf-14',
    section: 'kp-fundamentals',
    rule: 'Rahu and Ketu do not own any signs but act as agents of the planet they conjoin or are most closely associated with. They amplify and sometimes distort that planet\'s results, adding an element of surprise, karmic weight, or foreignness to the outcome.',
  },
  {
    id: 'kpf-15',
    section: 'kp-fundamentals',
    rule: 'In KP, the "Ruling Planets" at any moment (the current lagna lord, lagna star lord, Moon\'s sign lord, Moon\'s star lord, and day lord) serve as a real-time filter confirming which promises are about to activate. Events tend to occur during dasha periods of planets that are also current Ruling Planets.',
  },
];
