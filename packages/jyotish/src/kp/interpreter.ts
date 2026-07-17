/**
 * KP Deterministic Interpreter.
 *
 * Converts KPData into pre-written factual English that the AI treats as
 * ground truth — eliminating hallucination about timing predictions and
 * planet significations.
 *
 * The full 4-level significator table is serialised so the AI can reason
 * correctly about which planets signify which houses and at what strength.
 */

import type { KPData, CanonicalChart, PlanetId } from '@luckyray/shared';

const TOPIC_LABELS: Record<string, string> = {
  career:   'CAREER (H2, H6, H10, H11)',
  marriage: 'MARRIAGE (H2, H7, H11)',
  wealth:   'WEALTH (H2, H6, H10, H11)',
  health:   'HEALTH (H1, H6, H8, H12)',
  children: 'CHILDREN (H2, H5, H11)',
  foreign:  'FOREIGN TRAVEL / SETTLEMENT (H3, H9, H12)',
};

function fmtList(ids: PlanetId[]): string {
  return ids.length > 0 ? ids.join(', ') : '—';
}

export function serializeKPInterpretation(chart: CanonicalChart): string {
  const { kp } = chart;
  if (!kp) return '';

  const lines: string[] = [];

  lines.push('');
  lines.push('╔═══════════════════════════════════════════════════════════════╗');
  lines.push('║            KP (KRISHNAMURTI PADDHATI) ANALYSIS               ║');
  lines.push('║  System: Placidus cusps · Sidereal · Vimshottari sub-lords   ║');
  lines.push('╚═══════════════════════════════════════════════════════════════╝');
  lines.push('NOTE: Planet house positions below use Placidus (may differ from the Whole Sign chart).');
  lines.push('');

  // ── Cusps ────────────────────────────────────────────────────────────────
  lines.push('── PLACIDUS HOUSE CUSPS ──────────────────────────────────────────');
  for (const cusp of kp.cusps) {
    const deg = Math.floor(cusp.degreesInSign);
    const min = Math.round((cusp.degreesInSign - deg) * 60);
    lines.push(
      `H${String(cusp.house).padStart(2)}: ${cusp.sign.padEnd(12)} ${String(deg).padStart(2)}°${String(min).padStart(2,'0')}'` +
      `  ★ ${cusp.nakshatra.padEnd(14)} Star Lord: ${cusp.nakshatraLord.padEnd(8)} Sub: ${cusp.subLord.padEnd(8)} Sub-Sub: ${cusp.subSubLord}`,
    );
  }

  // ── Planet positions ─────────────────────────────────────────────────────
  lines.push('');
  lines.push('── PLANET POSITIONS (Placidus house) ────────────────────────────');
  for (const p of kp.planets) {
    lines.push(
      `${p.planet.padEnd(8)}: H${String(p.house).padStart(2)}  ` +
      `Star Lord: ${p.nakshatraLord.padEnd(8)} Sub: ${p.subLord.padEnd(8)} Sub-Sub: ${p.subSubLord}`,
    );
  }

  // ── 4-Level Significator Table ───────────────────────────────────────────
  lines.push('');
  lines.push('── HOUSE SIGNIFICATORS (4-Level KP System) ──────────────────────');
  lines.push('L1 = planet occupies house (strongest)');
  lines.push('L2 = planet is in the nakshatra of an L1 occupant');
  lines.push('L3 = planet is sign lord of the house cusp');
  lines.push('L4 = planet is in the nakshatra of the sign lord (weakest)');
  lines.push('');
  lines.push('House | L1 (Occupants)          | L2 (Star of occ.)       | L3 (Sign lord) | L4 (Star of lord)');
  lines.push('──────┼─────────────────────────┼─────────────────────────┼────────────────┼──────────────────');
  for (const hs of kp.significators) {
    lines.push(
      `  H${String(hs.house).padStart(2)} | ${fmtList(hs.level1).padEnd(23)} | ${fmtList(hs.level2).padEnd(23)} | ${fmtList(hs.level3).padEnd(14)} | ${fmtList(hs.level4)}`,
    );
  }

  // ── Planet → Houses summary (flat) ──────────────────────────────────────
  lines.push('');
  lines.push('── PLANET SIGNIFICATION SUMMARY (all levels) ────────────────────');
  lines.push('For each planet: houses it signifies and at which level.');

  // Build planet → {house, level}[] from significators
  const planetDetailMap = new Map<PlanetId, { house: number; level: 1|2|3|4 }[]>();
  for (const hs of kp.significators) {
    const add = (p: PlanetId, lvl: 1|2|3|4) => {
      const arr = planetDetailMap.get(p) ?? [];
      arr.push({ house: hs.house, level: lvl });
      planetDetailMap.set(p, arr);
    };
    hs.level1.forEach(p => add(p, 1));
    hs.level2.forEach(p => add(p, 2));
    hs.level3.forEach(p => add(p, 3));
    hs.level4.forEach(p => add(p, 4));
  }
  for (const [planet, detail] of planetDetailMap) {
    const str = detail.map(d => `H${d.house}(L${d.level})`).join(', ');
    lines.push(`  ${planet.padEnd(8)}: ${str}`);
  }

  // ── Ruling Planets ───────────────────────────────────────────────────────
  lines.push('');
  lines.push('── RULING PLANETS (at birth) ────────────────────────────────────');
  const rp = kp.rulingPlanets;
  lines.push(`Asc Star Lord: ${rp.ascStarLord}  |  Asc Sub Lord: ${rp.ascSubLord}  |  Asc Sign Lord: ${rp.ascSignLord}`);
  lines.push(`Moon Star Lord: ${rp.moonStarLord}  |  Moon Sub Lord: ${rp.moonSubLord}  |  Moon Sign Lord: ${rp.moonSignLord}`);
  lines.push(`Day Lord: ${rp.dayLord}`);

  // ── Event Promise & Periods ──────────────────────────────────────────────
  lines.push('');
  lines.push('── KP EVENT PROMISE & PREDICTED PERIODS ─────────────────────────');
  lines.push('CRITICAL INSTRUCTION TO AI:');
  lines.push('  1. Use ONLY the predicted periods listed below for any timing claims.');
  lines.push('  2. Cite the confidence level (HIGH/MODERATE/LOW) for each period.');
  lines.push('  3. Do NOT invent dasha periods or contradict the promise status below.');
  lines.push('  4. Explain which Level (L1/L2/L3/L4) signification supports the period.');

  for (const event of kp.events) {
    lines.push('');
    lines.push(`▸ ${TOPIC_LABELS[event.topic] ?? event.topic.toUpperCase()}`);
    lines.push(`  Primary Cusp: H${event.primaryHouse}  |  Sub Lord: ${event.primaryCuspSubLord}`);
    lines.push(`  Sub Lord signification (all houses): ${
      event.sublordSignifiesWithLevel.length > 0
        ? event.sublordSignifiesWithLevel.map(d => `H${d.house}(L${d.level})`).join(', ')
        : '(none)'
    }`);
    lines.push(`  PROMISE: ${event.isPromised ? `YES — ${event.promiseStrength.toUpperCase()}` : 'NO'}`);
    lines.push(`  Reason: ${event.promiseReason}`);
    lines.push(`  All significators for this topic: ${event.significators.join(', ') || '(none)'}`);

    if (event.predictedPeriods.length > 0) {
      lines.push('  Predicted favorable periods:');
      for (let i = 0; i < event.predictedPeriods.length; i++) {
        const p = event.predictedPeriods[i]!;
        lines.push(`    ${i + 1}. [${p.confidence.toUpperCase()}] ${p.mahadasha} MD / ${p.antardasha} AD`);
        lines.push(`       ${p.startDate} → ${p.endDate}`);
        lines.push(`       ${p.reason}`);
      }
    } else if (!event.isPromised) {
      lines.push('  No periods predicted — event not clearly promised.');
    } else {
      lines.push('  No upcoming favorable periods within the visible dasha span.');
    }
  }

  lines.push('');
  lines.push('╔═══════════════════════════════════════════════════════════════╗');
  lines.push('║                     END KP ANALYSIS                          ║');
  lines.push('╚═══════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}
