export const PLANET_IDS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
] as const;

export type PlanetId = typeof PLANET_IDS[number];

export const PLANET_SYMBOLS: Record<PlanetId, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
};

export const PLANET_ABBREVIATIONS: Record<PlanetId, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export const PLANET_SANSKRIT: Record<PlanetId, string> = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal', Mercury: 'Budha',
  Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu',
};

// Natural benefics and malefics (Parashari tradition)
export const NATURAL_BENEFICS: PlanetId[] = ['Moon', 'Mercury', 'Jupiter', 'Venus'];
export const NATURAL_MALEFICS: PlanetId[] = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

// Planetary dignities: sign of exaltation
export const EXALTATION_SIGN: Partial<Record<PlanetId, number>> = {
  Sun: 0,       // Aries
  Moon: 1,      // Taurus
  Mars: 9,      // Capricorn
  Mercury: 5,   // Virgo
  Jupiter: 3,   // Cancer
  Venus: 11,    // Pisces
  Saturn: 6,    // Libra
};

// Sign of debilitation (opposite of exaltation)
export const DEBILITATION_SIGN: Partial<Record<PlanetId, number>> = {
  Sun: 6,       // Libra
  Moon: 7,      // Scorpio
  Mars: 3,      // Cancer
  Mercury: 11,  // Pisces
  Jupiter: 9,   // Capricorn
  Venus: 5,     // Virgo
  Saturn: 0,    // Aries
};

// Sign rulerships (Parashari, each planet rules 1-2 signs)
export const SIGN_LORDS: PlanetId[] = [
  'Mars',     // 0 Aries
  'Venus',    // 1 Taurus
  'Mercury',  // 2 Gemini
  'Moon',     // 3 Cancer
  'Sun',      // 4 Leo
  'Mercury',  // 5 Virgo
  'Venus',    // 6 Libra
  'Mars',     // 7 Scorpio
  'Jupiter',  // 8 Sagittarius
  'Saturn',   // 9 Capricorn
  'Saturn',   // 10 Aquarius
  'Jupiter',  // 11 Pisces
];

// Moolatrikona ranges (sign index, degrees)
export const MOOLATRIKONA: Partial<Record<PlanetId, { sign: number; from: number; to: number }>> = {
  Sun:     { sign: 4, from: 0,  to: 20 },  // Leo 0-20
  Moon:    { sign: 1, from: 4,  to: 30 },  // Taurus 4-30
  Mars:    { sign: 0, from: 0,  to: 12 },  // Aries 0-12
  Mercury: { sign: 5, from: 16, to: 20 },  // Virgo 16-20
  Jupiter: { sign: 8, from: 0,  to: 10 },  // Sagittarius 0-10
  Venus:   { sign: 6, from: 0,  to: 15 },  // Libra 0-15
  Saturn:  { sign: 10, from: 0, to: 20 },  // Aquarius 0-20
};

// Vimshottari Dasha periods (years) and nakshatra lords
export const VIMSHOTTARI_ORDER: PlanetId[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];
export const VIMSHOTTARI_YEARS: Record<PlanetId, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
export const VIMSHOTTARI_TOTAL_YEARS = 120;

// Nakshatra lords (by nakshatra index 0-26)
export const NAKSHATRA_LORDS: PlanetId[] = [
  'Ketu',    // 0  Ashwini
  'Venus',   // 1  Bharani
  'Sun',     // 2  Krittika
  'Moon',    // 3  Rohini
  'Mars',    // 4  Mrigashira
  'Rahu',    // 5  Ardra
  'Jupiter', // 6  Punarvasu
  'Saturn',  // 7  Pushya
  'Mercury', // 8  Ashlesha
  'Ketu',    // 9  Magha
  'Venus',   // 10 Purva Phalguni
  'Sun',     // 11 Uttara Phalguni
  'Moon',    // 12 Hasta
  'Mars',    // 13 Chitra
  'Rahu',    // 14 Swati
  'Jupiter', // 15 Vishakha
  'Saturn',  // 16 Anuradha
  'Mercury', // 17 Jyeshtha
  'Ketu',    // 18 Mula
  'Venus',   // 19 Purva Ashadha
  'Sun',     // 20 Uttara Ashadha
  'Moon',    // 21 Shravana
  'Mars',    // 22 Dhanishtha
  'Rahu',    // 23 Shatabhisha
  'Jupiter', // 24 Purva Bhadrapada
  'Saturn',  // 25 Uttara Bhadrapada
  'Mercury', // 26 Revati
];

// Natural friendship table (Parashari)
// For each planet: friends, neutrals, enemies
export type FriendshipStatus = 'friend' | 'neutral' | 'enemy';
export const NATURAL_FRIENDSHIPS: Record<PlanetId, Record<PlanetId, FriendshipStatus>> = {
  Sun: {
    Sun: 'neutral', Moon: 'friend', Mars: 'friend', Mercury: 'neutral',
    Jupiter: 'friend', Venus: 'enemy', Saturn: 'enemy', Rahu: 'enemy', Ketu: 'neutral',
  },
  Moon: {
    Sun: 'friend', Moon: 'neutral', Mars: 'neutral', Mercury: 'neutral',
    Jupiter: 'friend', Venus: 'friend', Saturn: 'neutral', Rahu: 'neutral', Ketu: 'neutral',
  },
  Mars: {
    Sun: 'friend', Moon: 'neutral', Mars: 'neutral', Mercury: 'enemy',
    Jupiter: 'friend', Venus: 'neutral', Saturn: 'neutral', Rahu: 'neutral', Ketu: 'friend',
  },
  Mercury: {
    Sun: 'neutral', Moon: 'enemy', Mars: 'neutral', Mercury: 'neutral',
    Jupiter: 'neutral', Venus: 'friend', Saturn: 'friend', Rahu: 'friend', Ketu: 'neutral',
  },
  Jupiter: {
    Sun: 'friend', Moon: 'friend', Mars: 'friend', Mercury: 'enemy',
    Jupiter: 'neutral', Venus: 'enemy', Saturn: 'neutral', Rahu: 'enemy', Ketu: 'friend',
  },
  Venus: {
    Sun: 'enemy', Moon: 'neutral', Mars: 'neutral', Mercury: 'friend',
    Jupiter: 'neutral', Venus: 'neutral', Saturn: 'friend', Rahu: 'friend', Ketu: 'neutral',
  },
  Saturn: {
    Sun: 'enemy', Moon: 'enemy', Mars: 'neutral', Mercury: 'friend',
    Jupiter: 'neutral', Venus: 'friend', Saturn: 'neutral', Rahu: 'friend', Ketu: 'neutral',
  },
  Rahu: {
    Sun: 'enemy', Moon: 'enemy', Mars: 'neutral', Mercury: 'friend',
    Jupiter: 'enemy', Venus: 'friend', Saturn: 'friend', Rahu: 'neutral', Ketu: 'neutral',
  },
  Ketu: {
    Sun: 'neutral', Moon: 'neutral', Mars: 'friend', Mercury: 'neutral',
    Jupiter: 'friend', Venus: 'neutral', Saturn: 'neutral', Rahu: 'neutral', Ketu: 'neutral',
  },
};
