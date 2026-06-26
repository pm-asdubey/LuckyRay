'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart, ChartContext } from '@luckyray/shared';
import { buildChartContext, serializeChartContext } from '@luckyray/ai';
import { computeCurrentGochar } from '@luckyray/jyotish';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Report Types ─────────────────────────────────────────────────────────────

type ReportType = 'career' | 'love' | 'wealth' | 'health';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  sections: ReportSection[];
}

interface ReportSection {
  id: string;
  title: string;
  prompt: (ctx: string) => string;
}

interface GeneratedSection {
  sectionId: string;
  title: string;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

// ─── Report Configurations ────────────────────────────────────────────────────

function buildReportPrompt(instruction: string, chartCtx: string): string {
  return `${instruction}

---
IMPORTANT RULES FOR THIS SECTION:
- Cite specific chart data (house, planet, sign, degree) for every statement
- State confidence level (HIGH / MEDIUM / LOW) for every prediction
- Focus on correctness — do NOT soften negative indicators
- Use the full dasha analysis: Mahadasha → Antardasha → Pratyantar
- Include Gochar (transit) impact
- Be specific about timing windows, not vague ("might happen someday")
- Keep this section to 300-400 words

Chart Data:
${chartCtx}`;
}

function getReportConfigs(chartCtx: string): ReportConfig[] {
  return [
    {
      id: 'career',
      title: 'Career & Profession',
      description: 'Deep analysis of career potential, timing, and professional path',
      icon: '💼',
      sections: [
        {
          id: 'career-natal',
          title: '1. Natal Career Indicators',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 1 of a Career Report for Jyotish analysis.

Analyze the natal chart career indicators:
- 10th house (karma, profession): its sign, lord, occupants, and aspects received
- 6th house (service, employment): its condition and lord's placement
- 2nd house (income, accumulated wealth): its condition
- 11th house (gains, fulfillment of desires): its condition
- Analyze whether the 10th lord is well-placed by sign, house, and aspects
- Discuss any planets in the 10th house and their impact on career
- Identify what career fields are indicated by the 10th house sign and its lord

Focus only on natal placements. No dasha analysis in this section.`,
            ctx,
          ),
        },
        {
          id: 'career-planets',
          title: '2. Career Significators',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 2 of a Career Report — Career Significator Planets.

Analyze these key career planets from the natal chart:
- Sun: authority, government, leadership capacity
- Saturn: discipline, persistence, fields indicated (law, construction, labor, etc.)
- Mercury: intellect, communication, business, analytical roles
- Mars: energy, initiative, engineering, military, sports
- Jupiter: wisdom, teaching, management, finance

For each planet relevant to this chart:
1. Its sign and house placement
2. Its strength (exalted, own sign, friendly, neutral, enemy, debilitated)
3. Aspects it receives (beneficial vs malefic)
4. What career domains it activates for this person specifically

Also note which planet is the natural career significator (Sun for authority, Saturn for profession in general) and its condition.`,
            ctx,
          ),
        },
        {
          id: 'career-yogas',
          title: '3. Career Yogas & Combinations',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 3 of a Career Report — Yogas affecting Career.

Analyze yogas and combinations that impact career from the supplied chart data:
- Raja Yogas (if present): which ones, their strength, and career implications
- Dharma-Karmadhipati Yoga (9th lord + 10th lord relationship)
- Pancha Mahapurusha Yogas present (Sasha, Ruchaka, Hamsa, Malavya, Bhadra) and their career implications
- Any Neecha Bhanga (cancellation of debilitation) affecting career planets
- Any mutual aspect or conjunction between career planets

Also analyze:
- Is the 10th lord in a dusthana (6/8/12)? What does this indicate?
- Is there any exchange (Parivartana) involving career houses?
- What is the overall strength of the career sector in this chart?

Conclude with an overall career strength assessment: strong, moderate, or weak, with evidence.`,
            ctx,
          ),
        },
        {
          id: 'career-dasha',
          title: '4. Dasha Timing for Career',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 4 of a Career Report — Dasha Timing Analysis.

Using the current Mahadasha, Antardasha, and Pratyantar Dasha periods, analyze:

1. Current Mahadasha lord:
   - Is this planet a career benefic or malefic for this chart?
   - Which house does it rule? Which house does it occupy?
   - What career themes does it activate?

2. Current Antardasha lord:
   - Its relationship with the Mahadasha lord (friend/enemy/neutral)
   - Its impact on career specifically (house rulership, occupation, aspects)

3. Current Pratyantar lord:
   - Immediate conditions for career in the next few weeks/months
   - Whether it supports or challenges career momentum

4. Upcoming periods (next 1-3 years):
   - Which planets take over, and whether they are favorable for career
   - Expected career events or shifts based on dasha sequence

State confidence levels (HIGH/MEDIUM/LOW) for each timing statement and explain why.`,
            ctx,
          ),
        },
        {
          id: 'career-gochar',
          title: '5. Current Transits (Gochar)',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 5 of a Career Report — Gochar (Transit) Analysis.

Using the current Gochar (transit) data provided in the chart context, analyze:

1. Saturn's current transit:
   - Which natal house is Saturn transiting?
   - Is this favorable or unfavorable for career?
   - How long will this transit last approximately?

2. Jupiter's current transit:
   - Which natal house is Jupiter transiting?
   - Career implications of this transit

3. Rahu-Ketu axis:
   - Which natal houses are Rahu and Ketu transiting?
   - What disruptions or opportunities does this axis indicate for career?

4. Combined transit + dasha assessment:
   - Do the current transits reinforce or contradict the dasha indications?
   - What is the net effect on career prospects right now?

State confidence levels and timing for each observation.`,
            ctx,
          ),
        },
        {
          id: 'career-synthesis',
          title: '6. Final Career Analysis',
          prompt: (ctx) => buildReportPrompt(
            `You are generating the FINAL SYNTHESIS section of a Career Report.

Integrate ALL the previous analysis into a comprehensive career assessment:

1. Overall career strength in this chart (strong/moderate/weak) — with evidence
2. Most suitable career fields/domains based on 10th house, yogas, and planet conditions
3. Key career strengths (specific planetary factors that support success)
4. Key career challenges (specific planetary factors that create obstacles)
5. Timing predictions with confidence levels:
   - When is the peak career period in the near future?
   - Are there any career disruptions expected? When?
   - What is the trajectory over the next 3-5 years?
6. Specific actionable guidance based on the chart (not generic advice)

For EVERY prediction, state: (HIGH confidence), (MEDIUM confidence), or (LOW confidence) and briefly explain the evidence.

Be honest about limitations. If the chart shows a difficult period, say so clearly. This person deserves accurate analysis, not false comfort.`,
            ctx,
          ),
        },
      ],
    },
    {
      id: 'love',
      title: 'Love & Marriage',
      description: 'Relationship patterns, marriage timing, and compatibility factors',
      icon: '❤️',
      sections: [
        {
          id: 'love-natal',
          title: '1. Natal Relationship Indicators',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 1 of a Love & Marriage Report.

Analyze natal chart relationship indicators:
- 7th house (marriage, partnerships): its sign, lord, occupants, and aspects received
- 5th house (romance, love affairs): its condition and lord
- 2nd house (family, family building): its condition
- 11th house (fulfillment of desires, social connections): its condition
- Upapada Lagna (UL) if derivable from data, or comment on the 7th lord's placement

Analyze whether the 7th lord is well-placed, afflicted, or strong. Discuss what the 7th house sign indicates about the spouse's nature and the type of relationship.

Focus only on natal placements. No dasha analysis yet.`,
            ctx,
          ),
        },
        {
          id: 'love-planets',
          title: '2. Relationship Planets',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 2 of a Love & Marriage Report — Key Planets for Relationships.

Analyze these planets for relationship/marriage:
- Venus: the prime significator of marriage and love; its sign, house, strength, aspects
- Moon: emotional nature and receptivity; conditions for emotional fulfillment
- Mars: desire, passion, sexuality; its condition and relationship to Venus
- Jupiter: natural significator of husband (for female charts); its condition
- Rahu: unconventional relationships, foreign spouse indicators

For each:
1. Sign and house placement
2. Strength and dignity
3. Aspects from benefics or malefics
4. What it indicates about relationship patterns

Also assess: Is there mutual aspectual relationship between Venus and Mars? Between Moon and Venus? These are key for love life.`,
            ctx,
          ),
        },
        {
          id: 'love-yogas',
          title: '3. Marriage Yogas & Doshas',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 3 of a Love & Marriage Report — Yogas and Doshas.

Analyze relationship yogas and doshas from the supplied chart data:
- Manglik Dosha (if detected): its severity and whether it has cancellations
- Any marriage-related Raja Yogas (7th lord involvement)
- Kuja Dosha cancellations (if Manglik is present)
- Parivartana Yoga between 5th and 7th lords
- Any affliction to Venus by Saturn, Rahu, or Mars (and implications)
- Graha Drishti on the 7th house from malefics

Also check:
- Multiple marriages indicators (if any)
- Divorce indicators (if any) — be honest but not alarmist
- Celibacy or spiritual path indicators

Conclude with overall relationship strength: favorable, neutral, or challenging.`,
            ctx,
          ),
        },
        {
          id: 'love-dasha',
          title: '4. Marriage Timing via Dasha',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 4 of a Love & Marriage Report — Dasha Timing.

Analyze marriage timing through the dasha system:

1. Current Mahadasha: Does the Mahadasha lord activate the 7th house or its lord? Is marriage likely during this period?

2. Current Antardasha: Does the Antardasha lord activate marriage? What is its relationship to Venus or the 7th house?

3. Current Pratyantar: Immediate conditions for romance/marriage in the next few months.

4. Upcoming periods: Which upcoming dashas (next 1-5 years) are marriage-triggering? Look for:
   - 7th lord's dasha
   - Venus dasha/antardasha
   - Any planet in the 7th house becoming active
   - Dasha of the Atmakaraka or Darakaraka if identifiable from data

State specific windows: "marriage is more likely during [period] (MEDIUM confidence) because [evidence]".`,
            ctx,
          ),
        },
        {
          id: 'love-gochar',
          title: '5. Current Transits for Marriage',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 5 of a Love & Marriage Report — Gochar Analysis.

Analyze current transits for marriage/relationships:

1. Jupiter's transit over the 7th house or its lord — a classic marriage trigger
2. Saturn's transit through relationship houses (5th, 7th, 11th) — delays or stability?
3. Rahu-Ketu axis impact on relationship houses
4. Venus and Mars current transit positions — immediate romantic energy

Combined assessment:
- Are current transits supporting or delaying marriage?
- Any specific upcoming transit events (e.g., Jupiter entering a favorable sign) to watch?
- How do transits interact with the current dasha period?

State confidence levels and approximate timing windows.`,
            ctx,
          ),
        },
        {
          id: 'love-synthesis',
          title: '6. Final Marriage & Love Analysis',
          prompt: (ctx) => buildReportPrompt(
            `You are generating the FINAL SYNTHESIS of a Love & Marriage Report.

Provide a comprehensive, honest assessment:

1. Overall relationship potential in this chart (strong/moderate/challenging) with evidence
2. Ideal partner qualities indicated by the 7th house sign and lord
3. Relationship patterns (tendency toward passionate, stable, unconventional, etc.)
4. Marriage timing — your best assessment of when marriage is most likely:
   - Primary window (HIGH confidence)
   - Secondary window (MEDIUM confidence)
5. Key challenges in relationships this person should be aware of (be specific)
6. Key strengths in relationships
7. Specific actionable guidance based on chart patterns

For ALL predictions: state (HIGH), (MEDIUM), or (LOW) confidence with evidence. Do not make up convenient conclusions — if the chart has delays, state them clearly.`,
            ctx,
          ),
        },
      ],
    },
    {
      id: 'wealth',
      title: 'Wealth & Finance',
      description: 'Financial potential, wealth timing, and investment patterns',
      icon: '💰',
      sections: [
        {
          id: 'wealth-natal',
          title: '1. Natal Wealth Indicators',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 1 of a Wealth & Finance Report.

Analyze natal chart wealth indicators:
- 2nd house (accumulated wealth, savings): sign, lord, occupants, aspects
- 11th house (income, gains): sign, lord, and its strength
- 5th house (investments, speculation, intellect): its condition
- 8th house (inheritance, sudden gains, transformations): its condition
- 9th house (luck, fortune): its condition

Identify the overall wealth potential. Are the money houses (2nd, 11th) strong and well-supported, or are they afflicted?

Also check:
- What does the 2nd lord's placement indicate about the source of wealth?
- What does the 11th lord's placement indicate about income channels?

No dasha analysis yet.`,
            ctx,
          ),
        },
        {
          id: 'wealth-planets',
          title: '2. Wealth Significator Planets',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 2 of a Wealth & Finance Report — Significator Planets.

Analyze key wealth planets:
- Jupiter: natural wealth significator; its sign, house, strength, and aspects
- Venus: luxury, material abundance; its condition
- Mercury: business, trade, financial intellect; its condition
- Moon: mind, liquid assets, fluctuation of wealth; its condition
- Saturn: hard work, slow but steady accumulation; its condition

For each:
1. Sign and house (does it have wealth-related rulership?)
2. Strength (exalted, own, friendly, neutral, enemy, debilitated)
3. Aspects — are wealth significators strengthened by benefics or weakened by malefics?
4. What wealth pattern does each indicate?

Also: Is Jupiter aspecting the 2nd or 11th house? Is Venus well-placed? These are key.`,
            ctx,
          ),
        },
        {
          id: 'wealth-yogas',
          title: '3. Dhana Yogas & Wealth Combinations',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 3 of a Wealth & Finance Report — Yogas.

Analyze wealth-related yogas from the supplied chart data:
- Dhana Yogas (2nd/11th lord combinations): identify any present
- Lakshmi Yoga (9th lord strong, Venus strong)
- Raja Yoga activation that includes 2nd/11th houses
- Panchamahapurusha Yogas and their financial implications
- Any malefic impact on Dhana houses (2nd, 11th) that breaks or weakens yogas

Also analyze:
- Is there a Viparita Raja Yoga (lord of 6/8/12 in another dusthana) — this can paradoxically give wealth
- Are there any planetary exchanges (Parivartana) involving wealth houses?

Conclude with overall wealth yoga strength: excellent, good, moderate, or weak.`,
            ctx,
          ),
        },
        {
          id: 'wealth-dasha',
          title: '4. Wealth Timing via Dasha',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 4 of a Wealth & Finance Report — Dasha Timing.

Analyze wealth accumulation timing through the dasha system:

1. Current Mahadasha: Is this planet a wealth-activating planet for this chart? Does it rule or occupy 2nd/11th?

2. Current Antardasha: Its financial implications — does it support or restrict wealth flow?

3. Current Pratyantar: Immediate financial conditions in the next few weeks/months.

4. Upcoming wealth periods: Which upcoming dashas will activate wealth houses most strongly?

Identify:
- Peak wealth accumulation periods (next 5-10 years)
- Periods of financial difficulty or expenditure
- Whether current period is favorable for investments, business ventures, or saving

State (HIGH/MEDIUM/LOW) confidence and provide evidence for timing claims.`,
            ctx,
          ),
        },
        {
          id: 'wealth-gochar',
          title: '5. Current Transits for Finance',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 5 of a Wealth & Finance Report — Gochar Analysis.

Analyze current transits for wealth and finance:

1. Jupiter's transit: Is it over a natal wealth house (2, 5, 9, 11)? Jupiter's transit over 11th is highly favorable for income.

2. Saturn's transit: Is it creating financial delays or discipline? Which wealth house is it transiting?

3. Rahu-Ketu: Rahu over 2nd or 11th can create sudden gains or unconventional income sources.

4. Current period assessment: Are transits supporting financial growth or creating restrictions?

5. Short-term financial windows: Any upcoming transit events that signal financial improvement or caution?

State confidence levels for all transit observations.`,
            ctx,
          ),
        },
        {
          id: 'wealth-synthesis',
          title: '6. Final Wealth Analysis',
          prompt: (ctx) => buildReportPrompt(
            `You are generating the FINAL SYNTHESIS of a Wealth & Finance Report.

Comprehensive, honest wealth assessment:

1. Overall financial potential rating (excellent/good/moderate/challenging) with evidence
2. Primary sources of wealth indicated by the chart (service, business, inheritance, investments, etc.)
3. Financial strengths (specific indicators that support wealth creation)
4. Financial challenges (specific indicators of obstacles, delays, losses, or overspending)
5. Best financial strategies for this chart (what the planets indicate works best)
6. Peak wealth periods in the next 5-10 years with confidence levels
7. Periods to be cautious (financially challenging periods) with evidence

For ALL predictions: state (HIGH), (MEDIUM), or (LOW) confidence. If the chart shows financial difficulties, state them honestly. Accurate analysis serves the person better than false optimism.`,
            ctx,
          ),
        },
      ],
    },
    {
      id: 'health',
      title: 'Health & Vitality',
      description: 'Constitutional health, disease patterns, and health timing',
      icon: '🏥',
      sections: [
        {
          id: 'health-natal',
          title: '1. Constitution & Vital Force',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 1 of a Health & Vitality Report.

Analyze constitutional health indicators from the natal chart:
- Lagna (1st house): overall vitality and physical constitution; its lord's strength
- Lagna lord: its placement, sign, aspects — this governs the physical body
- 6th house (diseases, illness): its sign, lord, occupants — what diseases are indicated?
- 8th house (chronic conditions, longevity): its condition
- 12th house (hospitalization, confinement, hidden ailments): its condition

Analyze overall physical strength:
- Is the Lagna lord strong (own sign, exalted, well-aspected)?
- Are there malefics in the 1st house (affecting vitality)?
- What body parts or organ systems are indicated as vulnerable by the 6th house sign?

Note: Never make a health diagnosis. Frame all analysis as Jyotish indicators, not medical conclusions.`,
            ctx,
          ),
        },
        {
          id: 'health-planets',
          title: '2. Health Significator Planets',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 2 of a Health & Vitality Report — Planet Health Significators.

Analyze key health planets:
- Sun: vitality, heart, right eye, bones; its condition
- Moon: mind, emotions, blood, left eye, lungs; its condition
- Mars: accidents, surgery, inflammation, blood; its condition
- Saturn: chronic illness, teeth, bones, nervous system, arthritis; its condition
- Rahu: unusual diseases, poisons, inflammation; its condition
- Ketu: mysterious ailments, liberation/detachment, spiritual health; its condition

For each:
1. Sign and house placement
2. Strength and dignity
3. Which house(s) it rules (if it rules 6/8/12, it's more health-significant)
4. What health domains it governs for this specific chart
5. Aspects from malefics that stress this planet's health domain

Important: Note which planets rule or occupy the 6th house — these are primary disease indicators.`,
            ctx,
          ),
        },
        {
          id: 'health-doshas',
          title: '3. Disease Patterns & Doshas',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 3 of a Health & Vitality Report — Disease Patterns.

From the supplied chart data, analyze:

1. Detected Doshas: If any doshas are present in the chart, what are their health implications?

2. 6th house analysis: What diseases are classically associated with the 6th house sign in this chart?

3. Planetary combinations indicating health issues:
   - Saturn + Moon: mental health, depression, fear
   - Mars + Moon: blood disorders, accidents
   - Saturn in Lagna: chronic ailments, slow metabolism
   - Rahu in 6th/8th: unusual or misdiagnosed conditions
   - Ketu in 1st/8th: mysterious ailments

4. Mental health: Moon's condition (strength, afflictions) and its impact on mental wellbeing

5. Overall health assessment: Is this a robust constitution or one requiring care?

Disclaimer: All of this is Jyotish analysis, not medical advice.`,
            ctx,
          ),
        },
        {
          id: 'health-dasha',
          title: '4. Health Timing via Dasha',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 4 of a Health & Vitality Report — Dasha Timing for Health.

Analyze health timing through the dasha system:

1. Current Mahadasha: Does the Mahadasha lord rule or occupy 6/8/12 houses? If so, health vigilance is needed. If it rules 1/5/9, vitality is supported.

2. Current Antardasha: Its impact on health specifically — does it activate health houses?

3. Current Pratyantar: Immediate health conditions in the coming weeks/months.

4. Upcoming health-sensitive periods: Identify periods where 6th/8th/12th house lords become active in dasha, requiring health attention.

5. Health recovery periods: Identify periods ruled by planets that support 1st house or Lagna lord — these are good for recovery and vitality.

State (HIGH/MEDIUM/LOW) confidence for all health timing observations. Emphasize that health timing in Jyotish indicates periods requiring vigilance, not certainty of illness.`,
            ctx,
          ),
        },
        {
          id: 'health-gochar',
          title: '5. Current Health Transits',
          prompt: (ctx) => buildReportPrompt(
            `You are generating Section 5 of a Health & Vitality Report — Gochar Health Analysis.

Analyze current transits for health:

1. Saturn's transit: Is it over the natal Lagna, Moon, or Sun? This is health-significant. Sade Sati (Saturn over 12th, 1st, 2nd from Moon) periods require health attention.

2. Jupiter's transit: Is it aspecting the Lagna or Lagna lord? Jupiter's 5th and 9th aspect on key health houses protects health.

3. Rahu-Ketu axis: Are they transiting through health-sensitive natal houses (6/8/12)?

4. Mars transit: Mars moving through 6/8/12 from natal Moon can trigger health events.

5. Overall transit health picture: Are transits currently supporting or stressing health?

Include whether Sade Sati is active (from the natal Moon sign and Saturn's current position).`,
            ctx,
          ),
        },
        {
          id: 'health-synthesis',
          title: '6. Final Health Analysis',
          prompt: (ctx) => buildReportPrompt(
            `You are generating the FINAL SYNTHESIS of a Health & Vitality Report.

Comprehensive health assessment:

1. Overall constitutional strength (robust/moderate/delicate) with evidence from natal chart

2. Primary areas of health vulnerability indicated by the chart:
   - Which body systems/organs require the most attention?
   - What are the dominant health themes in this chart?

3. Mental health profile: Moon's condition and its impact on emotional and psychological wellbeing

4. Health strengths: What planetary factors protect health and vitality?

5. Sensitive health periods in the next 3-5 years with confidence levels:
   - When should this person be most careful about health?
   - When are recovery and good health most supported?

6. Specific preventive guidance based on chart patterns (e.g., "Saturn's placement suggests discipline in bone health, dental care, and managing stress")

7. Overall health outlook over the next 5 years

For ALL predictions: state (HIGH), (MEDIUM), or (LOW) confidence with evidence.

Disclaimer: This is Jyotish analysis only. Always consult medical professionals for health decisions.`,
            ctx,
          ),
        },
      ],
    },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { addToast } = useAppStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        getProfile(params.profileId),
        getLatestChart(params.profileId),
      ]);
      if (!p) { setError('Profile not found'); return; }
      setProfile(p);
      if (c) setStoredChart(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [params.profileId]);

  useEffect(() => { load(); }, [load]);

  const startReport = useCallback(async (reportType: ReportType) => {
    if (!storedChart?.chart || isGenerating) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const configs = getReportConfigs('');
    const config = configs.find(r => r.id === reportType)!;
    const gochar = computeCurrentGochar(storedChart.chart.ascendant.signIndex);
    const ctx = buildChartContext(storedChart.chart, reportType, gochar.planets);
    const chartCtx = serializeChartContext(ctx);
    const configs2 = getReportConfigs(chartCtx);
    const config2 = configs2.find(r => r.id === reportType)!;

    setActiveReport(reportType);
    setIsGenerating(true);

    const sections: GeneratedSection[] = config2.sections.map(s => ({
      sectionId: s.id,
      title: s.title,
      content: '',
      status: 'pending',
    }));
    setGeneratedSections(sections);

    for (let i = 0; i < config2.sections.length; i++) {
      if (ctrl.signal.aborted) break;

      const section = config2.sections[i]!;

      setGeneratedSections(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'generating' } : s,
      ));

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: [{ role: 'user', content: section.prompt(chartCtx) }],
            model: 'meta/llama-3.1-70b-instruct',
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content ?? 'No response received.';

        setGeneratedSections(prev => prev.map((s, idx) =>
          idx === i ? { ...s, content, status: 'done' } : s,
        ));

        // Rate limit: wait 2.5s between calls (NVIDIA NIM allows ~20 req/min)
        if (i < config2.sections.length - 1) {
          await new Promise(r => setTimeout(r, 2500));
        }
      } catch (err) {
        if (ctrl.signal.aborted) break;
        const errMsg = err instanceof Error ? err.message : 'Generation failed';
        setGeneratedSections(prev => prev.map((s, idx) =>
          idx === i ? { ...s, content: `Error: ${errMsg}`, status: 'error' } : s,
        ));
        addToast({ type: 'error', message: `Section failed: ${errMsg}` });
      }
    }

    setIsGenerating(false);
  }, [storedChart, isGenerating, addToast]);

  const cancelReport = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const downloadReport = useCallback(() => {
    if (!activeReport || generatedSections.length === 0) return;
    const configs = getReportConfigs('');
    const config = configs.find(r => r.id === activeReport)!;

    const text = [
      `# ${config.title} Report`,
      `## ${profile?.name ?? 'Jyotish Analysis'}`,
      `Generated by LuckyRay · ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
      '',
      '---',
      '',
      ...generatedSections
        .filter(s => s.status === 'done')
        .flatMap(s => [`## ${s.title}`, '', s.content, '', '---', '']),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luckyray-${activeReport}-report-${profile?.name?.replace(/\s+/g, '-') ?? 'chart'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Report downloaded' });
  }, [activeReport, generatedSections, profile, addToast]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-32" /><Skeleton className="h-32" />
                <Skeleton className="h-32" /><Skeleton className="h-32" />
              </div>
            </PageContent>
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
            <PageContent>
              <ErrorCard title="Profile not found" message="This profile may have been deleted." onRetry={load} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  const chart = storedChart?.chart;
  const reportConfigs = getReportConfigs('');
  const allDone = generatedSections.length > 0 && generatedSections.every(s => s.status === 'done' || s.status === 'error');
  const completedCount = generatedSections.filter(s => s.status === 'done').length;

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
                <Button variant="icon" size="sm" aria-label="Back to chart">
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
            actions={
              allDone && (
                <Button variant="secondary" size="sm" onClick={downloadReport}>
                  <Download size={14} />
                  Download Report
                </Button>
              )
            }
          />

          <div className="flex-1 overflow-auto pb-24 md:pb-0">
            <PageContent className="max-w-3xl space-y-6">
              {!chart ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <p className="text-content-muted text-sm">No chart generated yet.</p>
                  <Link href={`/chart/${profile.id}`}>
                    <Button variant="primary">Generate Chart First</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Report type selection */}
                  <div>
                    <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-3">
                      Select a Report
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      {reportConfigs.map(config => (
                        <ReportCard
                          key={config.id}
                          config={config}
                          isActive={activeReport === config.id}
                          isGenerating={isGenerating && activeReport === config.id}
                          onSelect={() => {
                            if (!isGenerating) startReport(config.id);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Generation progress */}
                  {activeReport && generatedSections.length > 0 && (
                    <div className="space-y-3">
                      {/* Progress header */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-content">
                            {reportConfigs.find(r => r.id === activeReport)?.title} Report
                          </div>
                          <div className="text-2xs text-content-muted">
                            {isGenerating
                              ? `Generating section ${completedCount + 1} of ${generatedSections.length}…`
                              : allDone
                                ? `Complete — ${completedCount} sections`
                                : 'Paused'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {allDone && (
                            <Button variant="secondary" size="sm" onClick={downloadReport}>
                              <Download size={13} />
                              Download
                            </Button>
                          )}
                          {isGenerating && (
                            <Button variant="ghost" size="sm" onClick={cancelReport}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${(completedCount / generatedSections.length) * 100}%` }}
                        />
                      </div>

                      {/* Sections */}
                      <div className="space-y-2">
                        {generatedSections.map(section => (
                          <ReportSectionCard key={section.sectionId} section={section} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </PageContent>
          </div>
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReportCard({
  config,
  isActive,
  isGenerating,
  onSelect,
}: {
  config: ReportConfig;
  isActive: boolean;
  isGenerating: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={isGenerating}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
        'hover:border-accent-muted hover:bg-accent-subtle/20',
        isActive
          ? 'border-accent-muted bg-accent-subtle/30'
          : 'border-surface-border bg-surface-elevated',
        isGenerating && 'opacity-60 cursor-not-allowed',
      )}
    >
      <span className="text-2xl" aria-hidden="true">{config.icon}</span>
      <div>
        <div className="text-sm font-semibold text-content">{config.title}</div>
        <div className="text-2xs text-content-muted mt-0.5 leading-relaxed">{config.description}</div>
      </div>
      {isActive && isGenerating && (
        <Badge variant="accent">Generating…</Badge>
      )}
    </button>
  );
}

function ReportSectionCard({ section }: { section: GeneratedSection }) {
  const [expanded, setExpanded] = useState(section.status === 'generating' || section.status === 'done');

  useEffect(() => {
    if (section.status === 'done') setExpanded(true);
    if (section.status === 'generating') setExpanded(true);
  }, [section.status]);

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      section.status === 'done' ? 'border-surface-border bg-surface-elevated' :
        section.status === 'generating' ? 'border-accent-muted bg-accent-subtle/10' :
          section.status === 'error' ? 'border-red-900/40 bg-red-950/10' :
            'border-surface-border bg-surface opacity-50',
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => section.status === 'done' && setExpanded(e => !e)}
        disabled={section.status !== 'done'}
      >
        <SectionStatusIcon status={section.status} />
        <span className="flex-1 text-xs font-semibold text-content">{section.title}</span>
        {section.status === 'done' && (
          <ChevronDown size={13} className={cn(
            'text-content-subtle transition-transform',
            expanded && 'rotate-180',
          )} />
        )}
      </button>

      {expanded && section.status === 'done' && section.content && (
        <div className="px-4 pb-4 border-t border-surface-border">
          <div className="mt-3 text-sm text-content leading-relaxed whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      )}

      {section.status === 'generating' && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <span className="text-2xs text-content-muted">Analyzing…</span>
        </div>
      )}
    </div>
  );
}

function SectionStatusIcon({ status }: { status: GeneratedSection['status'] }) {
  if (status === 'done') return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />;
  if (status === 'generating') return <Loader2 size={14} className="text-accent animate-spin flex-shrink-0" />;
  if (status === 'error') return <span className="text-xs text-red-500 flex-shrink-0">✕</span>;
  return <div className="w-3.5 h-3.5 rounded-full border border-surface-border flex-shrink-0" />;
}
