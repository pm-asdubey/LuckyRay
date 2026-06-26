/**
 * KP Deterministic Interpreter.
 *
 * Converts KPData into pre-written factual English sentences that the AI
 * treats as ground truth — eliminating hallucination about timing predictions.
 *
 * Output is appended to the main Jyotish interpreter output in AI prompts.
 */

import type { KPData, CanonicalChart } from '@luckyray/shared';
import { NAKSHATRA_NAMES } from '@luckyray/shared';

const TOPIC_LABELS: Record<string, string> = {
  career:   'CAREER (H2, H6, H10, H11)',
  marriage: 'MARRIAGE (H2, H7, H11)',
  wealth:   'WEALTH (H2, H6, H10, H11)',
  health:   'HEALTH (H1, H6, H8, H12)',
  children: 'CHILDREN (H2, H5, H11)',
  foreign:  'FOREIGN TRAVEL / SETTLEMENT (H3, H9, H12)',
};

export function serializeKPInterpretation(chart: CanonicalChart): string {
  const { kp } = chart;
  if (!kp) return '';

  const lines: string[] = [];

  lines.push('');
  lines.push('╔═══ KP (KRISHNAMURTI PADDHATI) ANALYSIS ═══╗');
  lines.push('║ System: Placidus cusps · Sidereal longitudes · Vimshottari sublords ║');
  lines.push('║ IMPORTANT: Planet house positions below use Placidus (may differ from Whole Sign chart) ║');
  lines.push('╚═══════════════════════════════════════════╝');
  lines.push('');
  lines.push('── PLACIDUS HOUSE CUSPS ────────────────────────────────────────────────');

  for (const cusp of kp.cusps) {
    const deg = Math.floor(cusp.degreesInSign);
    const min = Math.round((cusp.degreesInSign - deg) * 60);
    lines.push(
      `H${cusp.house.toString().padStart(2)}: ${cusp.sign} ${deg}°${min.toString().padStart(2, '0')}'  ` +
      `[${cusp.nakshatra} — Star Lord: ${cusp.nakshatraLord} | Sub Lord: ${cusp.subLord} | Sub-Sub: ${cusp.subSubLord}]`,
    );
  }

  lines.push('');
  lines.push('── KP PLANET POSITIONS (Placidus houses) ───────────────────────────────');

  for (const p of kp.planets) {
    lines.push(
      `${p.planet.padEnd(8)}: KP House ${p.house} — Star Lord: ${p.nakshatraLord} | Sub Lord: ${p.subLord} | Sub-Sub: ${p.subSubLord}`,
    );
  }

  lines.push('');
  lines.push('── HOUSE SIGNIFICATORS ─────────────────────────────────────────────────');
  lines.push('(A planet signifies a house through: occupancy, being in the star of an occupant,');
  lines.push(' sign lordship of the cusp, or being in the star of the sign lord.)');

  for (const hs of kp.significators) {
    const sigs = hs.significators.length > 0 ? hs.significators.join(', ') : '(none)';
    lines.push(`H${hs.house.toString().padStart(2)}: ${sigs}`);
  }

  lines.push('');
  lines.push('── RULING PLANETS ──────────────────────────────────────────────────────');
  const rp = kp.rulingPlanets;
  lines.push(`Asc Star Lord: ${rp.ascStarLord}  |  Asc Sub Lord: ${rp.ascSubLord}`);
  lines.push(`Moon Star Lord: ${rp.moonStarLord}  |  Moon Sub Lord: ${rp.moonSubLord}`);
  lines.push(`Day Lord: ${rp.dayLord}`);

  lines.push('');
  lines.push('── KP EVENT PROMISE & PREDICTED PERIODS ────────────────────────────────');
  lines.push('CRITICAL: Use ONLY the predicted periods listed below for timing predictions.');
  lines.push('Do NOT invent dasha periods for timing. These are computed deterministically.');

  for (const event of kp.events) {
    lines.push('');
    lines.push(`▸ ${TOPIC_LABELS[event.topic] ?? event.topic.toUpperCase()}`);
    lines.push(`  Primary Cusp: H${event.primaryHouse} | Sub Lord: ${event.primaryCuspSubLord}`);
    lines.push(`  Sub Lord signifies: ${event.sublordSignifies.length > 0 ? event.sublordSignifies.map(h => `H${h}`).join(', ') : '(none)'}`);
    lines.push(`  PROMISE: ${event.isPromised ? 'YES ✓' : 'NO ✗'}`);
    lines.push(`  Reason: ${event.promiseReason}`);
    lines.push(`  Significator planets: ${event.significators.join(', ') || '(none)'}`);

    if (event.predictedPeriods.length > 0) {
      lines.push('  Predicted favorable periods (highest confidence first):');
      for (let i = 0; i < event.predictedPeriods.length; i++) {
        const p = event.predictedPeriods[i]!;
        lines.push(`  ${i + 1}. [${p.confidence.toUpperCase()}] ${p.mahadasha} MD / ${p.antardasha} AD`);
        lines.push(`     Period: ${p.startDate} — ${p.endDate}`);
        lines.push(`     Why: ${p.reason}`);
      }
    } else if (!event.isPromised) {
      lines.push('  No periods predicted — event not clearly promised in this chart.');
    } else {
      lines.push('  No upcoming favorable periods found within visible dasha span.');
    }
  }

  lines.push('');
  lines.push('╔═══ END KP ANALYSIS ═══╗');
  lines.push('AI INSTRUCTION: For all timing questions, cite the KP predicted periods above');
  lines.push('with their confidence levels. Do not state timing that contradicts this section.');
  lines.push('╚═══════════════════════╝');

  return lines.join('\n');
}
