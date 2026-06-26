/**
 * AI Context Builder
 *
 * Transforms the canonical chart into an optimized context for the AI.
 * Includes Mahadasha, Antardasha, and Pratyantar Dasha levels, plus
 * current Gochar (transits) for precise timing analysis.
 *
 * The context builder NEVER modifies chart data — it only selects and formats it.
 */

import type { CanonicalChart, ChartContext, AIMessage, PlanetId, GocharPlanet } from '@luckyray/shared';

export type QuestionTopic =
  | 'career'
  | 'relationship'
  | 'health'
  | 'finance'
  | 'education'
  | 'children'
  | 'spirituality'
  | 'personality'
  | 'dasha'
  | 'general'
  | 'learning';

export function detectQuestionTopic(question: string): QuestionTopic {
  const q = question.toLowerCase();

  if (/career|job|work|profession|business|office|employ|occupation/.test(q)) return 'career';
  if (/marriage|spouse|partner|relation|love|romance|wedding|husband|wife|companion/.test(q)) return 'relationship';
  if (/health|illness|disease|body|medical|doctor|heal|energy|vitality/.test(q)) return 'health';
  if (/money|finance|wealth|income|investment|savings|profit|loss|debt|property/.test(q)) return 'finance';
  if (/educat|study|learn|school|college|university|degree|knowledge|academic/.test(q)) return 'education';
  if (/child|son|daughter|kid|parent|baby|birth|family/.test(q)) return 'children';
  if (/spiritual|karma|dharma|moksha|meditation|god|religion|temple|pilgrimage/.test(q)) return 'spirituality';
  if (/personalit|character|nature|behavio|who am i|strength|weakness|talent/.test(q)) return 'personality';
  if (/dasha|mahadasha|antardasha|pratyantar|period|current phase|planetary period/.test(q)) return 'dasha';
  if (/what is|explain|mean|define|how does|what are|teach/.test(q)) return 'learning';
  return 'general';
}

function getRelevantHouses(topic: QuestionTopic): number[] {
  const TOPIC_HOUSES: Record<QuestionTopic, number[]> = {
    career:       [1, 2, 6, 10, 11],
    relationship: [1, 2, 5, 7, 8, 11],
    health:       [1, 6, 8, 12],
    finance:      [1, 2, 5, 8, 9, 11],
    education:    [1, 4, 5, 9],
    children:     [1, 5, 9],
    spirituality: [1, 8, 9, 12],
    personality:  [1, 5, 9],
    dasha:        [1, 2, 4, 6, 7, 10, 11],
    learning:     [1, 5, 9],
    general:      [1, 2, 4, 6, 7, 10, 11],
  };
  return TOPIC_HOUSES[topic] ?? [1, 4, 7, 10];
}

function getRelevantPlanets(topic: QuestionTopic): PlanetId[] {
  const TOPIC_PLANETS: Record<QuestionTopic, PlanetId[]> = {
    career:       ['Sun', 'Saturn', 'Mercury', 'Mars', 'Jupiter'],
    relationship: ['Venus', 'Moon', 'Mars', 'Jupiter', 'Rahu'],
    health:       ['Sun', 'Moon', 'Mars', 'Saturn', 'Rahu', 'Ketu'],
    finance:      ['Jupiter', 'Venus', 'Mercury', 'Moon', 'Saturn'],
    education:    ['Mercury', 'Jupiter', 'Moon', 'Saturn'],
    children:     ['Jupiter', 'Moon', 'Sun', 'Venus'],
    spirituality: ['Jupiter', 'Ketu', 'Saturn', 'Moon'],
    personality:  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter'],
    dasha:        ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'],
    learning:     ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'],
    general:      ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'],
  };
  return TOPIC_PLANETS[topic] ?? ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
}

/**
 * Build upcoming dasha periods for the next ~3 years.
 */
function buildUpcomingPeriods(chart: CanonicalChart): ChartContext['dashas']['upcomingPeriods'] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 3 * 365.25 * 86400000); // 3 years ahead
  const upcoming: NonNullable<ChartContext['dashas']['upcomingPeriods']> = [];

  for (const maha of chart.dashas.allPeriods) {
    const mahaStart = new Date(maha.startDate);
    const mahaEnd = new Date(maha.endDate);

    // Only include future or ongoing mahadashas within cutoff
    if (mahaEnd <= now) continue;
    if (mahaStart > cutoff) break;

    if (mahaStart > now) {
      upcoming.push({
        level: 'Mahadasha',
        planet: maha.planet,
        startsAt: maha.startDate,
        endsAt: maha.endDate,
      });
    }

    // Include upcoming antardashas within this mahadasha
    for (const anti of maha.antardasha ?? []) {
      const antiStart = new Date(anti.startDate);
      const antiEnd = new Date(anti.endDate);
      if (antiEnd <= now) continue;
      if (antiStart > cutoff) break;

      if (antiStart > now) {
        upcoming.push({
          level: 'Antardasha',
          planet: anti.planet,
          startsAt: anti.startDate,
          endsAt: anti.endDate,
        });
      }
    }
  }

  return upcoming.slice(0, 12); // Cap to avoid token bloat
}

/**
 * Build optimized chart context for the AI.
 */
export function buildChartContext(
  chart: CanonicalChart,
  question: string,
  gochar?: GocharPlanet[],
): ChartContext {
  const topic = detectQuestionTopic(question);
  const relevantPlanetIds = getRelevantPlanets(topic);
  const relevantHouseNumbers = getRelevantHouses(topic);

  // Always include ascendant lord
  const ascLord = chart.houses[0]?.lord;
  if (ascLord && !relevantPlanetIds.includes(ascLord)) {
    relevantPlanetIds.push(ascLord);
  }

  // For dasha questions, include all planets
  const planets = chart.planets
    .filter(p => topic === 'dasha' || topic === 'general' || relevantPlanetIds.includes(p.id))
    .map(p => ({
      id: p.id,
      name: p.name,
      sign: p.sign,
      house: p.house,
      degreesInSign: p.degreesInSign,
      nakshatra: p.nakshatra,
      pada: p.pada,
      isRetrograde: p.isRetrograde,
      isCombust: p.isCombust,
      dignity: p.dignity,
    }));

  const houses = chart.houses
    .filter(h => topic === 'dasha' || topic === 'general' || relevantHouseNumbers.includes(h.number))
    .map(h => ({
      number: h.number,
      sign: h.sign,
      lord: h.lord,
      occupants: h.occupants,
    }));

  const currentDasha = chart.dashas.currentMahadasha;
  const currentAntardasha = chart.dashas.currentAntardasha;
  const currentPratyantar = chart.dashas.currentPratyantar;

  const upcomingPeriods = buildUpcomingPeriods(chart);

  return {
    profile: {
      name: chart.profile.name,
      gender: chart.profile.gender,
    },
    birthDetails: chart.birthDetails,
    ascendant: chart.ascendant,
    planets,
    houses,
    dashas: {
      current: {
        planet: currentDasha.planet,
        endsAt: currentDasha.endDate,
      },
      antardasha: currentAntardasha ? {
        planet: currentAntardasha.planet,
        endsAt: currentAntardasha.endDate,
      } : null,
      pratyantar: currentPratyantar ? {
        planet: currentPratyantar.planet,
        endsAt: currentPratyantar.endDate,
      } : null,
      upcomingPeriods,
    },
    yogas: chart.yogas
      .filter(y => y.detected)
      .map(y => ({ name: y.name, detected: y.detected, strength: y.strength })),
    doshas: chart.doshas
      .filter(d => d.detected)
      .map(d => ({ name: d.name, detected: d.detected, severity: d.severity })),
    aspects: chart.aspects
      .filter(a => relevantPlanetIds.includes(a.sourcePlanet))
      .slice(0, 20)
      .map(a => ({
        sourcePlanet: a.sourcePlanet,
        targetHouse: a.targetHouse,
        targetPlanets: a.targetPlanets,
        strength: a.strength,
      })),
    gochar: gochar?.map(g => ({
      id: g.id,
      sign: g.sign,
      natalHouse: g.natalHouse,
      isRetrograde: g.isRetrograde,
      nakshatra: g.nakshatra,
    })),
  };
}

/**
 * Serialize ChartContext to a compact, readable string for the prompt.
 */
export function serializeChartContext(context: ChartContext): string {
  const lines: string[] = [];

  lines.push(`## Chart for ${context.profile.name}`);
  if (context.profile.gender) lines.push(`Gender: ${context.profile.gender}`);
  lines.push(`Birth: ${context.birthDetails.date} ${context.birthDetails.time} at ${context.birthDetails.place}`);
  lines.push(`Coordinates: ${context.birthDetails.latitude}°, ${context.birthDetails.longitude}°`);
  lines.push(`Timezone: ${context.birthDetails.timezone}`);
  lines.push('');

  lines.push('## Ascendant (Lagna)');
  lines.push(`${context.ascendant.sign} ${context.ascendant.degree}°${context.ascendant.minute}' | Nakshatra: ${context.ascendant.nakshatra} Pada ${context.ascendant.pada}`);
  lines.push('');

  lines.push('## Planetary Positions (Natal)');
  for (const p of context.planets) {
    const flags = [
      p.isRetrograde ? '℞' : '',
      p.isCombust ? 'combust' : '',
      p.dignity,
    ].filter(Boolean).join(', ');
    lines.push(`${p.name}: ${p.sign} H${p.house} ${p.degreesInSign.toFixed(1)}° | Nak: ${p.nakshatra} P${p.pada}${flags ? ' | ' + flags : ''}`);
  }
  lines.push('');

  lines.push('## Houses');
  for (const h of context.houses) {
    const occupants = h.occupants.length > 0 ? h.occupants.join(', ') : 'empty';
    lines.push(`H${h.number} ${h.sign}: Lord=${h.lord}, Occupants=${occupants}`);
  }
  lines.push('');

  lines.push('## Current Dasha Period');
  lines.push(`Mahadasha: ${context.dashas.current.planet} (until ${formatDate(context.dashas.current.endsAt)})`);
  if (context.dashas.antardasha) {
    lines.push(`Antardasha: ${context.dashas.antardasha.planet} (until ${formatDate(context.dashas.antardasha.endsAt)})`);
  }
  if (context.dashas.pratyantar) {
    lines.push(`Pratyantar: ${context.dashas.pratyantar.planet} (until ${formatDate(context.dashas.pratyantar.endsAt)})`);
  }
  lines.push('');

  if (context.dashas.upcomingPeriods && context.dashas.upcomingPeriods.length > 0) {
    lines.push('## Upcoming Dasha Periods (next 3 years)');
    for (const p of context.dashas.upcomingPeriods) {
      lines.push(`${p.level}: ${p.planet} (${formatDate(p.startsAt)} — ${formatDate(p.endsAt)})`);
    }
    lines.push('');
  }

  if (context.gochar && context.gochar.length > 0) {
    lines.push('## Current Gochar (Transits)');
    for (const g of context.gochar) {
      const retro = g.isRetrograde ? ' ℞' : '';
      lines.push(`${g.id}${retro}: ${g.sign} (${g.nakshatra}) → Natal H${g.natalHouse}`);
    }
    lines.push('');
  }

  if (context.yogas.length > 0) {
    lines.push('## Active Yogas');
    for (const y of context.yogas) {
      lines.push(`${y.name}${y.strength ? ` (${y.strength})` : ''}`);
    }
    lines.push('');
  }

  if (context.doshas.length > 0) {
    lines.push('## Detected Doshas');
    for (const d of context.doshas) {
      lines.push(`${d.name}${d.severity ? ` (${d.severity} severity)` : ''}`);
    }
    lines.push('');
  }

  if (context.aspects.length > 0) {
    lines.push('## Key Aspects (Drishti)');
    for (const a of context.aspects) {
      const targets = a.targetPlanets.length > 0 ? ` aspecting ${a.targetPlanets.join(', ')}` : '';
      lines.push(`${a.sourcePlanet} → H${a.targetHouse}${targets} (${a.strength})`);
    }
  }

  return lines.join('\n');
}

/**
 * Build the complete prompt messages array for the AI request.
 */
export function buildPromptMessages(params: {
  systemPrompt: string;
  rulesPrompt: string;
  chartContext: ChartContext;
  conversationHistory: AIMessage[];
  question: string;
}): AIMessage[] {
  const { systemPrompt, rulesPrompt, chartContext, conversationHistory, question } = params;

  const chartText = serializeChartContext(chartContext);

  const messages: AIMessage[] = [
    { role: 'system', content: `${systemPrompt}\n\n${rulesPrompt}\n\n${chartText}` },
    ...conversationHistory.slice(-10),
    { role: 'user', content: question },
  ];

  return messages;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
