'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Download, Loader2, CheckCircle2, ChevronDown, Play, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart } from '@luckyray/shared';
import { buildChartContext, serializeChartContext } from '@luckyray/ai';
import { computeCurrentGochar } from '@luckyray/jyotish';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { LuckyRayLogo } from '@/components/brand/logo';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'career' | 'love' | 'wealth' | 'health';
type SectionStatus = 'pending' | 'generating' | 'waiting' | 'done' | 'error';

interface GeneratedSection {
  sectionId: string;
  title: string;
  content: string;
  status: SectionStatus;
  waitingMs?: number;
}

interface ReportState {
  sections: GeneratedSection[];
  status: 'idle' | 'generating' | 'done' | 'error';
}

// ─── Report Config ────────────────────────────────────────────────────────────

import { Briefcase, Heart, Coins, Stethoscope } from 'lucide-react';

const REPORT_META: Record<ReportType, { title: string; subtitle: string; icon: React.ReactNode }> = {
  career: { title: 'Career & Profession', subtitle: '10th house, dashas, timing', icon: <Briefcase size={15} /> },
  love:   { title: 'Love & Marriage',     subtitle: '7th house, Venus, timing',   icon: <Heart size={15} /> },
  wealth: { title: 'Wealth & Finance',    subtitle: '2nd, 11th, Dhana yogas',     icon: <Coins size={15} /> },
  health: { title: 'Health & Vitality',   subtitle: 'Lagna, 6th, 8th house',      icon: <Stethoscope size={15} /> },
};

const REPORT_TYPES: ReportType[] = ['career', 'love', 'wealth', 'health'];

// ─── Prompts ──────────────────────────────────────────────────────────────────

const PREAMBLE = `
FORMATTING: Format your response using Markdown. Use **bold** for key findings. Use bullet lists where appropriate. Use headers like "### Sub-section" for sub-topics within the section.

DATA RULES:
- Use ONLY verified facts in CHART DATA. Do not invent aspects, conjunctions, or positions not stated there.
- Aspects vs Conjunctions: Planets in the same house = CONJUNCT (never say they "aspect" each other).
- Dignity: Own sign / Moolatrikona = STRONG. Never call own-sign "neutral."
- KP Timing: For predicted periods, use the KP PREDICTED PERIODS from the chart data — do not invent dasha timing.
- Label every prediction: [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE].
- Be thorough, honest, and specific. Do not soften negative indicators.
`.trim();

function makePrompt(body: string, ctx: string): string {
  return `${PREAMBLE}\n\n${body}\n\n---\nCHART DATA:\n${ctx}`;
}

interface SectionDef { id: string; title: string; prompt: (ctx: string) => string }

function getSections(type: ReportType): SectionDef[] {
  const defs: Record<ReportType, SectionDef[]> = {
    career: [
      { id: 'c1', title: '1. Natal Career Architecture', prompt: ctx => makePrompt(`Analyze the natal career architecture in detail:
- **10th house**: sign, lord placement (sign, house, dignity, all aspects received and given), all occupants
- **10th lord strength**: exalted/own/friendly/neutral/enemy/debilitated — what does this mean for the career trajectory?
- **6th house** (service, daily work, competition): condition, lord placement
- **2nd house** (accumulated income, speech): lord and occupants
- **11th house** (gains, desires fulfilled): lord strength and occupants
- Interconnections and yoga formations between these wealth/career houses
- What career domains and professional signatures does this combination indicate? Be specific about industries.`, ctx) },
      { id: 'c2', title: '2. Career Significator Planets', prompt: ctx => makePrompt(`Analyze every career-significant planet in depth:

**Sun** (authority, government, father, leadership, status) — sign, house, dignity, aspects received and given, combustion status, career implications

**Saturn** (natural career karaka, discipline, hard work, law, industry, longevity of career) — same depth of analysis

**Mercury** (intellect, communication, business, IT, analysis, trade) — same depth

**Mars** (engineering, surgery, military, real estate, competitive work) — same depth

**Jupiter** (education, law, banking, advisory, management, wisdom) — same depth

For each planet: what specific career strengths and vulnerabilities does its condition reveal?`, ctx) },
      { id: 'c3', title: '3. Career Yogas & Combinations', prompt: ctx => makePrompt(`Identify and explain all career-relevant yogas precisely:

- **Raja Yogas present**: name each exactly — which lords are involved, which houses, the strength of each
- **Dharma-Karmadhipati Yoga**: 9th lord + 10th lord — are they conjunct, aspecting, in exchange?
- **Pancha Mahapurusha Yogas**: Sasha (Saturn), Ruchaka (Mars), Hamsa (Jupiter), Malavya (Venus), Bhadra (Mercury) — which are present and what do they indicate?
- **Neecha Bhanga** (debilitation cancellation) affecting career planets — name each cancellation
- **Parivartana** exchanges involving career houses (1, 2, 6, 10, 11)
- **Viparita Raja Yoga** if present (6th/8th/12th lord in another dusthana)

**Overall career potential rating**: Exceptional / Strong / Moderate / Limited — with explicit evidence.`, ctx) },
      { id: 'c4', title: '4. KP & Dasha Timing for Career', prompt: ctx => makePrompt(`Exhaustive timing analysis for career using both Jyotish Dasha and KP methods:

**KP Career Promise**: Report the H10 sub lord, what houses it signifies, whether career is promised, and the KP predicted periods (from the KP section of chart data).

**Current Mahadasha**: which houses does the lord rule? Which house does it occupy? What is its dignity? What is its natural signification for career? Overall career verdict for this Mahadasha period.

**Current Antardasha**: same detailed treatment. How does it interact with the Mahadasha lord? Career conditions RIGHT NOW.

**Current Pratyantar**: what is the immediate career condition in the next few weeks/months?

**Upcoming 5 years** — for each upcoming Antardasha: name the planet, its house rulerships, and whether it supports or challenges career.

**Best career window in next 5 years**: identify it with full reasoning.

Label all timing predictions with [HIGH/MEDIUM/LOW CONFIDENCE].`, ctx) },
      { id: 'c5', title: '5. Current Transits & Near-Term Outlook', prompt: ctx => makePrompt(`Current planetary transits for career:

**Saturn transit**: which natal house is it transiting? Impact on career (2nd = finances, 6th = work environment, 10th = career peak/challenge, 11th = gains). Duration remaining in this transit. Specific career implication.

**Jupiter transit**: which natal house? Career blessing or challenge? Specific domain of benefit (promotion, new opportunity, expansion). Duration.

**Rahu-Ketu axis**: which natal houses are affected? Rahu = sudden career changes, unconventional opportunities, ambition; Ketu = separation, specialization.

**Mars transit**: over which natal house? Career activity levels — initiative, conflict, energy.

**Net verdict**: do current transits reinforce or challenge the dasha indications? Where they agree = high confidence.

Provide approximate timeline for each transit.`, ctx) },
      { id: 'c6', title: '6. Career — Final Synthesis & Predictions', prompt: ctx => makePrompt(`Comprehensive final career analysis:

**PART A — Natal Profile**
- Overall career rating with evidence
- Primary career domains indicated by this chart (be very specific: industries, roles)
- Top 3 professional strengths
- Top 2 professional vulnerabilities or blind spots

**PART B — Timing Predictions**
- **Near term (next 6 months)**: career trajectory, specific opportunities or challenges [Confidence + Evidence]
- **Medium term (1–3 years)**: major professional developments, best action windows [Confidence + Evidence]
- **Long term (3–7 years)**: peak career period, overall professional arc [Confidence + Evidence]

**PART C — Strategic Guidance**
- Income domains most aligned with this chart (employment vs business vs advisory vs creative)
- Optimal timing for: launching a business, seeking promotion, changing careers
- Specific cautions and what to avoid based on planetary weaknesses
- One actionable insight the person can apply immediately`, ctx) },
    ],
    love: [
      { id: 'l1', title: '1. Natal Relationship Architecture', prompt: ctx => makePrompt(`Analyze natal relationship and marriage architecture:
- **7th house**: sign, lord placement (sign, house, dignity, all aspects received and given), occupying planets
- **7th lord strength**: what does its condition reveal about partnership quality and timing?
- **5th house** (romance, courtship, attraction): condition, lord placement
- **2nd house** (family life, domestic happiness): lord and occupants
- **11th house** (desire fulfillment, social circle): role in relationships
- **8th house** (marriage longevity, transformation, spouse's resources): condition
- Partner profile: what qualities does the 7th house sign and lord placement indicate in a spouse/partner?`, ctx) },
      { id: 'l2', title: '2. Relationship Significator Planets', prompt: ctx => makePrompt(`Deep analysis of relationship and love planets:

**Venus** (prime relationship karaka — love, beauty, pleasure, partnership): sign, house, nakshatra, dignity, combust?, aspects from malefics vs benefics, nakshatra lord, sub lord (KP). Full relationship implications.

**Moon** (emotional nature, receptivity, mind, nurturing): sign, house, waxing/waning, afflictions from Saturn/Rahu/Mars, nakshatra — emotional patterns in relationships.

**Mars** (passion, physical attraction, Manglik factor): placement, aspects, relationship with Venus — passion and conflict dynamics.

**Jupiter** (husband karaka for female charts; blessings, dharmic alignment): placement, 7th house aspect if any.

**Rahu** (unconventional relationships, foreign partner, desire): position and influence on 7th or Venus.

For each: what does its condition specifically reveal about how this person experiences love, partnership, and marriage?`, ctx) },
      { id: 'l3', title: '3. Marriage Yogas, Doshas & Timing', prompt: ctx => makePrompt(`Analyze marriage-specific combinations:

- **Manglik Dosha**: Is Mars in 1/4/7/8/12? Which house? Severity? What specific cancellations are present?
- **Marriage yogas**: Raja Yoga involving 7th lord, Parivartana involving 7th, 5th-7th lord relationship
- **Afflictions on marriage**: Saturn in/aspecting 7th, Rahu/Ketu in 7th, multiple malefics on Venus
- **Indicators of delay**: 7th lord in dusthana, Saturn on 7th lord, malefics in 7th without benefic aspect
- **Multiple marriage indicators**: if present, state clearly and honestly
- **Separation or discord indicators**: if present, state honestly
- **Cancellations** for negative combinations: list each one
- **Overall marriage prospect**: Highly Favorable / Favorable / Moderately Favorable / Delayed / Challenged — with evidence`, ctx) },
      { id: 'l4', title: '4. KP & Dasha Timing for Marriage', prompt: ctx => makePrompt(`Exhaustive timing analysis for marriage using both Jyotish and KP:

**KP Marriage Promise**: Report the H7 sub lord, what houses it signifies, whether marriage is promised, and KP predicted periods for marriage.

**Current Mahadasha**: does it rule/occupy 7th, 5th, or 11th (marriage triggers) or 2nd (family)? Relationship with Venus? Marriage verdict for this period.

**Current Antardasha**: immediate marriage conditions. Is there a triggering combination active now?

**Classic marriage triggers to watch**: Dasha/Antardasha of 7th lord, Venus, planets in 7th, and the Darakaraka.

**Upcoming dasha sequence** — identify the primary marriage window with full reasoning: which dasha combination, which planets, which period dates.

**Secondary window** if the primary passes. Be explicit about periods of difficulty as well.

Label all with [HIGH/MEDIUM/LOW CONFIDENCE].`, ctx) },
      { id: 'l5', title: '5. Transits & Relationship Dynamics', prompt: ctx => makePrompt(`Current transits for love and marriage:

**Jupiter transit**: which natal house? Does it aspect natal Venus or the 7th house cusp? Duration. Marriage/relationship blessing or neutral?

**Saturn transit**: over natal Venus, 7th house, or the 7th lord? Delays, restrictions, or stability/maturity? Is Sade Sati active? Which phase?

**Rahu-Ketu axis**: Rahu over Venus or 7th = intense, unconventional attraction — passion and disruption combined.

**Venus transit** (for near-term relationship events): current position and implications.

**Net verdict**: do transits support, delay, or complicate marriage and relationships?

**Best upcoming marriage window** combining dasha + transit alignment — give month/year ranges.`, ctx) },
      { id: 'l6', title: '6. Love & Marriage — Final Synthesis', prompt: ctx => makePrompt(`Comprehensive final love and marriage analysis:

**PART A — Natal Relationship Profile**
- Overall rating for partnership and marriage
- Ideal partner profile (qualities, background, nature indicated by 7th house sign/lord/nakshatra)
- Relationship patterns and tendencies (how this person loves, attaches, commits)
- Primary relationship strengths and vulnerabilities

**PART B — Marriage Timing**
- Primary marriage window [Confidence + full evidence chain]
- Secondary window [Confidence + evidence]
- Delay indicators if present (be honest)
- Periods of relationship difficulty or separation risk

**PART C — Post-Marriage Dynamics**
- Marital harmony indicators
- Areas of friction or growth
- Financial dynamics with spouse (8th house)
- Children timing (5th house)

**PART D — Guidance**
- Relationship approach suited to this chart
- What to prioritize and what to avoid
- Optimal timing for commitment and marriage
- One actionable relationship insight`, ctx) },
    ],
    wealth: [
      { id: 'w1', title: '1. Natal Wealth Architecture', prompt: ctx => makePrompt(`Analyze natal wealth architecture in depth:
- **2nd house** (accumulated wealth, liquid assets, family wealth): sign, lord placement, dignity, all aspects, occupants
- **11th house** (income, gains, desires fulfilled, profits): sign, lord strength, occupants, all aspects
- **5th house** (investments, speculation, intelligence, creativity): condition
- **9th house** (fortune, luck, dharma, father's support): condition
- **8th house** (inheritance, windfall, sudden gains/losses, other's resources): condition
- **12th house** (expenditure, losses, foreign investments): how does it balance against income houses?
- Are the primary wealth houses (2nd, 11th) in strong hands (lord in kendra/trikona) or challenged (lord in dusthana)?`, ctx) },
      { id: 'w2', title: '2. Wealth Significator Planets', prompt: ctx => makePrompt(`Deep analysis of wealth planets:

**Jupiter** (natural karaka of wealth and expansion): sign, house, dignity, aspects, functional role for this ascendant, natural wealth domain

**Venus** (luxury, material comfort, investments, arts): condition and wealth implications

**Mercury** (business, trade, calculation, financial acumen, communication): condition

**Moon** (liquid assets, flow of money, fluctuations, imports): strength, sign, house — wealth fluidity

**Saturn** (slow and steady accumulation, discipline, real estate, labor): condition and accumulation patterns

**Rahu** (sudden gains, unconventional income, foreign wealth, amplification): position and wealth amplification

For each: specific implication for this person's financial signature.`, ctx) },
      { id: 'w3', title: '3. Dhana Yogas & Wealth Combinations', prompt: ctx => makePrompt(`Identify ALL wealth yogas with precision:

**Dhana Yogas** (primary): 2nd lord + 11th lord — are they conjunct, aspecting, in exchange? Rate each formation.

**Lakshmi Yoga**: 9th lord in own/exalted sign AND strong Venus in kendra or trikona — present?

**Raja Yogas with financial impact**: those involving 2nd or 11th lords specifically

**Pancha Mahapurusha Yogas** and their material wealth domain

**Viparita Raja Yoga**: 6th/8th/12th lord in another dusthana — paradoxical material success through difficulties?

**Parivartana exchanges** involving 2nd, 11th, or 9th lords

**Negative combinations**: 2nd lord in 12th, 11th lord in dusthana, malefics in 2nd without relief

**Overall wealth potential**: Exceptional / Strong / Moderate / Limited — with evidence.`, ctx) },
      { id: 'w4', title: '4. KP & Dasha Timing for Wealth', prompt: ctx => makePrompt(`Exhaustive wealth timing using Jyotish and KP:

**KP Wealth Promise**: Report the H11 sub lord, what houses it signifies, whether wealth is promised, and KP predicted periods for financial gains.

**Current Mahadasha**: does it rule 2nd/11th/5th/9th (wealth triggers)? Does it rule 6th/8th/12th (financial challenges)? Natural signification for wealth. Overall financial verdict.

**Current Antardasha**: financial implications now. Does it activate any Dhana Yoga?

**Current Pratyantar**: immediate financial conditions — favorable for transactions, investments, or caution?

**Upcoming wealth periods (next decade)**: identify the best accumulation windows, major financial events, expenditure/caution periods.

**Peak wealth period**: when in the dasha sequence does maximum financial accumulation occur?

**Income source activation**: when do specific income streams (business, investment, inheritance, salary) activate?

Label all with [HIGH/MEDIUM/LOW CONFIDENCE].`, ctx) },
      { id: 'w5', title: '5. Transits & Financial Outlook', prompt: ctx => makePrompt(`Current transits for wealth and finance:

**Jupiter transit**: which natal house? H2 = savings accumulation; H5 = investment returns; H9 = fortune activation; H11 = maximum gains. Duration and specific financial implication.

**Saturn transit**: restriction or discipline in finances. Which house? Specific impact on the financial area it transits. Long-term financial restructuring.

**Rahu transit**: sudden financial changes — windfall or sudden loss depending on house. Is it over 2nd or 11th?

**Net financial transit picture**: is the current period for accumulation, stability, restructuring, or caution?

**Upcoming major transit events** affecting finances in next 6–12 months — name each and its implication.`, ctx) },
      { id: 'w6', title: '6. Wealth — Final Synthesis & Strategy', prompt: ctx => makePrompt(`Comprehensive final wealth analysis:

**PART A — Natal Financial Profile**
- Overall wealth potential rating with evidence
- Primary wealth generation channels (employment income / business profits / investments / inheritance / speculation / passive income)
- Key financial strengths (what creates money naturally for this chart)
- Key financial vulnerabilities (what creates losses or blocks)

**PART B — Timing Predictions**
- **Near term (6 months)**: financial trajectory [Confidence + Evidence]
- **Medium term (1–3 years)**: accumulation windows, best investment windows, caution periods
- **Long term (3–7 years)**: peak wealth accumulation period, overall financial arc

**PART C — Financial Strategy**
- Wealth-building approach aligned with this chart's patterns
- Investment domains (real estate, business, stock market, gold) suited to planetary signatures
- Financial mistakes to avoid based on planetary weaknesses
- Best timing for major financial decisions (investment, business launch, property purchase)
- One immediate financial insight`, ctx) },
    ],
    health: [
      { id: 'h1', title: '1. Constitution & Physical Vitality', prompt: ctx => makePrompt(`Analyze physical constitution and body:
- **Lagna sign**: what constitutional type, physical tendencies, and vitality level does it indicate?
- **Lagna lord**: placement, dignity, house — the lagna lord IS the body karaka. Is it strong, challenged, afflicted?
- Is the lagna lord in kendra (strong vitality), trikona (protected vitality), or dusthana (vulnerable)?
- **Planets in 1st house**: benefics strengthen constitution, malefics create stress — analyze each
- **Aspects to 1st house**: from malefics vs benefics — overall vitality rating
- **6th house**: sign, lord placement — what disease categories are associated with this sign?
- **8th house**: chronic conditions, longevity indicators, hidden vulnerabilities
- **12th house**: hospitalization risk, hidden ailments, foreign illness

**DISCLAIMER: Jyotish analysis for self-awareness only. Always consult qualified medical professionals for health decisions.**`, ctx) },
      { id: 'h2', title: '2. Health Significator Planets', prompt: ctx => makePrompt(`Deep analysis of health-significant planets:

**Sun** (vitality, heart, spine, immunity, eyes): sign, house, dignity, combust?, afflictions from Saturn/Rahu/Mars — core vitality verdict

**Moon** (mind, blood, fluids, emotional health, lymph): strength (waxing/waning, sign), afflictions — mental and physical health patterns

**Mars** (muscles, blood, inflammation, accidents, surgery, fevers): placement, aspects — injury and energy patterns

**Saturn** (chronic disease, bones, joints, nervous system, skin, teeth, depression): position and chronic tendency analysis

**Rahu** (mysterious illnesses, viral infections, poisons, unusual conditions): position and health domain

**Ketu** (immune disorders, past-life diseases, mysterious ailments, spiritual body): position

For each: what specific body systems and health patterns does its condition reveal?

**DISCLAIMER: Jyotish analysis only — consult medical professionals.**`, ctx) },
      { id: 'h3', title: '3. Disease Patterns & Indicators', prompt: ctx => makePrompt(`Analyze specific health patterns:

**6th house sign disease associations**:
- Aries=head/fevers/inflammation, Taurus=throat/thyroid/neck, Gemini=respiratory/nervous system, Cancer=digestive/stomach/chest
- Leo=heart/spine/ego-related, Virgo=intestinal/digestive/anxiety, Libra=kidney/hormonal/lower back, Scorpio=reproductive/sexual/infection
- Sagittarius=liver/hips/thighs, Capricorn=bones/joints/skin, Aquarius=circulation/nervous/ankles, Pisces=feet/lymphatic/addiction

**Classical health combinations in this chart** — check each:
- Moon + Saturn: chronic melancholy, depression
- Mars + Saturn: accidents, chronic inflammation, blood disorders
- Sun + Rahu: vitality fluctuations, unusual conditions
- Malefics in 8th: longevity and chronic condition concerns
- Mars in 6th: strong immunity but prone to inflammation and accidents

**Mental health indicators**: Moon's condition, Mercury's condition, Jupiter's protective aspect — emotional resilience or fragility

**DISCLAIMER: Jyotish analysis only.**`, ctx) },
      { id: 'h4', title: '4. KP & Dasha Timing for Health', prompt: ctx => makePrompt(`Exhaustive health timing using Jyotish and KP:

**KP Health Analysis**: Report the H1 sub lord, what houses it signifies (H6, H8, H12 = challenge; H1, H5, H11 = vitality), and KP predicted periods for health sensitivity.

**Current Mahadasha**: does it rule 6th/8th/12th (health sensitivity) or 1st/5th/9th (protection and recovery)?
Natural planetary nature for health (Jupiter = protective, Saturn/Rahu = challenging). Overall health verdict for this Mahadasha.

**Current Antardasha**: immediate health conditions. Does it activate disease houses?

**Current Pratyantar**: next few months — health sensitivity or strength?

**Upcoming health-sensitive periods (next 5 years)**: identify each 6th/8th/12th lord activation with dates.

**Recovery and peak vitality periods**: when does health improve and strengthen?

**IMPORTANT: Health dasha timing indicates sensitivity periods requiring vigilance — not certainty of illness.**

**DISCLAIMER: Jyotish analysis only — consult medical professionals.**`, ctx) },
      { id: 'h5', title: '5. Current Health Transits', prompt: ctx => makePrompt(`Current planetary transits for health:

**Saturn transit**: which natal house? If over lagna or Moon = significant health sensitivity. Sade Sati active? Which phase (1st/2nd/3rd)? Duration remaining. Specific health domain affected.

**Jupiter transit**: aspecting lagna or lagna lord? Which house? Protective or neutral? Duration.

**Rahu-Ketu axis**: Rahu over lagna or Moon = mental health pressure, unusual health events.

**Mars transit**: over 6th or 8th = heightened inflammation, accident risk, surgical procedures.

**Net health transit picture**: supportive or stressing? Are dasha and transits aligned (higher impact)?

**Upcoming high-risk transit combinations** in next 6–12 months — name each and its implication.

**DISCLAIMER: Consult medical professionals for health decisions.**`, ctx) },
      { id: 'h6', title: '6. Health — Final Synthesis', prompt: ctx => makePrompt(`Comprehensive final health analysis:

**PART A — Constitutional Profile**
- Overall constitution rating: Robust / Moderately Strong / Moderate / Delicate — with evidence
- Primary body systems to monitor (specific organs, systems based on chart analysis)
- Constitutional strengths (what keeps this person naturally healthy)
- Constitutional vulnerabilities (what creates health sensitivity)

**PART B — Mental Health Profile**
- Moon's condition and emotional baseline
- Chronic emotional tendencies (anxiety, depression, restlessness, stability)
- When is mental health most stable vs most challenged?

**PART C — Timing Predictions**
- **Near term (6 months)**: health conditions [Confidence + Evidence]
- **Medium term (1–3 years)**: sensitive periods, recovery windows [Confidence + Evidence]
- **Long term (3–7 years)**: overall health trajectory

**PART D — Lifestyle Guidance**
- Health practices aligned with this chart's planetary signatures
- Body systems to proactively support
- Lifestyle adjustments suggested by planetary weaknesses
- Optimal timing for medical checkups or procedures
- One immediate health insight

**MANDATORY DISCLAIMER: This is Jyotish analysis for educational and self-awareness purposes only. Not medical advice. Always consult qualified medical professionals for health decisions.**`, ctx) },
    ],
  };
  return defs[type];
}

// ─── Stream engine — bulletproof with 429 handling ────────────────────────────

interface StreamResult {
  outcome: 'done' | 'error' | 'aborted';
  content: string;
}

async function streamSection(
  prompt: string,
  signal: AbortSignal,
  onChunk: (text: string, waitingMsg?: string) => void,
): Promise<StreamResult> {
  const MAX_PASSES = 5;           // up to 5 continuation passes
  const MAX_ATTEMPTS_PER_PASS = 4; // up to 4 retries per pass
  let fullContent = '';

  for (let pass = 0; pass <= MAX_PASSES; pass++) {
    if (signal.aborted) return { outcome: 'aborted', content: fullContent };

    const TAIL = 800;
    const messages =
      pass === 0
        ? [{ role: 'user', content: prompt }]
        : [
            {
              role: 'user',
              content: `You are writing a detailed Jyotish analysis. The response was cut off. Continue EXACTLY from where it stopped — do not repeat anything, do not add a preamble. Here is the last part written:\n\n"...${fullContent.slice(-TAIL)}"\n\nContinue the analysis seamlessly until the section is fully complete.`,
            },
          ];

    let finishReason: string | null = null;
    let passContent = '';
    let passSucceeded = false;

    // Retry loop for rate limits / transient errors
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PASS; attempt++) {
      if (signal.aborted) return { outcome: 'aborted', content: fullContent };

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            messages,
            model: 'meta/llama-3.1-70b-instruct',
            stream: true,
            maxTokens: 4096,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          const status = response.status;

          if (status === 429) {
            // Rate limit — wait before retrying
            const retryAfterHeader = response.headers.get('retry-after');
            const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 45 + attempt * 30;
            const waitMs = waitSec * 1000;
            onChunk(fullContent, `Rate limited — waiting ${waitSec}s before retry…`);
            await new Promise(r => setTimeout(r, waitMs));
            continue; // retry this pass
          }

          if (status >= 500 || status === 503) {
            // Server error — short wait then retry
            const waitSec = 10 + attempt * 15;
            onChunk(fullContent, `Server error (${status}) — waiting ${waitSec}s…`);
            await new Promise(r => setTimeout(r, waitSec * 1000));
            continue;
          }

          // Non-retryable error
          throw new Error(`HTTP ${status}: ${errText}`);
        }

        // Read the stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buf = '';
        finishReason = null;
        passContent = '';

        while (true) {
          if (signal.aborted) { reader.cancel(); break; }
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            const t = line.trim();
            if (!t || t === 'data: [DONE]') continue;
            if (!t.startsWith('data: ')) continue;
            try {
              const json = JSON.parse(t.slice(6));
              const delta: string | undefined = json?.choices?.[0]?.delta?.content;
              const reason: string | null = json?.choices?.[0]?.finish_reason ?? null;
              if (reason) finishReason = reason;
              if (typeof delta === 'string' && delta.length > 0) {
                passContent += delta;
                fullContent += delta;
                onChunk(fullContent);
              }
            } catch { /* skip malformed */ }
          }
        }

        passSucceeded = true;
        break; // exit retry loop — got a good response

      } catch (err) {
        if (signal.aborted) return { outcome: 'aborted', content: fullContent };
        const waitSec = 15 + attempt * 20;
        onChunk(fullContent, `Connection error — waiting ${waitSec}s (attempt ${attempt + 1}/${MAX_ATTEMPTS_PER_PASS})…`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      }
    }

    if (signal.aborted) return { outcome: 'aborted', content: fullContent };

    if (!passSucceeded) {
      // All retries exhausted for this pass
      if (fullContent.length > 0) return { outcome: 'done', content: fullContent };
      return { outcome: 'error', content: fullContent };
    }

    // Natural stop — section complete
    if (finishReason === 'stop' || passContent.length === 0) {
      return { outcome: 'done', content: fullContent };
    }

    // Hit token limit — continue in next pass
    if (pass < MAX_PASSES) {
      onChunk(fullContent, `Continuing (part ${pass + 2})…`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return { outcome: 'done', content: fullContent };
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function downloadAsPDF(
  reportType: ReportType,
  sections: GeneratedSection[],
  profileName: string,
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const meta = REPORT_META[reportType];

  // ── Page helpers ───────────────────────────────────────────────────────────

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Logo drawing (vector palm + ray) ─────────────────────────────────────

  const drawLogo = (x: number, baseY: number, sz: number) => {
    const s = sz / 64;
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(0.3 * s * 4);

    // Life line
    doc.setDrawColor(124, 58, 237);
    const lx = x + 24 * s; const ly = baseY + 16 * s;
    doc.lines([[(-4)*s, (8)*s], [(-1)*s, (8)*s], [(3)*s, (14)*s]], lx, ly);

    // Heart line
    doc.lines([[(7)*s, (-4)*s], [(12)*s, 0], [(10)*s, (2)*s]], x + 17 * s, baseY + 28 * s);

    // Head line
    doc.lines([[(8)*s, (-2)*s], [(10)*s, 0], [(10)*s, (4)*s]], x + 18 * s, baseY + 34 * s);

    // Fate line
    doc.setLineWidth(0.4 * s * 4);
    doc.setDrawColor(124, 58, 237);
    doc.lines([[0, (-6)*s], [(-1)*s, (-4)*s], [(-1)*s, (-6)*s]], x + 32 * s, baseY + 46 * s);

    // Ray (bold, lighter colour)
    doc.setLineWidth(0.55 * s * 4);
    doc.setDrawColor(167, 139, 250);
    doc.line(x + 31 * s, baseY + 30 * s, x + 32 * s, baseY + 8 * s);

    // Star at apex
    doc.setFillColor(167, 139, 250);
    doc.circle(x + 32 * s, baseY + 8 * s, 1.2 * s, 'F');
  };

  // ── Cover header ──────────────────────────────────────────────────────────

  // Background bar
  doc.setFillColor(10, 6, 22);
  doc.rect(0, 0, PAGE_W, 48, 'F');

  // Subtle purple border at base of header
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 47.5, PAGE_W, 0.5, 'F');

  // Logo
  drawLogo(MARGIN, 8, 32);

  // Wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(237, 233, 254); // violet-100
  doc.text('LuckyRay', MARGIN + 36, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(124, 58, 237);
  doc.text('लकीरें  —  Lines on your palm', MARGIN + 36, 29);

  // Report title (right side of header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(237, 233, 254);
  const titleX = PAGE_W - MARGIN;
  doc.text(meta.title, titleX, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(196, 181, 253); // violet-300
  doc.text(`Jyotish & KP Analysis for ${profileName}`, titleX, 28, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(109, 40, 217);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, titleX, 35, { align: 'right' });

  y = 58;

  // ── Sections ──────────────────────────────────────────────────────────────

  const done = sections.filter(s => s.status === 'done' && s.content.length > 0);

  for (const section of done) {
    ensureSpace(20);

    // Section heading
    doc.setFillColor(10, 6, 22);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFillColor(124, 58, 237);
    doc.rect(MARGIN, y, 2, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(196, 181, 253);
    doc.text(section.title, MARGIN + 5, y + 5.5);
    y += 12;

    // Content — strip markdown syntax and render as plain text
    const text = stripMarkdown(section.content);
    const lines = doc.splitTextToSize(text, CONTENT_W);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 196, 220);

    for (const line of lines) {
      ensureSpace(5.5);
      const isBullet = (line as string).trim().startsWith('•');
      const indent = isBullet ? MARGIN + 4 : MARGIN;
      doc.text(line, indent, y);
      y += 5;
    }

    y += 6;

    // Section divider
    ensureSpace(3);
    doc.setDrawColor(40, 20, 80);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 6;
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(10, 6, 22);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(109, 40, 217);
    doc.text('LuckyRay  ·  लकीरें  ·  Jyotish & KP Analysis', MARGIN, PAGE_H - 4);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });
    doc.setTextColor(60, 30, 100);
    doc.text('This report is for self-awareness and educational purposes only. Not professional advice.', MARGIN, PAGE_H - 1);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  doc.save(`luckyray-${reportType}-${profileName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

/** Strip common markdown syntax to plain text suitable for PDF rendering */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')        // bold
    .replace(/\*(.+?)\*/g, '$1')            // italic
    .replace(/^[-*]\s+/gm, '• ')           // list items
    .replace(/`(.+?)`/g, '$1')             // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // links
    .replace(/\n{3,}/g, '\n\n')            // excess newlines
    .trim();
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportType>('career');
  const [reports, setReports] = useState<Partial<Record<ReportType, ReportState>>>({});
  const [sectionStatus, setSectionStatus] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);
  const { addToast } = useAppStore();

  useEffect(() => {
    setLoading(true);
    Promise.all([getProfile(params.profileId), getLatestChart(params.profileId)])
      .then(([p, c]) => {
        if (!p) { setError('Profile not found'); return; }
        setProfile(p);
        if (c) setStoredChart(c);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [params.profileId]);

  const updateSectionContent = useCallback((reportType: ReportType, idx: number, text: string, status?: SectionStatus) => {
    setReports(prev => ({
      ...prev,
      [reportType]: {
        ...prev[reportType]!,
        sections: prev[reportType]!.sections.map((s, i) =>
          i === idx ? { ...s, content: text, ...(status ? { status } : {}) } : s,
        ),
      },
    }));
  }, []);

  const generateReport = useCallback(async (reportType: ReportType) => {
    if (!storedChart?.chart) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const sections = getSections(reportType);
    const gochar = computeCurrentGochar(storedChart.chart.ascendant.signIndex);
    const ctx = buildChartContext(storedChart.chart, reportType, gochar.planets);
    const chartCtx = serializeChartContext(ctx);

    setReports(prev => ({
      ...prev,
      [reportType]: {
        status: 'generating',
        sections: sections.map(s => ({ sectionId: s.id, title: s.title, content: '', status: 'pending' as SectionStatus })),
      },
    }));
    setSectionStatus({});

    for (let i = 0; i < sections.length; i++) {
      if (ctrl.signal.aborted) break;

      // Mark as generating
      setReports(prev => ({
        ...prev,
        [reportType]: {
          ...prev[reportType]!,
          sections: prev[reportType]!.sections.map((s, idx) =>
            idx === i ? { ...s, status: 'generating' as SectionStatus } : s,
          ),
        },
      }));

      const section = sections[i]!;
      const sectionKey = `${reportType}-${i}`;

      const result = await streamSection(
        section.prompt(chartCtx),
        ctrl.signal,
        (fullText, waitMsg) => {
          updateSectionContent(reportType, i, fullText);
          if (waitMsg) {
            setSectionStatus(prev => ({ ...prev, [sectionKey]: waitMsg }));
            // Update section to 'waiting' status for UI
            setReports(prev => ({
              ...prev,
              [reportType]: {
                ...prev[reportType]!,
                sections: prev[reportType]!.sections.map((s, idx) =>
                  idx === i ? { ...s, status: 'waiting' as SectionStatus } : s,
                ),
              },
            }));
          } else {
            setSectionStatus(prev => ({ ...prev, [sectionKey]: '' }));
            setReports(prev => ({
              ...prev,
              [reportType]: {
                ...prev[reportType]!,
                sections: prev[reportType]!.sections.map((s, idx) =>
                  idx === i ? { ...s, status: 'generating' as SectionStatus } : s,
                ),
              },
            }));
          }
        },
      );

      if (result.outcome === 'aborted') break;

      const finalStatus: SectionStatus = result.outcome === 'done' ? 'done' : 'error';
      setReports(prev => ({
        ...prev,
        [reportType]: {
          ...prev[reportType]!,
          sections: prev[reportType]!.sections.map((s, idx) =>
            idx === i ? { ...s, status: finalStatus, content: result.content } : s,
          ),
        },
      }));
      setSectionStatus(prev => ({ ...prev, [sectionKey]: '' }));

      if (result.outcome === 'error') {
        addToast({ type: 'error', message: `Section ${i + 1} failed after all retries.` });
      }

      // Pause between sections — 8s base to respect NVIDIA rate limits
      if (i < sections.length - 1 && !ctrl.signal.aborted) {
        await new Promise(r => setTimeout(r, 8000));
      }
    }

    if (!ctrl.signal.aborted) {
      setReports(prev => ({ ...prev, [reportType]: { ...prev[reportType]!, status: 'done' } }));
    }
  }, [storedChart, addToast, updateSectionContent]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    setReports(prev => {
      const u = { ...prev };
      for (const k of Object.keys(u) as ReportType[]) {
        if (u[k]?.status === 'generating') u[k] = { ...u[k]!, status: 'idle' };
      }
      return u;
    });
  }, []);

  const handleDownloadPDF = useCallback(async (reportType: ReportType) => {
    const state = reports[reportType];
    if (!state || !profile) return;
    addToast({ type: 'info', message: 'Generating PDF…' });
    try {
      await downloadAsPDF(reportType, state.sections, profile.name);
      addToast({ type: 'success', message: 'PDF downloaded' });
    } catch (e) {
      addToast({ type: 'error', message: 'PDF generation failed' });
    }
  }, [reports, profile, addToast]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton lines={8} />
            </div>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <div className="p-6">
              <ErrorCard title="Profile not found" message="This profile may have been deleted." />
            </div>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  const chart = storedChart?.chart;
  const currentReport = reports[selectedReport];
  const isGenerating = currentReport?.status === 'generating';
  const isDone = currentReport?.status === 'done';
  const completedSections = currentReport?.sections.filter(s => s.status === 'done').length ?? 0;
  const totalSections = currentReport?.sections.length ?? 6;

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout className="overflow-hidden">
          <PageHeader
            title="Jyotish Reports"
            description={profile.name}
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label="Back">
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
            actions={
              isDone ? (
                <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(selectedReport)}>
                  <Download size={14} className="mr-1.5" /> Download PDF
                </Button>
              ) : undefined
            }
          />

          {!chart ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-content-muted text-sm">No chart generated yet.</p>
                <Link href={`/chart/${profile.id}`}>
                  <Button variant="primary">Generate Chart First</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Report type tabs */}
              <div className="flex border-b border-surface-border shrink-0 overflow-x-auto">
                {REPORT_TYPES.map(type => {
                  const meta = REPORT_META[type];
                  const state = reports[type];
                  const isActive = selectedReport === type;

                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedReport(type)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 border-b-2 text-sm whitespace-nowrap transition-colors -mb-px',
                        isActive
                          ? 'border-accent text-accent'
                          : 'border-transparent text-content-muted hover:text-content',
                      )}
                    >
                      <span className={isActive ? 'text-accent' : 'text-content-subtle'}>
                        {meta.icon}
                      </span>
                      <span className="font-medium">{meta.title}</span>
                      {state?.status === 'done' && <CheckCircle2 size={12} className="text-green-500" />}
                      {state?.status === 'generating' && <Loader2 size={12} className="animate-spin text-accent" />}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="max-w-3xl mx-auto p-6 space-y-4">
                  {/* Controls row */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-content">{REPORT_META[selectedReport].title}</h2>
                      {isGenerating && (
                        <p className="text-xs text-content-muted mt-0.5">
                          Section {completedSections + 1}/{totalSections} — auto-continues if cut off · retries on rate limit
                        </p>
                      )}
                      {isDone && (
                        <p className="text-xs text-content-muted mt-0.5">{completedSections} sections complete</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isGenerating ? (
                        <Button variant="ghost" size="sm" onClick={cancelGeneration}>Cancel</Button>
                      ) : (
                        <Button
                          variant={currentReport ? 'ghost' : 'primary'}
                          size="sm"
                          onClick={() => generateReport(selectedReport)}
                        >
                          {currentReport
                            ? <><RefreshCw size={13} className="mr-1.5" /> Regenerate</>
                            : <><Play size={13} className="mr-1.5" /> Generate</>}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  {isGenerating && (
                    <div className="h-1 rounded-full bg-surface-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-700"
                        style={{ width: `${(completedSections / totalSections) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Empty state */}
                  {!currentReport && (
                    <div className="rounded-xl border border-dashed border-surface-border bg-surface-elevated p-10 text-center space-y-3">
                      <div className="flex justify-center"><LuckyRayLogo size={48} /></div>
                      <p className="text-sm font-medium text-content">{REPORT_META[selectedReport].title} Report</p>
                      <p className="text-xs text-content-muted max-w-sm mx-auto leading-relaxed">
                        6 deep sections — natal architecture, yogas, KP promise analysis, dasha timing
                        (MD → AD → Pratyantar), transits, and final predictions with confidence levels.
                        Auto-continues and retries — will not stop until complete.
                      </p>
                      <Button variant="primary" onClick={() => generateReport(selectedReport)}>
                        <Play size={14} className="mr-1.5" /> Generate Report
                      </Button>
                    </div>
                  )}

                  {/* Sections */}
                  {currentReport && (
                    <div className="space-y-3">
                      {currentReport.sections.map((section, idx) => (
                        <SectionCard
                          key={section.sectionId}
                          section={section}
                          statusMsg={sectionStatus[`${selectedReport}-${idx}`] ?? ''}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ section, statusMsg }: { section: GeneratedSection; statusMsg: string }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (section.status === 'done') setExpanded(true);
  }, [section.status]);

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      section.status === 'done'      ? 'border-surface-border bg-surface-elevated' :
      section.status === 'generating' ? 'border-accent-muted/50 bg-accent-subtle/10' :
      section.status === 'waiting'   ? 'border-amber-800/40 bg-amber-950/10' :
      section.status === 'error'     ? 'border-red-900/30 bg-red-950/10' :
      'border-surface-border bg-surface opacity-40',
    )}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => section.status === 'done' && setExpanded(e => !e)}
        disabled={section.status !== 'done'}
      >
        <StatusIcon status={section.status} />
        <span className={cn(
          'flex-1 text-xs font-semibold',
          section.status === 'done'       ? 'text-content' :
          section.status === 'generating' ? 'text-accent' :
          section.status === 'waiting'    ? 'text-amber-400' :
          'text-content-muted',
        )}>
          {section.title}
        </span>
        {section.status === 'waiting' && statusMsg && (
          <span className="text-2xs text-amber-500 flex items-center gap-1">
            <Clock size={10} /> {statusMsg}
          </span>
        )}
        {section.status === 'done' && (
          <ChevronDown size={13} className={cn(
            'text-content-subtle flex-shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )} />
        )}
      </button>

      {/* Live preview while generating */}
      {(section.status === 'generating' || section.status === 'waiting') && section.content.length > 0 && (
        <div className="px-4 pb-4 border-t border-accent-muted/20">
          <p className="text-2xs text-accent mb-2">
            {section.status === 'waiting' ? `⏳ ${statusMsg}` : 'Writing…'}
          </p>
          <div className="text-xs text-content-muted leading-relaxed line-clamp-4 opacity-70 whitespace-pre-wrap">
            {section.content.slice(-500)}
          </div>
        </div>
      )}

      {(section.status === 'generating' || section.status === 'waiting') && section.content.length === 0 && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-accent-muted/20">
          {section.status === 'waiting'
            ? <AlertCircle size={11} className="text-amber-500" />
            : [0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i*150}ms` }} />
              ))
          }
          <span className="text-2xs text-content-muted">{statusMsg || 'Analyzing…'}</span>
        </div>
      )}

      {/* Done — expanded markdown content */}
      {expanded && section.status === 'done' && (
        <div className="px-5 pb-5 border-t border-surface-border">
          <div className="mt-4 prose prose-sm prose-invert max-w-none
            prose-headings:text-accent prose-headings:font-semibold prose-headings:text-sm
            prose-strong:text-content prose-strong:font-semibold
            prose-li:text-content-muted prose-li:leading-relaxed
            prose-p:text-content-muted prose-p:leading-relaxed prose-p:text-sm
            prose-code:text-accent prose-code:bg-accent-subtle/20 prose-code:rounded prose-code:px-1
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Error */}
      {section.status === 'error' && (
        <div className="px-4 pb-3 border-t border-red-900/20">
          <p className="text-2xs text-red-400 mt-2">
            Section failed after all retry attempts. Try regenerating the report.
          </p>
          {section.content && (
            <div className="mt-2 text-xs text-content-muted leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === 'done')       return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />;
  if (status === 'generating') return <Loader2 size={14} className="text-accent animate-spin flex-shrink-0" />;
  if (status === 'waiting')    return <Clock size={14} className="text-amber-400 flex-shrink-0" />;
  if (status === 'error')      return <AlertCircle size={14} className="text-red-500 flex-shrink-0" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-surface-border flex-shrink-0" />;
}
