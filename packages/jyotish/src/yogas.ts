/**
 * Yoga detection for Jyotish.
 *
 * A yoga (literally "union") is a planetary combination that produces
 * specific life effects. This module implements programmatic detection
 * of common yogas from the canonical chart data.
 *
 * Implementation note: Yoga detection is inherently complex because
 * different classical texts define yogas differently. We implement the
 * most widely accepted Parashari definitions and document our sources.
 *
 * Confidence levels:
 *   Strong  — All required conditions satisfied
 *   Moderate — Most required conditions satisfied
 *   Weak   — Partial conditions or conflicting indicators
 *
 * Reference: Parasara Hora Shastra; B.V. Raman, "Three Hundred Important
 * Combinations" (1947); K.S. Krishnamurti.
 */

import type { YogaData, PlanetPosition, HouseData, PlanetId } from '@luckyray/shared';
import { SIGN_LORDS, EXALTATION_SIGN } from '@luckyray/shared';

interface YogaDetectionInput {
  planets: PlanetPosition[];
  houses: HouseData[];
  ascendantSignIndex: number;
}

type DetectedYoga = YogaData;

/**
 * Detect all applicable yogas from the chart.
 */
export function detectYogas(input: YogaDetectionInput): YogaData[] {
  const { planets, houses, ascendantSignIndex } = input;

  const yogas: YogaData[] = [];

  yogas.push(...detectGajakesariYoga(planets, houses));
  yogas.push(...detectBudhaAdityaYoga(planets));
  yogas.push(...detectChandraMangalYoga(planets));
  yogas.push(...detectRajaYogas(planets, houses, ascendantSignIndex));
  yogas.push(...detectNeechabhangaYoga(planets));
  yogas.push(...detectParivartan(planets));
  yogas.push(...detectAdhibhava(planets, houses));
  yogas.push(...detectVipareeta(planets, houses));
  yogas.push(...detectPanchaMahapurusha(planets));
  yogas.push(...detectVasudhara(planets, houses));

  return yogas;
}

// ─── Individual Yoga Detectors ────────────────────────────────────────────────

/**
 * Gajakesari Yoga: Jupiter in a Kendra (1,4,7,10) from the Moon.
 * Effect: Intelligence, generosity, fame.
 * Source: BPHS ch. 75, v. 1.
 */
function detectGajakesariYoga(planets: PlanetPosition[], houses: HouseData[]): YogaData[] {
  const moon = planets.find(p => p.id === 'Moon');
  const jupiter = planets.find(p => p.id === 'Jupiter');
  if (!moon || !jupiter) return [notDetected('gajakesari')];

  const houseDiff = ((jupiter.house - moon.house + 12) % 12);
  const inKendra = [0, 3, 6, 9].includes(houseDiff);

  const evidence: string[] = [];
  if (inKendra) {
    evidence.push(`Jupiter in H${jupiter.house} is in a Kendra from Moon in H${moon.house}`);
    if (!jupiter.isDebilitated && !jupiter.isCombust) {
      evidence.push('Jupiter is unafflicted');
    }
  }

  const detected = inKendra && !jupiter.isDebilitated;
  return [{
    id: 'gajakesari',
    name: 'Gajakesari Yoga',
    detected,
    strength: detected ? (jupiter.isExalted || jupiter.isInOwnSign ? 'Strong' : 'Moderate') : null,
    evidence,
    reference: 'BPHS ch. 75, v. 1; B.V. Raman "Three Hundred Combinations" #1',
    category: 'Lunar',
    description: 'Jupiter in an angular house from the Moon. Produces intelligence, eloquence, generous nature, and respect from authority.',
  }];
}

/**
 * Budha-Aditya Yoga: Mercury and Sun in conjunction (same sign).
 * Effect: Intelligence, administrative ability.
 * Source: BPHS.
 */
function detectBudhaAdityaYoga(planets: PlanetPosition[]): YogaData[] {
  const sun = planets.find(p => p.id === 'Sun');
  const mercury = planets.find(p => p.id === 'Mercury');
  if (!sun || !mercury) return [notDetected('budha-aditya')];

  const detected = sun.signIndex === mercury.signIndex && !mercury.isCombust;
  const evidence: string[] = [];
  if (sun.signIndex === mercury.signIndex) {
    evidence.push(`Sun and Mercury conjunct in ${sun.sign}`);
    if (mercury.isCombust) {
      evidence.push('Mercury is combust — yoga partially cancelled');
    } else {
      evidence.push('Mercury is not combust — yoga intact');
    }
  }

  return [{
    id: 'budha-aditya',
    name: 'Budha-Aditya Yoga',
    detected,
    strength: detected ? (mercury.isExalted || mercury.isInOwnSign ? 'Strong' : 'Moderate') : null,
    evidence,
    reference: 'BPHS; B.V. Raman "Three Hundred Combinations" #45',
    category: 'Solar',
    description: 'Mercury conjunct the Sun (uncombust). Produces sharp intellect, administrative talent, skill in communication and strategy.',
  }];
}

/**
 * Chandra-Mangal Yoga: Moon and Mars in conjunction or mutual aspect.
 * Effect: Entrepreneurial drive, financial ambition.
 * Source: B.V. Raman "Three Hundred Combinations" #11.
 */
function detectChandraMangalYoga(planets: PlanetPosition[]): YogaData[] {
  const moon = planets.find(p => p.id === 'Moon');
  const mars = planets.find(p => p.id === 'Mars');
  if (!moon || !mars) return [notDetected('chandra-mangal')];

  const conjunction = moon.signIndex === mars.signIndex;
  const mutualAspect = Math.abs(moon.house - mars.house) === 6 ||
    Math.abs(moon.house - mars.house) === 0;

  const detected = conjunction || mutualAspect;
  const evidence: string[] = [];
  if (conjunction) evidence.push(`Moon and Mars conjunct in ${moon.sign} (H${moon.house})`);
  if (mutualAspect && !conjunction) evidence.push(`Moon (H${moon.house}) and Mars (H${mars.house}) in mutual aspect`);

  return [{
    id: 'chandra-mangal',
    name: 'Chandra-Mangal Yoga',
    detected,
    strength: detected ? (conjunction ? 'Strong' : 'Moderate') : null,
    evidence,
    reference: 'B.V. Raman "Three Hundred Combinations" #11',
    category: 'Lunar',
    description: 'Moon and Mars in conjunction or mutual aspect. Produces financial drive, entrepreneurial ambition, and courage. Can indicate emotional intensity.',
  }];
}

/**
 * Raja Yoga: Lords of Kendra and Trikona houses in conjunction, mutual
 * aspect, or exchange.
 *
 * Kendra lords: 1, 4, 7, 10
 * Trikona lords: 1, 5, 9
 *
 * Source: BPHS ch. 36 (Raja Yoga Adhyaya).
 */
function detectRajaYogas(
  planets: PlanetPosition[],
  houses: HouseData[],
  ascendantSignIndex: number,
): YogaData[] {
  const kendraHouses = [1, 4, 7, 10];
  const trikonaHouses = [1, 5, 9];

  const kendraLords = new Set<PlanetId>(
    kendraHouses.map(h => houses[h - 1]?.lord).filter(Boolean) as PlanetId[],
  );
  const trikonaLords = new Set<PlanetId>(
    trikonaHouses.map(h => houses[h - 1]?.lord).filter(Boolean) as PlanetId[],
  );

  // Find planets that are lords of both (natural intersection)
  const combinedLords = [...kendraLords].filter(l => trikonaLords.has(l));
  const rajaYogas: YogaData[] = [];

  // Check for conjunction or mutual connection between kendra and trikona lords
  for (const k of kendraLords) {
    if (combinedLords.includes(k)) continue; // Yogakaraka — handle separately
    for (const t of trikonaLords) {
      if (k === t) continue;
      const kPlanet = planets.find(p => p.id === k);
      const tPlanet = planets.find(p => p.id === t);
      if (!kPlanet || !tPlanet) continue;

      const inConjunction = kPlanet.signIndex === tPlanet.signIndex;
      const evidence: string[] = [];

      if (inConjunction) {
        evidence.push(`${k} (lord of Kendra) and ${t} (lord of Trikona) conjunct in ${kPlanet.sign}`);
        rajaYogas.push({
          id: `raja-${k}-${t}`,
          name: `Raja Yoga (${k} + ${t})`,
          detected: true,
          strength: 'Strong',
          evidence,
          reference: 'BPHS ch. 36; Parasari Raja Yoga definition',
          category: 'Raja',
          description: `${k}, lord of a Kendra house, and ${t}, lord of a Trikona house, are conjoined. This forms a powerful Raja Yoga indicating rise to authority, achievement, and recognition.`,
        });
      }
    }
  }

  // If no specific Raja Yogas found, add placeholder
  if (rajaYogas.length === 0) {
    rajaYogas.push(notDetectedWithInfo(
      'raja-yoga-general',
      'Raja Yoga',
      'Raja',
      'No classical Kendra-Trikona lord conjunction found in the birth chart.',
    ));
  }

  return rajaYogas;
}

/**
 * Neecha Bhanga Raja Yoga: Cancellation of debilitation.
 * A debilitated planet's effects are reversed when specific cancellation
 * conditions are met, often producing exceptional results.
 *
 * Cancellation conditions (any one):
 * 1. Lord of debilitation sign in Kendra from Lagna or Moon
 * 2. Exaltation lord in Kendra
 * 3. Debilitated planet in conjunction with its exaltation lord
 *
 * Source: BPHS ch. 36, v. 1-10; K.N. Rao.
 */
function detectNeechabhangaYoga(planets: PlanetPosition[]): YogaData[] {
  const debilitatedPlanets = planets.filter(p => p.isDebilitated);
  if (debilitatedPlanets.length === 0) return [notDetected('neecha-bhanga')];

  const yogas: YogaData[] = [];

  for (const planet of debilitatedPlanets) {
    const evidence: string[] = [];
    evidence.push(`${planet.id} is debilitated in ${planet.sign} (H${planet.house})`);

    // Check if exaltation sign lord is in Kendra
    const exaltSignIndex = EXALTATION_SIGN[planet.id];
    if (exaltSignIndex !== undefined) {
      const exaltLord = SIGN_LORDS[exaltSignIndex];
      const exaltLordPlanet = exaltLord ? planets.find(p => p.id === exaltLord) : undefined;
      if (exaltLordPlanet && [1, 4, 7, 10].includes(exaltLordPlanet.house)) {
        evidence.push(`Exaltation sign lord ${exaltLord} is in Kendra (H${exaltLordPlanet.house})`);
        yogas.push({
          id: `neecha-bhanga-${planet.id.toLowerCase()}`,
          name: `Neecha Bhanga Raja Yoga (${planet.id})`,
          detected: true,
          strength: 'Strong',
          evidence,
          reference: 'BPHS ch. 36; Hart deFouw "Light on Life" p. 134',
          category: 'Neecha Bhanga',
          description: `${planet.id} is debilitated but its debilitation is cancelled, producing exceptional potential in areas signified by ${planet.id} and its houses.`,
        });
      }
    }
  }

  if (yogas.length === 0) {
    yogas.push(notDetected('neecha-bhanga'));
  }

  return yogas;
}

/**
 * Parivartana Yoga (Exchange): Two planets each in each other's sign.
 * Effect: Mutual strengthening of both planets and their houses.
 */
function detectParivartan(planets: PlanetPosition[]): YogaData[] {
  const yogas: YogaData[] = [];
  const checked = new Set<string>();

  for (const p1 of planets) {
    for (const p2 of planets) {
      if (p1.id === p2.id) continue;
      const key = [p1.id, p2.id].sort().join('-');
      if (checked.has(key)) continue;
      checked.add(key);

      const p1LordsP2Sign = SIGN_LORDS[p2.signIndex] === p1.id;
      const p2LordsP1Sign = SIGN_LORDS[p1.signIndex] === p2.id;

      if (p1LordsP2Sign && p2LordsP1Sign) {
        yogas.push({
          id: `parivartana-${key}`,
          name: `Parivartana Yoga (${p1.id} ↔ ${p2.id})`,
          detected: true,
          strength: 'Strong',
          evidence: [
            `${p1.id} is in ${p1.sign} (ruled by ${p2.id})`,
            `${p2.id} is in ${p2.sign} (ruled by ${p1.id})`,
            `This creates a mutual exchange between H${p1.house} and H${p2.house}`,
          ],
          reference: 'BPHS; Parashari Parivartana Yoga definition',
          category: 'Parivartana',
          description: `${p1.id} and ${p2.id} occupy each other's signs, creating a powerful mutual exchange. The houses they rule become interconnected, intensifying results of both.`,
        });
      }
    }
  }

  return yogas;
}

/**
 * Adhibhava Yoga (superiority): Benefics in 6th, 8th, or 12th from each other.
 * Simplified detection for MVP.
 */
function detectAdhibhava(planets: PlanetPosition[], houses: HouseData[]): YogaData[] {
  // Find if benefic planets occupy the dusthana houses (6, 8, 12) of lords
  const beneficPlanets = planets.filter(p =>
    ['Moon', 'Mercury', 'Jupiter', 'Venus'].includes(p.id),
  );

  const inDusthana = beneficPlanets.filter(p => [6, 8, 12].includes(p.house));

  if (inDusthana.length === 0) return [];

  return [{
    id: 'adhi-yoga',
    name: 'Adhi Yoga',
    detected: true,
    strength: inDusthana.length >= 3 ? 'Strong' : 'Moderate',
    evidence: inDusthana.map(p => `${p.id} in H${p.house} (dusthana) — supports Adhi Yoga`),
    reference: 'BPHS ch. 35; B.V. Raman "Three Hundred Combinations" #116',
    category: 'Special',
    description: 'Natural benefics occupying specific positions relative to the Lagna, indicating authority, wealth, and respect.',
  }];
}

/**
 * Vipareeta Raja Yoga: Lords of dusthanas (6, 8, 12) in each other's signs
 * or in another dusthana. Produces success through adversity.
 */
function detectVipareeta(planets: PlanetPosition[], houses: HouseData[]): YogaData[] {
  const dusthanaHouses = [6, 8, 12];
  const dusthanaLords = dusthanaHouses.map(h => houses[h - 1]?.lord).filter(Boolean) as PlanetId[];

  const vipareeta = dusthanaLords.filter(lord => {
    const planet = planets.find(p => p.id === lord);
    if (!planet) return false;
    return dusthanaHouses.includes(planet.house);
  });

  if (vipareeta.length === 0) return [notDetected('vipareeta-raja')];

  return [{
    id: 'vipareeta-raja',
    name: 'Vipareeta Raja Yoga',
    detected: true,
    strength: vipareeta.length >= 2 ? 'Strong' : 'Moderate',
    evidence: vipareeta.map(lord => {
      const planet = planets.find(p => p.id === lord);
      return `${lord} (lord of a dusthana) placed in dusthana H${planet?.house}`;
    }),
    reference: 'BPHS ch. 36; Harsha, Sarala, Vimala Yoga sub-types',
    category: 'Raja',
    description: 'Lords of the 6th, 8th, or 12th houses placed in other dusthanas. Indicates the capacity to transform adversity, obstacles, or enemies into success.',
  }];
}

/**
 * Pancha Mahapurusha Yogas: Five great person yogas from exalted or own sign
 * planets in Kendras.
 */
function detectPanchaMahapurusha(planets: PlanetPosition[]): YogaData[] {
  const definitions = [
    { planet: 'Mars',    name: 'Ruchaka Yoga',  description: 'Mars in exaltation or own sign in a Kendra. Strong will, leadership, courage, physical vitality.' },
    { planet: 'Mercury', name: 'Bhadra Yoga',   description: 'Mercury in exaltation or own sign in a Kendra. Intelligence, eloquence, mathematical ability, business acumen.' },
    { planet: 'Jupiter', name: 'Hamsa Yoga',    description: 'Jupiter in exaltation or own sign in a Kendra. Wisdom, spiritual inclination, righteousness, teaching ability.' },
    { planet: 'Venus',   name: 'Malavya Yoga',  description: 'Venus in exaltation or own sign in a Kendra. Artistic talent, refinement, sensual pleasures, material wealth.' },
    { planet: 'Saturn',  name: 'Shasha Yoga',   description: 'Saturn in exaltation or own sign in a Kendra. Discipline, longevity, authority, success through sustained effort.' },
  ];

  const yogas: YogaData[] = [];

  for (const def of definitions) {
    const planet = planets.find(p => p.id === def.planet);
    if (!planet) continue;

    const inKendra = [1, 4, 7, 10].includes(planet.house);
    const strongDignity = planet.isExalted || planet.isInOwnSign || planet.isInMoolatrikona;
    const detected = inKendra && strongDignity;

    yogas.push({
      id: `pancha-${def.planet.toLowerCase()}`,
      name: def.name,
      detected,
      strength: detected ? (planet.isExalted ? 'Strong' : 'Moderate') : null,
      evidence: detected ? [
        `${def.planet} in ${planet.sign} (${planet.dignity}) in H${planet.house} (Kendra)`,
      ] : [
        `${def.planet} is in H${planet.house} with dignity ${planet.dignity} — conditions not fully met`,
      ],
      reference: 'BPHS ch. 75 (Pancha Mahapurusha Yoga); B.V. Raman "Three Hundred Combinations"',
      category: 'Pancha Mahapurusha',
      description: def.description,
    });
  }

  return yogas;
}

/**
 * Vasumati Yoga (Vasudhara): Benefics in Upachaya houses (3, 6, 10, 11) from Moon.
 */
function detectVasudhara(planets: PlanetPosition[], houses: HouseData[]): YogaData[] {
  const moon = planets.find(p => p.id === 'Moon');
  if (!moon) return [notDetected('vasumati')];

  const upachayaFromMoon = [3, 6, 10, 11].map(n => ((moon.house - 1 + n - 1) % 12) + 1);
  const benefics = planets.filter(p => ['Jupiter', 'Venus', 'Mercury'].includes(p.id));
  const beneficsInUpachaya = benefics.filter(p => upachayaFromMoon.includes(p.house));

  const detected = beneficsInUpachaya.length >= 2;

  return [{
    id: 'vasumati',
    name: 'Vasumati Yoga',
    detected,
    strength: detected ? (beneficsInUpachaya.length >= 3 ? 'Strong' : 'Moderate') : null,
    evidence: beneficsInUpachaya.map(p => `${p.id} in H${p.house} (Upachaya from Moon H${moon.house})`),
    reference: 'B.V. Raman "Three Hundred Combinations" #26; BPHS',
    category: 'Dhana',
    description: 'Benefic planets in Upachaya (growth) houses from the Moon. Indicates wealth accumulation, financial prosperity, and material success over time.',
  }];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notDetected(id: string): YogaData {
  return {
    id,
    name: id.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' ') + ' Yoga',
    detected: false,
    strength: null,
    evidence: [],
    reference: '',
    category: 'Special',
    description: '',
  };
}

function notDetectedWithInfo(id: string, name: string, category: YogaData['category'], note: string): YogaData {
  return {
    id,
    name,
    detected: false,
    strength: null,
    evidence: [note],
    reference: 'BPHS ch. 36',
    category,
    description: '',
  };
}
