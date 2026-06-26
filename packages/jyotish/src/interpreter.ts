/**
 * Jyotish Chart Interpreter
 *
 * Converts a CanonicalChart into pre-written, verified factual sentences.
 * The AI receives these facts as ground truth and only synthesizes + articulates.
 * It does not derive, calculate, or invent any chart relationships.
 *
 * Every output sentence is 100% deterministic — same chart always produces
 * identical facts. The AI's job is interpretation and prose, not computation.
 */

import type { CanonicalChart, PlanetPosition, PlanetId, PlanetDignity } from '@luckyray/shared';

// ─── House metadata ───────────────────────────────────────────────────────────

const HOUSE_THEME: Record<number, string> = {
  1:  'Lagna (self, body, vitality, personality, overall life)',
  2:  'Dhana (accumulated wealth, speech, family, food)',
  3:  'Parakrama (courage, siblings, communication, short travel, effort)',
  4:  'Sukha (home, mother, education, inner happiness, land/property)',
  5:  'Putra (children, creativity, intelligence, romance, speculation, past-life merit)',
  6:  'Shatru (enemies, disease, debt, litigation, service, daily work)',
  7:  'Kalatra (spouse, business partnerships, public life, foreign travel)',
  8:  'Randhra (longevity, transformation, inheritance, hidden matters, research)',
  9:  'Dharma (fortune, father, guru, higher philosophy, long travel, religion)',
  10: 'Karma (career, profession, authority, status, public reputation, father)',
  11: 'Labha (income, gains, elder siblings, social networks, fulfillment of desires)',
  12: 'Vyaya (expenses, losses, foreign lands, isolation, liberation, bed pleasures)',
};

type HouseNature = 'trikona' | 'kendra' | 'upachaya' | 'dusthana' | 'maraka' | 'neutral';

const HOUSE_NATURE: Record<number, HouseNature[]> = {
  1:  ['trikona', 'kendra'],
  2:  ['maraka', 'neutral'],
  3:  ['upachaya'],
  4:  ['kendra'],
  5:  ['trikona'],
  6:  ['dusthana', 'upachaya'],
  7:  ['kendra', 'maraka'],
  8:  ['dusthana'],
  9:  ['trikona'],
  10: ['kendra'],
  11: ['upachaya'],
  12: ['dusthana'],
};

// ─── Dignity labels ───────────────────────────────────────────────────────────

const DIGNITY_LABEL: Record<PlanetDignity, { short: string; strength: string; note: string }> = {
  Exalted:      { short: 'EXALTED',              strength: 'maximum strength',           note: 'Planet at its peak — strongest possible placement.' },
  Moolatrikona: { short: 'MOOLATRIKONA (own)',   strength: 'very strong',                note: 'Own sign (primary zone) — very strong placement.' },
  OwnSign:      { short: 'OWN SIGN',             strength: 'strong',                     note: 'In its own sign — strong placement, full self-expression.' },
  FriendlySign: { short: 'friendly sign',        strength: 'moderately strong',          note: 'In a friendly sign — supportive, comfortable placement.' },
  NeutralSign:  { short: 'neutral sign',         strength: 'average',                    note: 'In a neutral sign — neither strengthened nor weakened.' },
  EnemySign:    { short: 'enemy sign',           strength: 'weakened',                   note: 'In an enemy sign — planet struggles to express its nature fully.' },
  Debilitated:  { short: 'DEBILITATED',          strength: 'minimum strength (very weak)', note: 'Planet at its weakest — significations are challenged or unreliable.' },
};

// ─── Aspect type labels ───────────────────────────────────────────────────────

function aspectLabel(planet: PlanetId, aspectTypeNumber: number): string {
  // aspectType in AspectData = house counted from source (7 = 7th aspect / opposition)
  const map: Record<number, string> = {
    3:  'Saturn 3rd special aspect',
    4:  'Mars 4th special aspect',
    5:  'Jupiter/Rahu/Ketu 5th special aspect',
    7:  '7th aspect (all planets)',
    8:  'Mars 8th special aspect',
    9:  'Jupiter/Rahu/Ketu 9th special aspect',
    10: 'Saturn 10th special aspect',
  };
  return map[aspectTypeNumber] ?? `${aspectTypeNumber}th aspect`;
}

// ─── Functional nature ────────────────────────────────────────────────────────

function functionalNature(housesRuled: number[]): string {
  const isTrikona = (h: number) => [1, 5, 9].includes(h);
  const isKendra  = (h: number) => [4, 7, 10].includes(h);
  const isDust    = (h: number) => [6, 8, 12].includes(h);
  const isUpach   = (h: number) => [3, 11].includes(h);

  const ownTrikona  = housesRuled.some(isTrikona);
  const ownKendra   = housesRuled.some(isKendra);
  const ownDust     = housesRuled.some(isDust);
  const ownUpach    = housesRuled.some(isUpach);
  const ownsLagna   = housesRuled.includes(1);

  const rulesStr = housesRuled.map(h => `H${h}`).join(' + ');

  if (ownTrikona && ownKendra)  return `YOGA KARAKA — rules both trikona (${rulesStr}) and kendra: highly auspicious planet for this chart`;
  if (ownsLagna)                return `strong functional benefic — lagna lord rules H1 (trikona): naturally favors health and self`;
  if (ownTrikona && ownDust)    return `mixed — rules trikona (${rulesStr}) and dusthana: trikona lordship partially redeems dusthana rulership`;
  if (ownTrikona)               return `functional benefic — rules trikona house(s): ${rulesStr}`;
  if (ownKendra && !ownDust)    return `moderate benefic — rules kendra house(s): ${rulesStr}`;
  if (ownDust && !ownTrikona)   return `functional malefic — rules dusthana house(s): ${rulesStr}`;
  if (ownUpach && !ownTrikona)  return `mild malefic — rules upachaya (3/11): ${rulesStr}`;
  return `neutral — rules: ${rulesStr}`;
}

// ─── Main interpreter ─────────────────────────────────────────────────────────

/**
 * Produce a complete set of pre-written factual sentences from the canonical chart.
 * Call this once and pass the result to the AI instead of raw chart tables.
 */
export function serializeChartInterpretation(chart: CanonicalChart): string {
  const lines: string[] = [];

  // Build a map: planet → houses it rules
  const rulesMap: Record<string, number[]> = {};
  for (const house of chart.houses) {
    if (!rulesMap[house.lord]) rulesMap[house.lord] = [];
    rulesMap[house.lord]!.push(house.number);
  }

  // Build a map: house number → HouseData
  const houseMap = new Map(chart.houses.map(h => [h.number, h]));

  // Build a map: planet id → PlanetPosition
  const planetMap = new Map(chart.planets.map(p => [p.id, p]));

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push(`╔═══════════════════════════════════════════════════════════╗`);
  lines.push(`  VERIFIED JYOTISH FACTS — ${chart.profile.name.toUpperCase()}`);
  lines.push(`  Computed deterministically. Use as ground truth.`);
  lines.push(`  Do NOT derive additional facts from raw chart data.`);
  lines.push(`  Do NOT state any aspect not listed in the ASPECTS section.`);
  lines.push(`  Planets sharing a house are CONJUNCT — not aspecting each other.`);
  lines.push(`╚═══════════════════════════════════════════════════════════╝`);
  lines.push('');

  // ── Birth Details ─────────────────────────────────────────────────────────
  lines.push('── BIRTH DETAILS ──────────────────────────────────────────');
  lines.push(`Name   : ${chart.profile.name}${chart.profile.gender ? ` (${chart.profile.gender})` : ''}`);
  lines.push(`Date   : ${chart.birthDetails.date}`);
  lines.push(`Time   : ${chart.birthDetails.time}`);
  lines.push(`Place  : ${chart.birthDetails.place}`);
  lines.push(`Coords : ${chart.birthDetails.latitude}°N, ${chart.birthDetails.longitude}°E`);
  lines.push(`TZ     : ${chart.birthDetails.timezone}`);
  lines.push('');

  // ── Lagna ────────────────────────────────────────────────────────────────
  const lagnaLordId = chart.houses[0]?.lord;
  const lagnaLord = lagnaLordId ? planetMap.get(lagnaLordId) : undefined;
  const lagnaLordDignity = lagnaLord ? DIGNITY_LABEL[lagnaLord.dignity] : undefined;

  lines.push('── LAGNA (ASCENDANT) ───────────────────────────────────────');
  lines.push(`Lagna sign : ${chart.ascendant.sign} at ${chart.ascendant.degree}°${chart.ascendant.minute}'`);
  lines.push(`Nakshatra  : ${chart.ascendant.nakshatra}, Pada ${chart.ascendant.pada}`);
  lines.push(`Lagna lord : ${lagnaLordId}`);
  if (lagnaLord && lagnaLordDignity) {
    lines.push(`Lagna lord placement: ${lagnaLordId} is in H${lagnaLord.house} (${lagnaLord.sign}), ${lagnaLordDignity.short} — ${lagnaLordDignity.strength}`);
    const lagnaLordHouseNatures = HOUSE_NATURE[lagnaLord.house] ?? [];
    const inDusthana = lagnaLordHouseNatures.includes('dusthana');
    const inKendra = lagnaLordHouseNatures.includes('kendra');
    const inTrikona = lagnaLordHouseNatures.includes('trikona');
    if (inDusthana) {
      lines.push(`⚠ Lagna lord in dusthana (H${lagnaLord.house}) — challenging for health and vitality; native must work harder to maintain physical wellbeing`);
    } else if (inKendra || inTrikona) {
      lines.push(`✓ Lagna lord in kendra/trikona (H${lagnaLord.house}) — favorable for overall life strength and personality`);
    }
  }
  lines.push('');

  // ── Planet Placements ────────────────────────────────────────────────────
  lines.push('── ALL PLANET PLACEMENTS ───────────────────────────────────');
  lines.push('Each entry states: placement, dignity, houses ruled, functional nature, and special conditions.');
  lines.push('');

  for (const planet of chart.planets) {
    const dign = DIGNITY_LABEL[planet.dignity];
    const housesRuled = rulesMap[planet.id] ?? [];
    const houseData = houseMap.get(planet.house);
    const houseTheme = HOUSE_THEME[planet.house] ?? '';
    const funcNature = functionalNature(housesRuled);
    const natureLbl = planet.naturalBenefic ? 'natural benefic' : planet.naturalMalefic ? 'natural malefic' : 'natural neutral';

    const flags: string[] = [];
    if (planet.isRetrograde) flags.push('RETROGRADE');
    if (planet.isCombust) flags.push('COMBUST (within 8° of Sun — weakened)');
    const flagStr = flags.length > 0 ? `  [${flags.join(' | ')}]` : '';

    lines.push(`${planet.name}:`);
    lines.push(`  Position : ${planet.sign}, H${planet.house}, ${planet.degreesInSign.toFixed(1)}° | ${planet.nakshatra} Pada ${planet.pada}${flagStr}`);
    lines.push(`  Dignity  : ${dign.short} — ${dign.strength}. ${dign.note}`);
    lines.push(`  House H${planet.house} theme: ${houseTheme}`);

    if (housesRuled.length > 0) {
      const ruledStr = housesRuled.map(h => `H${h} (${houseMap.get(h)?.sign ?? '?'})`).join(', ');
      lines.push(`  Rules    : ${ruledStr}`);
    }
    lines.push(`  Nature   : ${natureLbl} | Functional: ${funcNature}`);

    // Dispositor (lord of the sign the planet is in)
    const dispositorId = houseData?.lord;
    if (dispositorId && dispositorId !== planet.id) {
      const dispositor = planetMap.get(dispositorId);
      if (dispositor) {
        const dispDign = DIGNITY_LABEL[dispositor.dignity];
        lines.push(`  Dispositor: ${dispositorId} (lord of ${planet.sign}) is in H${dispositor.house} — ${dispDign.short} — ${dispDign.strength}`);
      }
    } else if (dispositorId === planet.id) {
      lines.push(`  Dispositor: self (planet is in its own sign — no external dispositor)`);
    }

    // Conjunction note
    const conjGroup = chart.conjunctions.find(c => c.planets.includes(planet.id) && c.planets.length > 1);
    if (conjGroup) {
      const others = conjGroup.planets.filter(p => p !== planet.id);
      lines.push(`  Conjunction: ${planet.name} is CONJUNCT with ${others.join(' + ')} in H${conjGroup.house} (${conjGroup.sign})`);
    }

    lines.push('');
  }

  // ── Conjunctions ─────────────────────────────────────────────────────────
  lines.push('── CONJUNCTIONS ────────────────────────────────────────────');
  lines.push('Planets in the same house CONJOIN each other — this is NOT an aspect relationship.');
  lines.push('');

  const realConjunctions = chart.conjunctions.filter(c => c.planets.length > 1);
  if (realConjunctions.length === 0) {
    lines.push('No conjunctions in this chart — no house contains more than one planet.');
  } else {
    for (const conj of realConjunctions) {
      const houseTheme = HOUSE_THEME[conj.house] ?? '';
      lines.push(`H${conj.house} (${conj.sign}) — ${conj.planets.join(' + ')} are CONJUNCT`);
      lines.push(`  House theme: ${houseTheme}`);
      for (const pid of conj.planets) {
        const p = planetMap.get(pid);
        if (p) {
          lines.push(`  ${pid}: ${DIGNITY_LABEL[p.dignity].short} — ${DIGNITY_LABEL[p.dignity].strength}`);
        }
      }
      lines.push(`  Combined effect: these planets mutually influence each other's significations in H${conj.house}.`);
      lines.push('');
    }
  }

  // ── Aspects Cast ─────────────────────────────────────────────────────────
  lines.push('── ASPECTS (DRISHTI) — DEFINITIVE LIST ─────────────────────');
  lines.push('ONLY these aspects exist in this chart. Do not add or invent any others.');
  lines.push('');

  // Group by source planet for readability
  const aspectsBySource = new Map<string, typeof chart.aspects>();
  for (const aspect of chart.aspects) {
    const group = aspectsBySource.get(aspect.sourcePlanet) ?? [];
    group.push(aspect);
    aspectsBySource.set(aspect.sourcePlanet, group);
  }

  if (chart.aspects.length === 0) {
    lines.push('(No aspects computed — check chart data)');
  } else {
    for (const planet of chart.planets) {
      const planetAspects = aspectsBySource.get(planet.id);
      if (!planetAspects || planetAspects.length === 0) continue;

      lines.push(`${planet.name} (H${planet.house}, ${planet.sign}) casts:`);
      for (const asp of planetAspects) {
        const targetHouseData = houseMap.get(asp.targetHouse);
        const occupants = asp.targetPlanets.length > 0
          ? `occupied by: ${asp.targetPlanets.join(' + ')}`
          : 'house is empty';
        const lbl = aspectLabel(planet.id, asp.aspectType);
        const special = asp.isSpecial ? '★ special' : 'standard';
        lines.push(`  → H${asp.targetHouse} (${targetHouseData?.sign ?? '?'}) [${occupants}]`);
        lines.push(`    Type: ${lbl} | ${special} | strength: ${asp.strength}`);
        lines.push(`    House theme: ${HOUSE_THEME[asp.targetHouse] ?? ''}`);
      }
      lines.push('');
    }
  }

  // ── Aspects Received ─────────────────────────────────────────────────────
  lines.push('── ASPECTS RECEIVED BY EACH HOUSE ──────────────────────────');
  lines.push('');

  const aspectsReceivedByHouse = new Map<number, Array<{ planet: PlanetId; type: string; isSpecial: boolean; strength: string }>>();
  for (const asp of chart.aspects) {
    const list = aspectsReceivedByHouse.get(asp.targetHouse) ?? [];
    list.push({ planet: asp.sourcePlanet, type: aspectLabel(asp.sourcePlanet, asp.aspectType), isSpecial: asp.isSpecial, strength: asp.strength });
    aspectsReceivedByHouse.set(asp.targetHouse, list);
  }

  for (let h = 1; h <= 12; h++) {
    const houseData = houseMap.get(h);
    if (!houseData) continue;
    const occ = houseData.occupants.length > 0 ? houseData.occupants.join(' + ') : 'empty';
    const received = aspectsReceivedByHouse.get(h) ?? [];

    if (received.length === 0) {
      lines.push(`H${h} (${houseData.sign}) [${occ}]: receives NO external aspects`);
    } else {
      const aspStr = received.map(a => `${a.planet} via ${a.type}${a.isSpecial ? ' ★' : ''}`).join('; ');
      lines.push(`H${h} (${houseData.sign}) [${occ}]: receives aspects from → ${aspStr}`);
    }
  }
  lines.push('');

  // ── House Lord Placements ────────────────────────────────────────────────
  lines.push('── HOUSE LORD PLACEMENTS ───────────────────────────────────');
  lines.push('Where is each house\'s lord placed? This shows how each life domain is activated.');
  lines.push('');

  for (let h = 1; h <= 12; h++) {
    const houseData = houseMap.get(h);
    if (!houseData) continue;
    const lord = planetMap.get(houseData.lord);
    if (!lord) continue;

    const dign = DIGNITY_LABEL[lord.dignity];
    const lordInHouseNatures = HOUSE_NATURE[lord.house] ?? [];
    let placementQuality = '';
    if (lordInHouseNatures.includes('trikona') || lordInHouseNatures.includes('kendra')) {
      placementQuality = '→ favorable placement (lord in kendra/trikona)';
    } else if (lordInHouseNatures.includes('dusthana')) {
      placementQuality = '→ challenging placement (lord in dusthana: weakens this house)';
    } else {
      placementQuality = '→ neutral placement';
    }

    const retroStr = lord.isRetrograde ? ' [RETROGRADE]' : '';
    lines.push(`H${h} lord (${houseData.lord}) is in H${lord.house} (${lord.sign}, ${dign.short} — ${dign.strength})${retroStr} ${placementQuality}`);
  }
  lines.push('');

  // ── All House Summaries ──────────────────────────────────────────────────
  lines.push('── ALL HOUSES — OCCUPANTS AND CONDITION ────────────────────');
  lines.push('');
  for (const house of chart.houses) {
    const occ = house.occupants.length > 0 ? house.occupants.join(' + ') : '(empty)';
    lines.push(`H${house.number} | ${house.sign} | Lord: ${house.lord} | Occupants: ${occ}`);
    lines.push(`  Theme: ${HOUSE_THEME[house.number] ?? ''}`);
  }
  lines.push('');

  // ── Active Yogas ─────────────────────────────────────────────────────────
  const activeYogas = chart.yogas.filter(y => y.detected);
  if (activeYogas.length > 0) {
    lines.push('── ACTIVE YOGAS ────────────────────────────────────────────');
    for (const yoga of activeYogas) {
      lines.push(`${yoga.name}${yoga.strength ? ` — ${yoga.strength} strength` : ''}`);
      if (yoga.evidence.length > 0) {
        lines.push(`  Evidence: ${yoga.evidence.join('; ')}`);
      }
    }
    lines.push('');
  }

  // ── Active Doshas ─────────────────────────────────────────────────────────
  const activeDoshas = chart.doshas.filter(d => d.detected);
  if (activeDoshas.length > 0) {
    lines.push('── ACTIVE DOSHAS ────────────────────────────────────────────');
    for (const dosha of activeDoshas) {
      lines.push(`${dosha.name}${dosha.severity ? ` — ${dosha.severity} severity` : ''}`);
    }
    lines.push('');
  }

  // ── Current Dasha ─────────────────────────────────────────────────────────
  const dasha = chart.dashas;
  lines.push('── CURRENT VIMSHOTTARI DASHA ───────────────────────────────');

  const mahaPlanet = planetMap.get(dasha.currentMahadasha.planet);
  const mahaRuled = rulesMap[dasha.currentMahadasha.planet] ?? [];
  lines.push(`Mahadasha : ${dasha.currentMahadasha.planet} (until ${dasha.currentMahadasha.endDate.slice(0, 10)})`);
  if (mahaPlanet) {
    lines.push(`  ${dasha.currentMahadasha.planet} is in H${mahaPlanet.house} (${mahaPlanet.sign}), ${DIGNITY_LABEL[mahaPlanet.dignity].short}`);
    lines.push(`  ${dasha.currentMahadasha.planet} rules: ${mahaRuled.map(h => `H${h}`).join(', ')}`);
    lines.push(`  Functional nature for this chart: ${functionalNature(mahaRuled)}`);
  }

  if (dasha.currentAntardasha) {
    const antarPlanet = planetMap.get(dasha.currentAntardasha.planet);
    const antarRuled = rulesMap[dasha.currentAntardasha.planet] ?? [];
    lines.push(`Antardasha: ${dasha.currentAntardasha.planet} (until ${dasha.currentAntardasha.endDate.slice(0, 10)})`);
    if (antarPlanet) {
      lines.push(`  ${dasha.currentAntardasha.planet} is in H${antarPlanet.house} (${antarPlanet.sign}), ${DIGNITY_LABEL[antarPlanet.dignity].short}`);
      lines.push(`  ${dasha.currentAntardasha.planet} rules: ${antarRuled.map(h => `H${h}`).join(', ')}`);
      lines.push(`  Functional nature for this chart: ${functionalNature(antarRuled)}`);
    }
  }

  if (dasha.currentPratyantar) {
    const pratPlanet = planetMap.get(dasha.currentPratyantar.planet);
    const pratRuled = rulesMap[dasha.currentPratyantar.planet] ?? [];
    lines.push(`Pratyantar: ${dasha.currentPratyantar.planet} (until ${dasha.currentPratyantar.endDate.slice(0, 10)})`);
    if (pratPlanet) {
      lines.push(`  ${dasha.currentPratyantar.planet} is in H${pratPlanet.house} (${pratPlanet.sign}), ${DIGNITY_LABEL[pratPlanet.dignity].short}`);
      lines.push(`  ${dasha.currentPratyantar.planet} rules: ${pratRuled.map(h => `H${h}`).join(', ')}`);
      lines.push(`  Functional nature for this chart: ${functionalNature(pratRuled)}`);
    }
  }
  lines.push('');

  lines.push('── END OF VERIFIED FACTS ────────────────────────────────────');
  lines.push('All analysis must stay within the bounds of the facts above.');
  lines.push('');

  return lines.join('\n');
}
