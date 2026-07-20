/**
 * Discriminator: finds the most informative question to ask next.
 *
 * Strategy: "maximum information gain"
 * - For each year in the person's life, check how many different MD+AD
 *   combinations exist across remaining high-probability candidates.
 * - A year where candidates split evenly between two MD+AD patterns gives
 *   the most information per question asked.
 * - We prefer year ranges (2–3 years) over single years so the user can
 *   recall significant events more easily.
 *
 * Output: a GeneratedQuestion with the year range and the candidate groups.
 */

import { nanoid } from 'nanoid';
import type { CandidateBirthTime, GeneratedQuestion, QuestionGroup } from './types';
import type { PlanetId } from '@luckyray/shared';
import { PLANET_THEMES } from './planet-themes';

const MIN_PROBABILITY_THRESHOLD = 0.01; // Ignore candidates below 1% probability

/** Entropy of a distribution — higher = more uncertainty = more info gained by asking */
function entropy(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0) return 0;
  return counts.reduce((e, c) => {
    if (c === 0) return e;
    const p = c / total;
    return e - p * Math.log2(p);
  }, 0);
}

/**
 * Find the year range that maximally discriminates among remaining candidates.
 *
 * Returns null if all candidates agree on every year (already converged or no data).
 */
export function findBestDiscriminatingPeriod(
  candidates: CandidateBirthTime[],
  questionsAlreadyAsked: GeneratedQuestion[],
  birthYear: number,
): GeneratedQuestion | null {
  const currentYear = new Date().getFullYear();
  const activeCandidates = candidates.filter(c => c.probability >= MIN_PROBABILITY_THRESHOLD);

  if (activeCandidates.length < 2) return null;

  // Years already covered by prior questions — don't repeat them
  const coveredYears = new Set<number>();
  for (const q of questionsAlreadyAsked) {
    for (let y = q.yearStart; y <= q.yearEnd; y++) coveredYears.add(y);
  }

  let bestScore = -Infinity;
  let bestPeriod: { startYear: number; endYear: number; groups: Map<string, string[]> } | null = null;

  // Evaluate non-overlapping 3-year windows. Skip any window that shares even
  // one year with a previously asked question — this prevents the discriminator
  // from asking about 2005-2007 and then 2006-2008 (which overlaps and feels
  // like the same question to the user).
  for (let startYear = birthYear + 3; startYear <= currentYear - 1; startYear += 3) {
    const endYear = Math.min(startYear + 2, currentYear - 1);

    // Skip if ANY year in this window was already covered
    const windowYears = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    if (windowYears.some(y => coveredYears.has(y))) {
      continue;
    }

    // Group candidates by their MD+AD combination in the MIDDLE year of the window
    const midYear = Math.floor((startYear + endYear) / 2);
    const groups = new Map<string, string[]>(); // "MD/AD" → [candidate times]

    for (const c of activeCandidates) {
      const state = c.dashaData?.[String(midYear)];
      if (!state) continue;
      const key = `${state.md}/${state.ad ?? 'none'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c.time);
    }

    if (groups.size < 2) continue; // No discrimination possible in this period

    // Score by weighted entropy (weights = group sizes = number of surviving candidates)
    const counts = Array.from(groups.values()).map(g => g.length);
    const score = entropy(counts);

    if (score > bestScore) {
      bestScore = score;
      bestPeriod = { startYear, endYear, groups };
    }
  }

  if (!bestPeriod) return null;

  // Build question groups from the winning period
  const questionGroups: QuestionGroup[] = [];
  for (const [key, times] of bestPeriod.groups.entries()) {
    const [mdStr, adStr] = key.split('/');
    const md = mdStr as PlanetId;
    const ad = adStr !== 'none' ? (adStr as PlanetId) : null;

    const planets: PlanetId[] = ad ? [md, ad] : [md];
    const mdTheme = PLANET_THEMES[md];
    const adTheme = ad ? PLANET_THEMES[ad] : null;

    const themeLabel = adTheme
      ? `${mdTheme?.generalVibe ?? md} • ${adTheme?.generalVibe ?? ad}`
      : (mdTheme?.generalVibe ?? md);

    questionGroups.push({
      planets,
      themeLabel,
      candidateCount: times.length,
      candidateTimes: times,
    });
  }

  // Sort groups by candidate count (largest first)
  questionGroups.sort((a, b) => b.candidateCount - a.candidateCount);

  const questionText = buildQuestionText(bestPeriod.startYear, bestPeriod.endYear, questionGroups);
  const hint = buildHint(questionGroups);

  return {
    id: nanoid(8),
    yearStart: bestPeriod.startYear,
    yearEnd: bestPeriod.endYear,
    groups: questionGroups,
    questionText,
    hint,
  };
}

function buildQuestionText(startYear: number, endYear: number, groups: QuestionGroup[]): string {
  const period = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;

  if (groups.length === 2) {
    const [a, b] = groups;
    return `During ${period}, which of the following better describes what you were experiencing — or describe it in your own words below:

A) Themes of: ${a?.themeLabel}

B) Themes of: ${b?.themeLabel}`;
  }

  const optionLines = groups.map((g, i) =>
    `${String.fromCharCode(65 + i)}) Themes of: ${g.themeLabel}`,
  );

  return `During ${period}, which of the following best describes that period of your life?\n\n${optionLines.join('\n')}`;
}

function buildHint(groups: QuestionGroup[]): string {
  const allKeywords = groups
    .flatMap(g => g.planets.flatMap(p => PLANET_THEMES[p]?.keywords.slice(0, 3) ?? []))
    .filter((k, i, arr) => arr.indexOf(k) === i)
    .slice(0, 8);

  return `Think about: ${allKeywords.join(', ')}. Describe freely — the AI will interpret your answer.`;
}

/**
 * Compute the fraction of candidates that would be resolved by a given question.
 * Useful for UI progress indication.
 */
export function estimateInformationGain(question: GeneratedQuestion, candidates: CandidateBirthTime[]): number {
  const active = candidates.filter(c => c.probability >= MIN_PROBABILITY_THRESHOLD);
  const largestGroup = Math.max(...question.groups.map(g => g.candidateCount));
  // Best case: everything goes into one group = largestGroup / total survive
  return 1 - largestGroup / active.length;
}
