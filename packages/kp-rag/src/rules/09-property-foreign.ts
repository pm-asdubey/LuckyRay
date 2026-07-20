import type { KPRule } from '../types';

export const propertyForeign: KPRule[] = [
  // ── Property & Vehicles ────────────────────────────────────────────────────
  {
    id: 'propf-01',
    section: 'property-vehicles',
    houses: [4, 11, 12],
    rule: 'Property acquisition is indicated when the 4th cusp sub-lord signifies houses 4 (property itself), 11 (desire fulfillment), and 12 (expenditure toward the purchase). The 12th connection here is positive — money goes out (12th) to buy an asset (4th) and the desire is satisfied (11th).',
  },
  {
    id: 'propf-02',
    section: 'property-vehicles',
    houses: [4, 6, 8, 12],
    keywords: ['property dispute', 'property loss'],
    rule: 'Property disputes, loss of property, or forced sale is indicated when the 4th cusp sub-lord primarily signifies houses 6 (disputes/legal conflict), 8 (sudden loss or transformation), or 12 (expenditure-loss) without 11th house support.',
  },
  {
    id: 'propf-03',
    section: 'property-vehicles',
    houses: [4, 8, 11],
    keywords: ['inherited property', 'ancestral'],
    rule: 'Inherited or ancestral property is indicated when the 4th cusp sub-lord signifies houses 4 and 8 (8 = legacy, inheritance from others). If the 11th is also signified, the inheritance is actually received rather than disputed.',
  },
  {
    id: 'propf-04',
    section: 'property-vehicles',
    planets: ['Venus', 'Mars', 'Saturn'],
    keywords: ['vehicle'],
    rule: 'Ownership of vehicles is indicated through the 4th house (conveyances) when Venus (luxury vehicles), Mars (functional/sports), or Saturn (practical/work vehicles) is a significator of the 4th house and the dasha activates them alongside 11th house gains.',
  },
  {
    id: 'propf-05',
    section: 'property-vehicles',
    keywords: ['property timing', 'dasha'],
    rule: 'Property purchase timing: the dasha of a planet simultaneously signifying houses 4, 11, and 12. Saturn in this role delays the purchase but ensures it; Rahu in this role can bring sudden or unconventional property acquisition.',
  },
  // ── Foreign Travel & Settlement ────────────────────────────────────────────
  {
    id: 'propf-06',
    section: 'foreign-travel',
    houses: [3, 9, 12],
    rule: 'Foreign travel is indicated when planets in the dasha signify houses 3 (short journeys), 9 (long journeys), or 12 (foreign lands). Settlement abroad (permanent relocation) requires houses 4 and 12 to be connected — changing home (4th) to a foreign land (12th).',
  },
  {
    id: 'propf-07',
    section: 'foreign-travel',
    houses: [4, 9, 12],
    keywords: ['emigration', 'foreign settlement'],
    rule: 'Permanent emigration or long-term foreign settlement requires the 4th cusp sub-lord (home) to signify house 12 (foreign lands) and the 12th cusp sub-lord to signify houses 4 and 9. The 9th house connects fortune to the foreign land — the native finds their fortune abroad.',
  },
  {
    id: 'propf-08',
    section: 'foreign-travel',
    houses: [8, 9, 12],
    keywords: ['work abroad', 'foreign employment'],
    rule: 'Employment or career abroad is indicated when the 10th cusp sub-lord signifies houses 9, 10, and 12, and the 12th cusp sub-lord also connects to the 10th. The native\'s professional life is intertwined with foreign or distant places.',
  },
  {
    id: 'propf-09',
    section: 'foreign-travel',
    planets: ['Rahu'],
    keywords: ['foreign', 'abroad'],
    rule: 'Rahu has a strong natural signification for foreign lands, travel, and unconventional cultural immersion. When Rahu is a significator of houses 9, 12, or the dasha, it often brings foreign connections, travel, or time in unfamiliar cultural contexts.',
  },
  {
    id: 'propf-10',
    section: 'foreign-travel',
    keywords: ['foreign timing', 'dasha'],
    rule: 'Foreign travel or foreign opportunity timing: the dasha of a planet signifying 3, 9, or 12 — confirmed by Jupiter\'s transit over the natal 9th or 12th cusp. If the trip is for work, the 10th house significator also activates.',
  },
];
