/**
 * AI Context Builder
 *
 * Converts a CanonicalChart into AI-ready context using the deterministic
 * Jyotish interpreter. The AI receives pre-written factual sentences —
 * not raw chart tables — so it synthesizes and articulates, not derives.
 *
 * This eliminates hallucinations about aspects, conjunctions, dignity,
 * and house occupancy — those facts are computed in code, not by the LLM.
 */

import type { CanonicalChart, ChartContext, AIMessage, GocharPlanet, PlanetId } from '@luckyray/shared';

export type QuestionTopic =
  | 'career' | 'relationship' | 'health' | 'finance'
  | 'education' | 'children' | 'spirituality' | 'personality'
  | 'dasha' | 'general' | 'learning';

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

/**
 * Build upcoming dasha periods for the next ~3 years.
 */
function buildUpcomingPeriods(chart: CanonicalChart): ChartContext['dashas']['upcomingPeriods'] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 3 * 365.25 * 86400000);
  const upcoming: NonNullable<ChartContext['dashas']['upcomingPeriods']> = [];

  for (const maha of chart.dashas.allPeriods) {
    const mahaEnd = new Date(maha.endDate);
    const mahaStart = new Date(maha.startDate);
    if (mahaEnd <= now) continue;
    if (mahaStart > cutoff) break;
    if (mahaStart > now) {
      upcoming.push({ level: 'Mahadasha', planet: maha.planet, startsAt: maha.startDate, endsAt: maha.endDate });
    }
    for (const anti of maha.antardasha ?? []) {
      const antiStart = new Date(anti.startDate);
      const antiEnd = new Date(anti.endDate);
      if (antiEnd <= now) continue;
      if (antiStart > cutoff) break;
      if (antiStart > now) {
        upcoming.push({ level: 'Antardasha', planet: anti.planet, startsAt: anti.startDate, endsAt: anti.endDate });
      }
    }
  }
  return upcoming.slice(0, 12);
}

/**
 * Build a ChartContext object (still needed for typed consumers).
 * The serialized form now comes from serializeChartContext which
 * delegates to the deterministic interpreter.
 */
export function buildChartContext(
  chart: CanonicalChart,
  question: string,
  gochar?: GocharPlanet[],
): ChartContext {
  const currentDasha = chart.dashas.currentMahadasha;
  const currentAntardasha = chart.dashas.currentAntardasha;
  const currentPratyantar = chart.dashas.currentPratyantar;
  const upcomingPeriods = buildUpcomingPeriods(chart);

  return {
    profile: { name: chart.profile.name, gender: chart.profile.gender },
    birthDetails: chart.birthDetails,
    ascendant: chart.ascendant,
    // Always include ALL planets and houses — no topic-based filtering
    planets: chart.planets.map(p => ({
      id: p.id, name: p.name, sign: p.sign, house: p.house,
      degreesInSign: p.degreesInSign, nakshatra: p.nakshatra, pada: p.pada,
      isRetrograde: p.isRetrograde, isCombust: p.isCombust, dignity: p.dignity,
    })),
    houses: chart.houses.map(h => ({
      number: h.number, sign: h.sign, lord: h.lord, occupants: h.occupants,
    })),
    dashas: {
      current: { planet: currentDasha.planet, endsAt: currentDasha.endDate },
      antardasha: currentAntardasha ? { planet: currentAntardasha.planet, endsAt: currentAntardasha.endDate } : null,
      pratyantar: currentPratyantar ? { planet: currentPratyantar.planet, endsAt: currentPratyantar.endDate } : null,
      upcomingPeriods,
    },
    yogas: chart.yogas.filter(y => y.detected).map(y => ({ name: y.name, detected: y.detected, strength: y.strength })),
    doshas: chart.doshas.filter(d => d.detected).map(d => ({ name: d.name, detected: d.detected, severity: d.severity })),
    aspects: chart.aspects.map(a => ({
      sourcePlanet: a.sourcePlanet, targetHouse: a.targetHouse,
      targetPlanets: a.targetPlanets, strength: a.strength,
    })),
    gochar: gochar?.map(g => ({
      id: g.id, sign: g.sign, natalHouse: g.natalHouse,
      isRetrograde: g.isRetrograde, nakshatra: g.nakshatra,
    })),
    // Store the canonical chart for interpreter access
    _canonicalChart: chart,
  } as ChartContext & { _canonicalChart: CanonicalChart };
}

/**
 * Serialize ChartContext to AI prompt text.
 *
 * Uses the deterministic interpreter to produce pre-written factual sentences.
 * Gochar (transit) data is appended separately since it is computed at runtime.
 */
export function serializeChartContext(context: ChartContext): string {
  const canonical = (context as ChartContext & { _canonicalChart?: CanonicalChart })._canonicalChart;

  // Use deterministic interpreter if canonical chart is attached
  if (canonical) {
    // Lazy import to keep the ai package from depending on jyotish at type-check time
    // The actual import is at runtime — both packages are in the same monorepo
    const { serializeChartInterpretation } = require('@luckyray/jyotish');
    let text: string = serializeChartInterpretation(canonical);

    // Append gochar section
    if (context.gochar && context.gochar.length > 0) {
      const gocharLines: string[] = ['', '── CURRENT GOCHAR (TODAY\'S TRANSITS) ──────────────────────'];
      for (const g of context.gochar) {
        const retro = g.isRetrograde ? ' [RETROGRADE]' : '';
        gocharLines.push(`${g.id}${retro}: transiting ${g.sign} (${g.nakshatra}) → falls in natal H${g.natalHouse}`);
      }
      gocharLines.push('');
      text += gocharLines.join('\n');
    }

    // Append upcoming dashas
    if (context.dashas.upcomingPeriods && context.dashas.upcomingPeriods.length > 0) {
      const dashLines: string[] = ['── UPCOMING DASHA PERIODS (next 3 years) ───────────────────'];
      for (const p of context.dashas.upcomingPeriods) {
        dashLines.push(`${p.level}: ${p.planet} (${p.startsAt.slice(0, 10)} — ${p.endsAt.slice(0, 10)})`);
      }
      dashLines.push('');
      text += '\n' + dashLines.join('\n');
    }

    return text;
  }

  // Fallback: plain table serialization (used when canonical chart not attached)
  return serializeFallback(context);
}

/**
 * Fallback serializer — used only when canonical chart is unavailable.
 */
function serializeFallback(context: ChartContext): string {
  const lines: string[] = [];
  lines.push(`## Chart for ${context.profile.name}`);
  lines.push(`Birth: ${context.birthDetails.date} ${context.birthDetails.time} at ${context.birthDetails.place}`);
  lines.push(`Ascendant: ${context.ascendant.sign} ${context.ascendant.degree}°`);
  lines.push('');
  lines.push('## Planets');
  for (const p of context.planets) {
    lines.push(`${p.name}: ${p.sign} H${p.house} ${p.degreesInSign.toFixed(1)}° ${p.dignity ?? ''}`);
  }
  lines.push('');
  lines.push('## Houses');
  for (const h of context.houses) {
    lines.push(`H${h.number} ${h.sign}: Lord=${h.lord}, Occupants=${h.occupants.join(', ') || 'empty'}`);
  }
  lines.push('');
  lines.push(`## Dasha: ${context.dashas.current.planet} until ${context.dashas.current.endsAt.slice(0, 10)}`);
  if (context.dashas.antardasha) {
    lines.push(`Antardasha: ${context.dashas.antardasha.planet} until ${context.dashas.antardasha.endsAt.slice(0, 10)}`);
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
  return [
    { role: 'system', content: `${systemPrompt}\n\n${rulesPrompt}\n\n${chartText}` },
    ...conversationHistory.slice(-10),
    { role: 'user', content: question },
  ];
}
