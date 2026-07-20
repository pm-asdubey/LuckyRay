import type { KPRule } from '../types';

export const childrenEducation: KPRule[] = [
  {
    id: 'ched-01',
    section: 'children-education',
    houses: [5, 2, 11],
    rule: 'Childbirth is promised in KP when the 5th cusp sub-lord signifies houses 2 (family expansion), 5 (progeny), and 11 (fulfillment of desire for a child). All three should be signified; absence of 5th connection in this triad indicates delayed or denied childbirth.',
  },
  {
    id: 'ched-02',
    section: 'children-education',
    houses: [5],
    rule: 'The 5th cusp sub-lord is the primary indicator of progeny in KP. Even if Jupiter (the karaka for children) is in the 5th house, if the 5th cusp sub-lord\'s significations do not support childbirth houses, conception or live birth may not occur.',
  },
  {
    id: 'ched-03',
    section: 'children-education',
    planets: ['Jupiter'],
    keywords: ['children', 'karaka'],
    rule: 'Jupiter is the karaka (natural significator) for children for all charts. If Jupiter is a significator of houses 2, 5, and 11 in the KP cascade, the promise of children is strong. If Jupiter primarily signifies 6, 8, or 12 relative to the 5th house, childbirth faces obstacles.',
  },
  {
    id: 'ched-04',
    section: 'children-education',
    houses: [5, 8, 12],
    keywords: ['miscarriage', 'infertility', 'difficulty'],
    rule: 'Difficulty with conception, miscarriage risk, or infertility is indicated when the 5th cusp sub-lord primarily signifies houses 4, 8, or 12 without adequate 2/5/11 connection. House 8 indicates transformation or loss; house 12 suggests expenditure (medical treatment) without fulfillment.',
  },
  {
    id: 'ched-05',
    section: 'children-education',
    keywords: ['child timing', 'dasha'],
    rule: 'Childbirth timing in KP: the dasha of a planet simultaneously signifying houses 2, 5, and 11 brings childbirth. Jupiter\'s transit over the natal 5th cusp degree or natal Moon often confirms the year. Both dasha alignment and transit confirmation are needed.',
  },
  {
    id: 'ched-06',
    section: 'children-education',
    houses: [5, 1, 10],
    keywords: ['education', 'academic'],
    rule: 'High academic achievement is indicated when the 5th cusp sub-lord signifies houses 1, 4, 5, and 10 — the 5th house potential (education) is connected to identity (1), foundation (4), and public recognition (10).',
  },
  {
    id: 'ched-07',
    section: 'children-education',
    planets: ['Mercury', 'Jupiter'],
    keywords: ['higher education', 'academic success'],
    rule: 'Higher education success specifically requires Mercury or Jupiter to be significators of houses 4, 5, and 9. The 9th house represents higher wisdom and advanced degrees. Mercury brings analytical skill; Jupiter brings philosophical depth and institutional success.',
  },
  {
    id: 'ched-08',
    section: 'children-education',
    houses: [5, 8, 12],
    keywords: ['education disruption'],
    rule: 'Disruption to education — dropping out, forced breaks, or inability to complete a degree — is indicated when the 5th cusp sub-lord primarily signifies houses 8 or 12, and the current dasha activates these same houses during the natural educational years.',
  },
  {
    id: 'ched-09',
    section: 'children-education',
    houses: [5, 9, 11],
    keywords: ['foreign education', 'abroad studies'],
    rule: 'Education abroad is indicated when the 5th (education) and 9th (long journeys, higher wisdom) cusp sub-lords both signify house 12 (foreign lands), and the 12th cusp sub-lord supports educational travel. Jupiter transiting favorable positions for the natal 9th and 12th houses confirms the timing.',
  },
];
