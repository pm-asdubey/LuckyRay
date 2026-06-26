export const SIGN_IDS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type SignId = typeof SIGN_IDS[number];

export const SIGN_SANSKRIT: Record<SignId, string> = {
  Aries: 'Mesha', Taurus: 'Vrishabha', Gemini: 'Mithuna', Cancer: 'Karka',
  Leo: 'Simha', Virgo: 'Kanya', Libra: 'Tula', Scorpio: 'Vrishchika',
  Sagittarius: 'Dhanu', Capricorn: 'Makara', Aquarius: 'Kumbha', Pisces: 'Meena',
};

export const SIGN_ABBREVIATIONS: Record<SignId, string> = {
  Aries: 'Ar', Taurus: 'Ta', Gemini: 'Ge', Cancer: 'Ca',
  Leo: 'Le', Virgo: 'Vi', Libra: 'Li', Scorpio: 'Sc',
  Sagittarius: 'Sg', Capricorn: 'Cp', Aquarius: 'Aq', Pisces: 'Pi',
};

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable';
export type Gender = 'Masculine' | 'Feminine';

export const SIGN_ELEMENT: Record<SignId, Element> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

export const SIGN_MODALITY: Record<SignId, Modality> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable', Cancer: 'Cardinal',
  Leo: 'Fixed', Virgo: 'Mutable', Libra: 'Cardinal', Scorpio: 'Fixed',
  Sagittarius: 'Mutable', Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
};

export const SIGN_GENDER: Record<SignId, Gender> = {
  Aries: 'Masculine', Taurus: 'Feminine', Gemini: 'Masculine', Cancer: 'Feminine',
  Leo: 'Masculine', Virgo: 'Feminine', Libra: 'Masculine', Scorpio: 'Feminine',
  Sagittarius: 'Masculine', Capricorn: 'Feminine', Aquarius: 'Masculine', Pisces: 'Feminine',
};

// House themes (Parashari)
export const HOUSE_THEMES: Record<number, string[]> = {
  1: ['Self', 'Body', 'Personality', 'Appearance', 'General Health'],
  2: ['Wealth', 'Family', 'Speech', 'Food', 'Values'],
  3: ['Siblings', 'Courage', 'Short Journeys', 'Communication', 'Efforts'],
  4: ['Mother', 'Home', 'Happiness', 'Education', 'Property'],
  5: ['Children', 'Intelligence', 'Creativity', 'Romance', 'Speculation'],
  6: ['Enemies', 'Debts', 'Diseases', 'Service', 'Daily Routines'],
  7: ['Spouse', 'Partnership', 'Business', 'Long Journeys', 'Contracts'],
  8: ['Longevity', 'Transformation', 'Hidden Matters', 'Inheritance', 'Occult'],
  9: ['Father', 'Dharma', 'Fortune', 'Higher Education', 'Spirituality'],
  10: ['Career', 'Status', 'Reputation', 'Authority', 'Public Life'],
  11: ['Gains', 'Income', 'Friends', 'Desires', 'Elder Siblings'],
  12: ['Losses', 'Expenses', 'Liberation', 'Foreign Lands', 'Hidden Enemies'],
};
