export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

export type NakshatraName = typeof NAKSHATRA_NAMES[number];

export const NAKSHATRA_DEGREES = 360 / 27; // 13.333...
export const PADA_DEGREES = NAKSHATRA_DEGREES / 4; // 3.333...

export const NAKSHATRA_DEITIES: Record<NakshatraName, string> = {
  Ashwini: 'Ashwins', Bharani: 'Yama', Krittika: 'Agni', Rohini: 'Brahma',
  Mrigashira: 'Soma', Ardra: 'Rudra', Punarvasu: 'Aditi', Pushya: 'Brihaspati',
  Ashlesha: 'Sarpa', Magha: 'Pitrs', 'Purva Phalguni': 'Bhaga', 'Uttara Phalguni': 'Aryaman',
  Hasta: 'Savitar', Chitra: 'Tvashtar', Swati: 'Vayu', Vishakha: 'Indra-Agni',
  Anuradha: 'Mitra', Jyeshtha: 'Indra', Mula: 'Nirriti', 'Purva Ashadha': 'Apas',
  'Uttara Ashadha': 'Vishvadevas', Shravana: 'Vishnu', Dhanishtha: 'Vasus',
  Shatabhisha: 'Varuna', 'Purva Bhadrapada': 'Aja Ekapada', 'Uttara Bhadrapada': 'Ahir Budhnya',
  Revati: 'Pushan',
};

export const NAKSHATRA_SYMBOLS: Record<NakshatraName, string> = {
  Ashwini: 'Horse head', Bharani: 'Yoni', Krittika: 'Razor', Rohini: 'Chariot',
  Mrigashira: 'Deer head', Ardra: 'Teardrop', Punarvasu: 'Quiver', Pushya: 'Flower',
  Ashlesha: 'Serpent coil', Magha: 'Throne', 'Purva Phalguni': 'Hammock', 'Uttara Phalguni': 'Fig tree',
  Hasta: 'Hand', Chitra: 'Pearl', Swati: 'Sword', Vishakha: 'Triumphal arch',
  Anuradha: 'Lotus', Jyeshtha: 'Umbrella', Mula: 'Tied roots', 'Purva Ashadha': 'Elephant tusk',
  'Uttara Ashadha': 'Elephant tusk', Shravana: 'Ear', Dhanishtha: 'Drum',
  Shatabhisha: 'Empty circle', 'Purva Bhadrapada': 'Sword', 'Uttara Bhadrapada': 'Twins',
  Revati: 'Fish',
};
