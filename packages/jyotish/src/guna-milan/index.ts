/**
 * Ashtakoot Guna Milan (Traditional Kundali Matching)
 *
 * Computes the 8-koota compatibility score (0–36 points) from two persons'
 * Moon nakshatra and Moon sign.
 *
 * Kootas (in order of increasing weight):
 *  1. Varna   (1 pt)  — spiritual/social compatibility
 *  2. Vashya  (2 pts) — dominance / magnetic attraction
 *  3. Tara    (3 pts) — birth-star compatibility
 *  4. Yoni    (4 pts) — sexual / physical compatibility
 *  5. Graha Maitri (5 pts) — mental / intellectual compatibility
 *  6. Gana    (6 pts) — temperament compatibility
 *  7. Bhakoot (7 pts) — emotional / karmic alignment
 *  8. Nadi    (8 pts) — health / progeny compatibility
 *
 * Reference: Krishnamurti, Parashara Hora Shastra, classical texts
 */

// ─── Lookup Tables ────────────────────────────────────────────────────────────

// Nakshatra index 0–26 (Ashwini=0 … Revati=26)

type Gana = 'Deva' | 'Manushya' | 'Rakshasa';
type Nadi = 'Aadi' | 'Madhya' | 'Antya';
type YoniAnimal = 'Horse' | 'Elephant' | 'Goat' | 'Snake' | 'Dog' | 'Cat' | 'Rat' |
                  'Cow' | 'Buffalo' | 'Tiger' | 'Deer' | 'Monkey' | 'Lion' | 'Mongoose';

export const GANA: Gana[] = [
  'Deva',    // 0  Ashwini
  'Manushya',// 1  Bharani
  'Rakshasa',// 2  Krittika
  'Manushya',// 3  Rohini
  'Deva',    // 4  Mrigashira
  'Manushya',// 5  Ardra
  'Deva',    // 6  Punarvasu
  'Deva',    // 7  Pushya
  'Rakshasa',// 8  Ashlesha
  'Rakshasa',// 9  Magha
  'Manushya',// 10 Purva Phalguni
  'Manushya',// 11 Uttara Phalguni
  'Deva',    // 12 Hasta
  'Rakshasa',// 13 Chitra
  'Deva',    // 14 Swati
  'Rakshasa',// 15 Vishakha
  'Deva',    // 16 Anuradha
  'Rakshasa',// 17 Jyeshtha
  'Rakshasa',// 18 Mula
  'Manushya',// 19 Purva Ashadha
  'Manushya',// 20 Uttara Ashadha
  'Deva',    // 21 Shravana
  'Rakshasa',// 22 Dhanishtha
  'Rakshasa',// 23 Shatabhisha
  'Manushya',// 24 Purva Bhadrapada
  'Deva',    // 25 Uttara Bhadrapada
  'Deva',    // 26 Revati
];

const NADI: Nadi[] = [
  'Aadi',   // 0  Ashwini
  'Madhya', // 1  Bharani
  'Antya',  // 2  Krittika
  'Antya',  // 3  Rohini
  'Madhya', // 4  Mrigashira
  'Aadi',   // 5  Ardra
  'Aadi',   // 6  Punarvasu
  'Madhya', // 7  Pushya
  'Antya',  // 8  Ashlesha
  'Antya',  // 9  Magha
  'Madhya', // 10 Purva Phalguni
  'Aadi',   // 11 Uttara Phalguni
  'Aadi',   // 12 Hasta
  'Madhya', // 13 Chitra
  'Antya',  // 14 Swati
  'Antya',  // 15 Vishakha
  'Madhya', // 16 Anuradha
  'Aadi',   // 17 Jyeshtha
  'Aadi',   // 18 Mula
  'Madhya', // 19 Purva Ashadha
  'Antya',  // 20 Uttara Ashadha
  'Antya',  // 21 Shravana
  'Madhya', // 22 Dhanishtha
  'Aadi',   // 23 Shatabhisha
  'Aadi',   // 24 Purva Bhadrapada
  'Madhya', // 25 Uttara Bhadrapada
  'Antya',  // 26 Revati
];

const YONI_ANIMAL: YoniAnimal[] = [
  'Horse',    // 0  Ashwini
  'Elephant', // 1  Bharani
  'Goat',     // 2  Krittika
  'Snake',    // 3  Rohini
  'Snake',    // 4  Mrigashira
  'Dog',      // 5  Ardra
  'Cat',      // 6  Punarvasu
  'Goat',     // 7  Pushya
  'Cat',      // 8  Ashlesha
  'Rat',      // 9  Magha
  'Rat',      // 10 Purva Phalguni
  'Cow',      // 11 Uttara Phalguni
  'Buffalo',  // 12 Hasta
  'Tiger',    // 13 Chitra
  'Buffalo',  // 14 Swati
  'Tiger',    // 15 Vishakha
  'Deer',     // 16 Anuradha
  'Deer',     // 17 Jyeshtha
  'Dog',      // 18 Mula
  'Monkey',   // 19 Purva Ashadha
  'Mongoose', // 20 Uttara Ashadha  (natural enemy of all serpents)
  'Monkey',   // 21 Shravana
  'Lion',     // 22 Dhanishtha
  'Horse',    // 23 Shatabhisha
  'Lion',     // 24 Purva Bhadrapada
  'Cow',      // 25 Uttara Bhadrapada
  'Elephant', // 26 Revati
];

const YONI_GENDER: ('M' | 'F')[] = [
  'M', 'M', 'F', 'M', 'F', 'F', 'M', 'M', 'F', 'M',
  'F', 'F', 'M', 'M', 'F', 'F', 'F', 'M', 'M', 'M',
  'M', 'F', 'F', 'F', 'M', 'M', 'F',
];

// Natural enemy pairs (animals that cannot coexist)
const YONI_ENEMIES: [YoniAnimal, YoniAnimal][] = [
  ['Horse', 'Buffalo'],
  ['Elephant', 'Lion'],
  ['Goat', 'Monkey'],
  ['Snake', 'Mongoose'],
  ['Dog', 'Deer'],
  ['Cat', 'Rat'],
  ['Cow', 'Tiger'],
];

// Sign lords (sign index 0–11)
type PlanetName = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';
const SIGN_LORDS: PlanetName[] = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

// Natural friendship: FRIEND=2, NEUTRAL=1, ENEMY=0
const PLANET_FRIENDSHIP: Record<PlanetName, Record<PlanetName, number>> = {
  Sun:     { Sun: 1, Moon: 2, Mars: 2, Mercury: 1, Jupiter: 2, Venus: 0, Saturn: 0 },
  Moon:    { Sun: 2, Moon: 1, Mars: 1, Mercury: 2, Jupiter: 1, Venus: 1, Saturn: 1 },
  Mars:    { Sun: 2, Moon: 2, Mars: 1, Mercury: 0, Jupiter: 2, Venus: 1, Saturn: 1 },
  Mercury: { Sun: 2, Moon: 0, Mars: 1, Mercury: 1, Jupiter: 1, Venus: 2, Saturn: 1 },
  Jupiter: { Sun: 2, Moon: 2, Mars: 2, Mercury: 0, Jupiter: 1, Venus: 0, Saturn: 1 },
  Venus:   { Sun: 0, Moon: 0, Mars: 1, Mercury: 2, Jupiter: 1, Venus: 1, Saturn: 2 },
  Saturn:  { Sun: 0, Moon: 0, Mars: 0, Mercury: 2, Jupiter: 1, Venus: 2, Saturn: 1 },
};

// Varna rank (higher is spiritually senior): Brahmin=3, Kshatriya=2, Vaishya=1, Shudra=0
const VARNA: number[] = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
// 0=Aries, 1=Taurus, 2=Gemini, 3=Cancer, 4=Leo, 5=Virgo, 6=Libra, 7=Scorpio,
// 8=Sagittarius, 9=Capricorn, 10=Aquarius, 11=Pisces

const VARNA_NAMES = ['Shudra', 'Vaishya', 'Kshatriya', 'Brahmin'];

// Vashya: which signs a sign "controls" (sign indices 0–11)
const VASHYA_CONTROLS: number[][] = [
  [4, 7],    // Aries → Leo, Scorpio
  [3, 6],    // Taurus → Cancer, Libra
  [5],       // Gemini → Virgo
  [7, 8],    // Cancer → Scorpio, Sagittarius
  [9],       // Leo → Capricorn
  [11],      // Virgo → Pisces
  [9, 10],   // Libra → Capricorn, Aquarius
  [3],       // Scorpio → Cancer
  [11],      // Sagittarius → Pisces
  [0],       // Capricorn → Aries
  [0],       // Aquarius → Aries
  [9],       // Pisces → Capricorn
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KootaScore {
  koota: string;
  maxPoints: number;
  score: number;
  detail: string;
}

export interface GunaMilanResult {
  person1Name: string;
  person2Name: string;
  person1Nakshatra: string;
  person2Nakshatra: string;
  person1MoonSign: string;
  person2MoonSign: string;
  kootas: KootaScore[];
  totalScore: number;
  maxScore: 36;
  verdict: 'Excellent' | 'Good' | 'Average' | 'Poor';
  verdictDetail: string;
  hasNadiDosha: boolean;
  hasBhakootDosha: boolean;
}

// ─── Individual Koota Calculations ───────────────────────────────────────────

function computeVarna(sign1: number, sign2: number): KootaScore {
  const v1 = VARNA[sign1]!;
  const v2 = VARNA[sign2]!;
  // Traditional: if groom's varna ≥ bride's varna = 1 point
  // We compute directionally agnostic: score 1 if compatible, 0 otherwise
  // Compatible = same varna OR varna1 ≥ varna2 (if person1 is viewed as groom) OR varna2 ≥ varna1
  const score = v1 === v2 ? 1 : (Math.abs(v1 - v2) <= 1 ? 0.5 : 0);
  return {
    koota: 'Varna',
    maxPoints: 1,
    score: Math.min(1, score),
    detail: `${VARNA_NAMES[v1]} & ${VARNA_NAMES[v2]}`,
  };
}

function computeVashya(sign1: number, sign2: number): KootaScore {
  const controls1 = VASHYA_CONTROLS[sign1] ?? [];
  const controls2 = VASHYA_CONTROLS[sign2] ?? [];
  let score = 0;
  let detail = 'No vashya relation';
  if (sign1 === sign2) { score = 2; detail = 'Same sign (full vashya)'; }
  else if (controls1.includes(sign2) && controls2.includes(sign1)) { score = 2; detail = 'Mutual vashya'; }
  else if (controls1.includes(sign2)) { score = 2; detail = 'Person 1 has vashya over person 2'; }
  else if (controls2.includes(sign1)) { score = 2; detail = 'Person 2 has vashya over person 1'; }
  else { score = 0.5; detail = 'No direct vashya — partial compatibility'; }
  return { koota: 'Vashya', maxPoints: 2, score, detail };
}

function computeTara(nak1: number, nak2: number): KootaScore {
  const FAVORABLE = new Set([2, 4, 6, 8, 9]); // Sampat, Kshema, Sadhaka, Mitra, Ati-Mitra
  const count1 = ((nak2 - nak1 + 27) % 27) % 9 + 1;
  const count2 = ((nak1 - nak2 + 27) % 27) % 9 + 1;
  const fav1 = FAVORABLE.has(count1);
  const fav2 = FAVORABLE.has(count2);
  const score = fav1 && fav2 ? 3 : fav1 || fav2 ? 1.5 : 0;
  const TARA_NAMES = ['', 'Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Ati-Mitra'];
  return {
    koota: 'Tara',
    maxPoints: 3,
    score,
    detail: `Tara ${count1} (${TARA_NAMES[count1] ?? '?'}) / Tara ${count2} (${TARA_NAMES[count2] ?? '?'})`,
  };
}

function areYoniEnemies(a: YoniAnimal, b: YoniAnimal): boolean {
  return YONI_ENEMIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function computeYoni(nak1: number, nak2: number): KootaScore {
  const a1 = YONI_ANIMAL[nak1]!;
  const a2 = YONI_ANIMAL[nak2]!;
  const g1 = YONI_GENDER[nak1]!;
  const g2 = YONI_GENDER[nak2]!;
  let score: number;
  let detail: string;

  if (a1 === a2) {
    score = 4;
    detail = `Same yoni — ${a1}`;
  } else if (areYoniEnemies(a1, a2)) {
    score = 0;
    detail = `Enemy yoni — ${a1} vs ${a2}`;
  } else if (g1 !== g2) {
    score = 3;
    detail = `Compatible yoni — ${a1} (${g1}) & ${a2} (${g2}), opposite sex`;
  } else {
    score = 2;
    detail = `Friendly yoni — ${a1} & ${a2}, same sex`;
  }

  return { koota: 'Yoni', maxPoints: 4, score, detail };
}

function computeGrahaMaitri(sign1: number, sign2: number): KootaScore {
  const lord1 = SIGN_LORDS[sign1]!;
  const lord2 = SIGN_LORDS[sign2]!;
  const f1 = PLANET_FRIENDSHIP[lord1]?.[lord2] ?? 1;
  const f2 = PLANET_FRIENDSHIP[lord2]?.[lord1] ?? 1;
  const total = f1 + f2; // 0–4

  const FRIENDSHIP_LABEL = ['Enemy', 'Neutral', 'Friend'];
  let score: number;
  if (total === 4) score = 5;
  else if (total === 3) score = 4;
  else if (total === 2) { if (f1 === 1 && f2 === 1) score = 3; else score = 1; }
  else if (total === 1) score = 0.5;
  else score = 0;

  return {
    koota: 'Graha Maitri',
    maxPoints: 5,
    score,
    detail: `${lord1} (${FRIENDSHIP_LABEL[f1] ?? '?'} to ${lord2}) / ${lord2} (${FRIENDSHIP_LABEL[f2] ?? '?'} to ${lord1})`,
  };
}

function computeGana(nak1: number, nak2: number): KootaScore {
  const g1 = GANA[nak1]!;
  const g2 = GANA[nak2]!;
  let score: number;
  if (g1 === g2) {
    score = 6;
  } else if ((g1 === 'Deva' && g2 === 'Manushya') || (g1 === 'Manushya' && g2 === 'Deva')) {
    score = 5;
  } else if ((g1 === 'Deva' && g2 === 'Rakshasa') || (g1 === 'Rakshasa' && g2 === 'Deva')) {
    score = 1;
  } else {
    // Manushya + Rakshasa (either direction)
    score = 0;
  }
  return {
    koota: 'Gana',
    maxPoints: 6,
    score,
    detail: `${g1} & ${g2}`,
  };
}

function computeBhakoot(sign1: number, sign2: number): KootaScore {
  const count1 = ((sign2 - sign1 + 12) % 12) + 1;
  const count2 = ((sign1 - sign2 + 12) % 12) + 1;

  const isBad =
    (count1 === 6 || count2 === 6) ||                        // 6/8
    (count1 === 8 || count2 === 8) ||
    (count1 === 5 && count2 === 9) || (count1 === 9 && count2 === 5) ||  // 5/9
    (count1 === 2 && count2 === 12) || (count1 === 12 && count2 === 2);  // 2/12

  const score = isBad ? 0 : 7;
  const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const dosha = count1 === 6 || count2 === 6 || count1 === 8 || count2 === 8 ? '6/8 Bhakoot Dosha' :
                (count1 === 5 || count1 === 9 ? '5/9 Bhakoot Dosha' :
                (count1 === 2 || count1 === 12 ? '2/12 Bhakoot Dosha' : ''));
  return {
    koota: 'Bhakoot',
    maxPoints: 7,
    score,
    detail: isBad
      ? `${dosha} — ${SIGN_NAMES[sign1]} to ${SIGN_NAMES[sign2]}: ${count1}/${count2}`
      : `Favorable — ${SIGN_NAMES[sign1]} / ${SIGN_NAMES[sign2]}: ${count1}/${count2}`,
  };
}

function computeNadi(nak1: number, nak2: number): KootaScore {
  const n1 = NADI[nak1]!;
  const n2 = NADI[nak2]!;
  const same = n1 === n2;
  return {
    koota: 'Nadi',
    maxPoints: 8,
    score: same ? 0 : 8,
    detail: same ? `Nadi Dosha — both ${n1} Nadi` : `${n1} & ${n2} Nadi — compatible`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GunaMilanInput {
  person1Name: string;
  person1NakshatraIndex: number;  // 0–26
  person1SignIndex: number;       // 0–11

  person2Name: string;
  person2NakshatraIndex: number;
  person2SignIndex: number;
}

const NAKSHATRA_NAMES_27 = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha',
  'Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
];
const SIGN_NAMES_12 = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

export function computeGunaMilan(input: GunaMilanInput): GunaMilanResult {
  const { person1Name, person1NakshatraIndex: n1, person1SignIndex: s1,
          person2Name, person2NakshatraIndex: n2, person2SignIndex: s2 } = input;

  const kootas: KootaScore[] = [
    computeVarna(s1, s2),
    computeVashya(s1, s2),
    computeTara(n1, n2),
    computeYoni(n1, n2),
    computeGrahaMaitri(s1, s2),
    computeGana(n1, n2),
    computeBhakoot(s1, s2),
    computeNadi(n1, n2),
  ];

  const totalScore = kootas.reduce((sum, k) => sum + k.score, 0);
  const nadiKoota = kootas.find(k => k.koota === 'Nadi')!;
  const bhakootKoota = kootas.find(k => k.koota === 'Bhakoot')!;

  let verdict: GunaMilanResult['verdict'];
  let verdictDetail: string;

  if (totalScore >= 32) {
    verdict = 'Excellent';
    verdictDetail = 'Highly auspicious match. Strong across all dimensions.';
  } else if (totalScore >= 24) {
    verdict = 'Good';
    verdictDetail = 'Good compatibility with some areas of care.';
  } else if (totalScore >= 18) {
    verdict = 'Average';
    verdictDetail = 'Average match. Compatibility exists but requires conscious effort.';
  } else {
    verdict = 'Poor';
    verdictDetail = 'Below the traditional minimum of 18. Careful consideration recommended.';
  }

  return {
    person1Name,
    person2Name,
    person1Nakshatra: NAKSHATRA_NAMES_27[n1] ?? 'Unknown',
    person2Nakshatra: NAKSHATRA_NAMES_27[n2] ?? 'Unknown',
    person1MoonSign: SIGN_NAMES_12[s1] ?? 'Unknown',
    person2MoonSign: SIGN_NAMES_12[s2] ?? 'Unknown',
    kootas,
    totalScore: Math.round(totalScore * 2) / 2, // round to nearest 0.5
    maxScore: 36,
    verdict,
    verdictDetail,
    hasNadiDosha: nadiKoota.score === 0,
    hasBhakootDosha: bhakootKoota.score === 0,
  };
}

/**
 * Extract Moon nakshatra and sign from a canonical chart's planet positions.
 * Returns null if Moon is not found in the chart.
 */
export function getMoonDataFromLongitude(moonSiderealLongitude: number): {
  nakshatraIndex: number;
  signIndex: number;
} {
  const nakshatraIndex = Math.floor((moonSiderealLongitude / 360) * 27) % 27;
  const signIndex = Math.floor(moonSiderealLongitude / 30) % 12;
  return { nakshatraIndex, signIndex };
}
