/**
 * Dosha detection for Jyotish.
 *
 * A dosha (literally "fault" or "imperfection") is a specific planetary
 * combination considered inauspicious according to classical Jyotish.
 * Understanding doshas allows for awareness and appropriate remedial measures.
 *
 * Implementation note: Multiple schools define doshas differently. We implement
 * the most widely accepted Parashari definitions and document assumptions.
 *
 * Note on tone: Doshas should never be presented as deterministic predictions
 * of misfortune. They indicate tendencies that may or may not manifest
 * depending on the full chart context.
 */

import type { DoshaData, PlanetPosition, HouseData } from '@luckyray/shared';
import { SIGN_LORDS } from '@luckyray/shared';

interface DoshaDetectionInput {
  planets: PlanetPosition[];
  houses: HouseData[];
  ascendantSignIndex: number;
}

/**
 * Detect common doshas from the chart.
 */
export function detectDoshas(input: DoshaDetectionInput): DoshaData[] {
  const { planets, houses, ascendantSignIndex } = input;

  return [
    detectManglikDosha(planets, houses, ascendantSignIndex),
    detectKalaSarpaDosha(planets),
    detectPitruDosha(planets, houses),
    detectShakatYoga(planets),
  ];
}

/**
 * Manglik Dosha (Kuja Dosha): Mars in specific houses.
 *
 * Mars in houses 1, 2, 4, 7, 8, or 12 from the Lagna (Ascendant),
 * Moon, or Venus.
 *
 * Different schools use different house lists. We implement the most
 * commonly accepted Parashari list: 1, 4, 7, 8, 12 from Lagna.
 *
 * Cancellations are documented.
 *
 * Reference: BPHS; various modern Jyotish texts.
 * Assumption: Counting from Lagna only for MVP.
 */
function detectManglikDosha(
  planets: PlanetPosition[],
  houses: HouseData[],
  ascendantSignIndex: number,
): DoshaData {
  const mars = planets.find(p => p.id === 'Mars');
  if (!mars) {
    return notDetected('manglik', 'Manglik Dosha');
  }

  // Manglik houses from Lagna (most conservative interpretation)
  const manglikHouses = [1, 2, 4, 7, 8, 12];
  const inManglikHouse = manglikHouses.includes(mars.house);
  const evidence: string[] = [];

  if (inManglikHouse) {
    evidence.push(`Mars in H${mars.house} (${mars.sign}) — one of the Manglik houses`);
  }

  // Common cancellations
  const cancellations: string[] = [];
  if (mars.isExalted) cancellations.push('Mars is exalted — significantly reduces Manglik effect');
  if (mars.isInOwnSign) cancellations.push('Mars is in own sign — reduces Manglik effect');
  if (mars.house === 1 && mars.signIndex === 0) cancellations.push('Mars in Aries Lagna — self-cancelling according to some schools');
  if (mars.house === 8 && mars.signIndex === 9) cancellations.push('Mars in Scorpio 8th — own sign cancellation');

  const isManglik = inManglikHouse && cancellations.length === 0;

  return {
    id: 'manglik',
    name: 'Manglik Dosha',
    detected: inManglikHouse,
    evidence,
    severity: isManglik ? 'High' : inManglikHouse ? 'Moderate' : undefined,
    cancellations,
    reference: 'BPHS; generally accepted Parashari interpretation; Counting from Lagna only',
    school: 'Parashari (conservative list: houses 1,2,4,7,8,12)',
  };
}

/**
 * Kala Sarpa Dosha: All planets between Rahu and Ketu.
 *
 * When all seven classical planets (Sun to Saturn) lie within the arc
 * from Rahu to Ketu (following Rahu's direction), Kala Sarpa Dosha is formed.
 *
 * Note: This is a controversial dosha with many differing opinions on its
 * effects and cancellations. We present it factually without alarmism.
 *
 * Reference: Modern Jyotish tradition; not explicitly in BPHS.
 * Assumption: Using the standard definition where all 7 planets are within
 * the Rahu-to-Ketu arc in the direction of Rahu's motion.
 */
function detectKalaSarpaDosha(planets: PlanetPosition[]): DoshaData {
  const rahu = planets.find(p => p.id === 'Rahu');
  const ketu = planets.find(p => p.id === 'Ketu');
  if (!rahu || !ketu) return notDetected('kala-sarpa', 'Kala Sarpa Dosha');

  const classicalPlanets = planets.filter(p =>
    !['Rahu', 'Ketu'].includes(p.id),
  );

  // Rahu is always retrograde; it moves clockwise in the zodiac
  // The arc from Rahu to Ketu (in zodiac direction: Rahu → Ketu going backwards)
  // Actually: in sidereal longitude, Ketu = Rahu + 180 degrees
  // Planets must all be between Rahu's longitude and Ketu's longitude
  // going from Rahu to Ketu in the direction of decreasing longitude (retrograde)

  const rahuLon = rahu.siderealLongitude;
  const ketuLon = ketu.siderealLongitude; // = rahuLon + 180

  let allInArc = true;
  const outsidePlanets: string[] = [];

  for (const planet of classicalPlanets) {
    const lon = planet.siderealLongitude;
    // Check if planet is in arc from Rahu going forward to Ketu
    const inArc = isInArc(lon, rahuLon, ketuLon);
    if (!inArc) {
      allInArc = false;
      outsidePlanets.push(planet.id);
    }
  }

  const evidence: string[] = allInArc
    ? [`All 7 classical planets are within the arc from Rahu (${Math.round(rahuLon)}°) to Ketu (${Math.round(ketuLon)}°)`]
    : outsidePlanets.map(p => `${p} is outside the Rahu-Ketu arc — cancels Kala Sarpa`);

  return {
    id: 'kala-sarpa',
    name: 'Kala Sarpa Dosha',
    detected: allInArc,
    evidence,
    severity: allInArc ? 'Moderate' : undefined,
    cancellations: allInArc
      ? ['Presence of Jupiter or strong benefics in Kendras mitigates effects']
      : [],
    reference: 'Modern Jyotish tradition; Rahu-Ketu arc definition',
    school: 'Modern Parashari (not explicitly in BPHS)',
  };
}

/**
 * Pitru Dosha: Afflictions to the 9th house/lord (father/ancestors).
 *
 * Pitru Dosha is indicated by Sun, Moon, or Rahu in the 9th house,
 * or Rahu/Ketu afflicting the 9th lord.
 *
 * Note: This is a relatively modern concept in widespread Jyotish practice.
 *
 * Reference: Various modern Jyotish sources; K.N. Rao.
 */
function detectPitruDosha(planets: PlanetPosition[], houses: HouseData[]): DoshaData {
  const ninthHouse = houses[8]; // H9
  if (!ninthHouse) return notDetected('pitru', 'Pitru Dosha');

  const rahu = planets.find(p => p.id === 'Rahu');
  const ketu = planets.find(p => p.id === 'Ketu');
  const sun = planets.find(p => p.id === 'Sun');

  const evidence: string[] = [];

  // Rahu or Ketu in 9th house
  if (rahu && rahu.house === 9) evidence.push('Rahu in 9th house');
  if (ketu && ketu.house === 9) evidence.push('Ketu in 9th house');

  // Sun debilitated or afflicted in 9th
  if (sun && sun.house === 9 && sun.isDebilitated) {
    evidence.push('Sun debilitated in 9th house');
  }

  // 9th lord debilitated or in 6/8/12
  const ninthLord = planets.find(p => p.id === ninthHouse.lord);
  if (ninthLord && (ninthLord.isDebilitated || [6, 8, 12].includes(ninthLord.house))) {
    evidence.push(`9th lord ${ninthLord.id} in difficult position (H${ninthLord.house})`);
  }

  const detected = evidence.length > 0;

  return {
    id: 'pitru',
    name: 'Pitru Dosha',
    detected,
    evidence,
    severity: detected ? (evidence.length >= 2 ? 'Moderate' : 'Low') : undefined,
    cancellations: ['Strong benefics in 9th; Jupiter aspecting 9th lord; exalted Sun'],
    reference: 'Modern Jyotish tradition; K.N. Rao interpretation',
    school: 'Modern Parashari',
  };
}

/**
 * Shakata Yoga (not strictly a dosha): Moon in dusthana from Jupiter.
 * Can indicate fluctuating fortunes and mental stress periods.
 */
function detectShakatYoga(planets: PlanetPosition[]): DoshaData {
  const moon = planets.find(p => p.id === 'Moon');
  const jupiter = planets.find(p => p.id === 'Jupiter');
  if (!moon || !jupiter) return notDetected('shakat', 'Shakata Yoga');

  const houseDiff = ((moon.house - jupiter.house + 12) % 12);
  const detected = [6, 8, 12].includes(houseDiff);

  return {
    id: 'shakat',
    name: 'Shakata Yoga',
    detected,
    evidence: detected
      ? [`Moon (H${moon.house}) is in a dusthana position from Jupiter (H${jupiter.house})`]
      : [],
    severity: detected ? 'Low' : undefined,
    cancellations: ['Aspect of benefics on Moon; strong Moon dignity; Moon in own sign or exalted'],
    reference: 'B.V. Raman "Three Hundred Combinations" #196; BPHS',
    school: 'Parashari',
  };
}

function notDetected(id: string, name: string): DoshaData {
  return {
    id,
    name,
    detected: false,
    evidence: [],
    cancellations: [],
    reference: '',
    school: '',
  };
}

function isInArc(lon: number, start: number, end: number): boolean {
  const normalizedLon = ((lon - start) % 360 + 360) % 360;
  const normalizedEnd = ((end - start) % 360 + 360) % 360;
  return normalizedLon <= normalizedEnd;
}
