'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Download, Loader2, CheckCircle2, ChevronDown,
  Briefcase, Heart, Coins, Stethoscope, Play, RefreshCw,
} from 'lucide-react';
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
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'career' | 'love' | 'wealth' | 'health';
type SectionStatus = 'pending' | 'generating' | 'done' | 'error';

interface GeneratedSection {
  sectionId: string;
  title: string;
  content: string;
  status: SectionStatus;
}

interface ReportState {
  sections: GeneratedSection[];
  status: 'idle' | 'generating' | 'done' | 'error';
}

// ─── Config ───────────────────────────────────────────────────────────────────

const REPORT_META: Record<ReportType, { title: string; subtitle: string; icon: React.ReactNode }> = {
  career: { title: 'Career & Profession', subtitle: '10th house, dashas, timing', icon: <Briefcase size={15} /> },
  love:   { title: 'Love & Marriage',     subtitle: '7th house, Venus, timing',   icon: <Heart size={15} /> },
  wealth: { title: 'Wealth & Finance',    subtitle: '2nd, 11th, Dhana yogas',     icon: <Coins size={15} /> },
  health: { title: 'Health & Vitality',   subtitle: 'Lagna, 6th, 8th house',      icon: <Stethoscope size={15} /> },
};

const REPORT_TYPES: ReportType[] = ['career', 'love', 'wealth', 'health'];

// ─── Prompts ──────────────────────────────────────────────────────────────────

const PREAMBLE = `
RULES — FOLLOW STRICTLY:
DATA: Use ONLY the verified facts in CHART DATA. Do not invent aspects, conjunctions, or positions not stated there.
ASPECTS vs CONJUNCTIONS: Planets in the same house are CONJUNCT — never say they "aspect" each other. Only cite aspects listed in the ASPECTS section.
DIGNITY: Own sign / Moolatrikona = STRONG. Read the label exactly — never call an own-sign planet "neutral".
CONFIDENCE: Label every prediction [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE].
HONESTY: Do not soften negative indicators. Accurate analysis is more valuable than comfort.
TIMING: For every timing prediction cite Mahadasha → Antardasha → Pratyantar → Gochar in sequence.
LENGTH: Be thorough. Cover every bullet point in the prompt fully. Write in clear prose.
`.trim();

function makePrompt(body: string, ctx: string): string {
  return `${PREAMBLE}\n\n${body}\n\n---\nCHART DATA:\n${ctx}`;
}

interface SectionDef { id: string; title: string; prompt: (ctx: string) => string }

function getSections(type: ReportType): SectionDef[] {
  const defs: Record<ReportType, SectionDef[]> = {
    career: [
      { id: 'c1', title: '1. Natal Career Architecture', prompt: ctx => makePrompt(`Analyze the natal career architecture:
• 10th house: sign, lord placement (sign, house, dignity, aspects received and given), all occupying planets
• 10th lord strength: exalted/own/friendly/neutral/enemy/debilitated — what it means for career trajectory
• 6th house (service, daily work): condition, lord placement
• 2nd house (accumulated income): lord and occupants
• 11th house (gains): lord strength
• Interconnections between these houses
• What career domains are indicated by the signs, lords, and occupants?`, ctx) },
      { id: 'c2', title: '2. Career Significator Planets', prompt: ctx => makePrompt(`Analyze every career-significant planet:
Sun (authority, government, leadership) — sign, house, dignity, aspects received/given, career implications
Saturn (natural career karaka, discipline, law, industry) — same depth
Mercury (intellect, communication, business, IT) — same depth
Mars (engineering, surgery, military, real estate) — same depth
Jupiter (education, banking, advisory, management) — same depth
For each: what does its condition reveal about professional strengths or weaknesses?`, ctx) },
      { id: 'c3', title: '3. Career Yogas & Combinations', prompt: ctx => makePrompt(`Analyze all career-relevant yogas:
• Raja Yogas: identify each precisely — which lords, which houses, strength
• Dharma-Karmadhipati Yoga: 9th lord + 10th lord relationship
• Pancha Mahapurusha Yogas present (Sasha, Ruchaka, Hamsa, Malavya, Bhadra)
• Neecha Bhanga (debilitation cancellation) affecting career planets
• Parivartana exchanges involving career houses (1,2,6,10,11)
• Viparita Raja Yoga if present
Rate overall career potential: Excellent / Good / Moderate / Weak with evidence.`, ctx) },
      { id: 'c4', title: '4. Dasha Timing for Career', prompt: ctx => makePrompt(`Exhaustive dasha timing for career:
Current Mahadasha: houses ruled, house occupied, dignity, functional nature, career verdict with evidence
Current Antardasha: same treatment, relationship with Mahadasha lord, career implications
Current Pratyantar: immediate career conditions
Upcoming periods (next 5 years): for each Antardasha — houses ruled, incoming lord, favorable or challenging for career?
Identify the single best career window in the next 5 years with reasoning.
Label all timing with [HIGH/MEDIUM/LOW CONFIDENCE].`, ctx) },
      { id: 'c5', title: '5. Transit Analysis for Career', prompt: ctx => makePrompt(`Current planetary transits for career:
Saturn transit: which natal house, sign condition, career impact, duration
Jupiter transit: which natal house, career blessing or challenge, duration
Rahu-Ketu axis: which natal houses, disruptions or opportunities indicated
Mars transit: current position and career activity implications
Net verdict: do transits reinforce or contradict the dasha indications?
Give approximate timing for each transit.`, ctx) },
      { id: 'c6', title: '6. Career — Final Analysis & Predictions', prompt: ctx => makePrompt(`Final comprehensive career synthesis:
PART A — Natal profile: overall rating (Excellent/Good/Moderate/Weak), primary career domains, strengths, challenges
PART B — Timing predictions:
  Near term (6 months): career trajectory [Confidence + Evidence]
  Medium term (1–3 years): major developments, best window, caution periods
  Long term (3–7 years): peak career period, overall arc
PART C — Guidance: what actions align with this chart's patterns, what to avoid, ideal timing for major moves
Every prediction must have [Confidence] and astrological evidence.`, ctx) },
    ],
    love: [
      { id: 'l1', title: '1. Natal Relationship Architecture', prompt: ctx => makePrompt(`Analyze natal relationship architecture:
• 7th house: sign, lord placement (sign, house, dignity, all aspects), occupying planets
• 7th lord strength and what it reveals about partnership
• 5th house (romance): condition, lord placement
• 2nd house (family life): lord
• 11th house (desire fulfillment): its role in relationships
• 8th house (marriage longevity, spouse's wealth): condition
• Partner profile indicated by 7th house sign and lord's house placement`, ctx) },
      { id: 'l2', title: '2. Relationship Significator Planets', prompt: ctx => makePrompt(`Deep analysis of relationship planets:
Venus (prime karaka): sign, house, nakshatra, dignity, aspects from malefics vs benefics, combust?, implications
Moon (emotional nature): sign, house, waxing/waning, afflictions from Saturn/Rahu/Mars
Mars (passion, Manglik factor): placement, aspects, relationship with Venus
Jupiter (husband karaka for female charts; blessings): placement and 7th house aspect
Rahu (unconventional relationships): position and influence on relationship houses
For each: what does its condition reveal about relationship capacity and patterns?`, ctx) },
      { id: 'l3', title: '3. Marriage Yogas, Doshas & Cancellations', prompt: ctx => makePrompt(`Analyze marriage combinations:
Manglik Dosha: Mars in 1/4/7/8/12? Severity, cancellations present
Marriage yogas: Raja Yoga involving 7th lord, Parivartana with 7th, 5th-7th lord relationship
Afflictions: Saturn in/aspecting 7th, Rahu in 7th, multiple malefics on Venus
Indicators of delay, multiple marriages, or separation — state honestly if present
Cancellations for any negative combinations
Overall marriage prospect: Favorable / Moderately favorable / Challenged`, ctx) },
      { id: 'l4', title: '4. Dasha Timing for Marriage', prompt: ctx => makePrompt(`Exhaustive dasha timing for marriage:
Current Mahadasha: does it rule/occupy 7th, 5th, or 11th? Relationship with Venus? Marriage verdict with evidence
Current Antardasha: same treatment, immediate relationship conditions
Current Pratyantar: weeks/months-scale relationship dynamics
Classic marriage triggers: Dasha/Antardasha of 7th lord, Venus, planets in 7th, Darakaraka
From the upcoming dasha sequence: identify primary marriage window [Confidence + evidence]
Secondary window if primary passes. Any periods of relationship difficulty? Be explicit.`, ctx) },
      { id: 'l5', title: '5. Transit Analysis for Marriage', prompt: ctx => makePrompt(`Current transits for marriage:
Jupiter transit: which natal house, does it aspect natal Venus or 7th? Duration. Marriage potential?
Saturn transit: over 7th or natal Venus? Delays or stability? Sade Sati active?
Rahu-Ketu axis: Rahu over Venus or 7th = unconventional relationship
Net verdict: do transits support or delay marriage?
When is the next high-probability marriage window combining dasha + transit? Give month/year ranges.`, ctx) },
      { id: 'l6', title: '6. Love & Marriage — Final Analysis', prompt: ctx => makePrompt(`Comprehensive final marriage synthesis:
PART A — Natal profile: overall rating, partner profile (qualities from 7th sign/lord), relationship patterns, emotional compatibility
PART B — Marriage timing: primary window [Confidence + evidence], secondary window, any delay indicators
PART C — Post-marriage dynamics: marital harmony indicators, conflict areas, financial dynamics with spouse
PART D — Guidance: what relationship approach suits this chart, what to be cautious about, ideal timing for marriage
Every prediction: [HIGH/MEDIUM/LOW CONFIDENCE] with full evidence.`, ctx) },
    ],
    wealth: [
      { id: 'w1', title: '1. Natal Wealth Architecture', prompt: ctx => makePrompt(`Analyze natal wealth architecture:
• 2nd house (accumulated wealth): sign, lord placement (dignity, house, aspects), occupants
• 11th house (income, gains): sign, lord strength, occupants, all aspects
• 5th house (investments, speculation): condition
• 9th house (fortune, luck): condition
• 8th house (inheritance, windfalls): condition
• 12th house (expenditure): balance with income houses
Are the wealth houses (2nd, 11th) strong and supported, or afflicted? Is the 2nd lord in kendra or dusthana?`, ctx) },
      { id: 'w2', title: '2. Wealth Significator Planets', prompt: ctx => makePrompt(`Deep analysis of wealth planets:
Jupiter (natural karaka of wealth): sign, house, dignity, aspects, which wealth houses it rules/occupies
Venus (luxury, material comfort): sign, house, strength, role in this chart's wealth
Mercury (business, trade, financial acumen): condition and wealth relevance
Moon (liquid assets, fluctuating wealth): strength, sign, house
Saturn (slow accumulation, real estate): condition and house placement
Rahu (sudden wealth, unconventional income): where is it, does it amplify wealth houses?
For each: specific implication for this person's financial profile.`, ctx) },
      { id: 'w3', title: '3. Dhana Yogas & Wealth Combinations', prompt: ctx => makePrompt(`Identify all wealth yogas:
Dhana Yogas: 2nd lord + 11th lord conjunct/aspecting/exchange — list ALL present, rate each
Lakshmi Yoga: 9th lord in own/exaltation + strong Venus in kendra/trikona — present?
Raja Yogas with financial impact: those involving 2nd or 11th lords
Pancha Mahapurusha Yogas and their wealth domain
Viparita Raja Yoga: 6/8/12 lord in another dusthana — paradoxical material success?
Negative combinations: 2nd lord in 12th, 11th lord in dusthana, malefics in 2nd
Overall wealth potential: Exceptional / Strong / Moderate / Limited — with evidence.`, ctx) },
      { id: 'w4', title: '4. Dasha Timing for Wealth', prompt: ctx => makePrompt(`Exhaustive dasha timing for wealth:
Current Mahadasha: does it rule 2nd/11th/5th/9th (wealth triggers) or 6th/8th/12th (challenges)?
Natural signification for wealth, overall wealth verdict for this Mahadasha
Current Antardasha: financial implications, activates any Dhana Yoga?
Current Pratyantar: immediate financial conditions — favorable for transactions or caution?
Upcoming wealth periods: best accumulation windows, expenditure/caution periods
Peak wealth period in the next decade
Different income sources and when each is activated by dashas.`, ctx) },
      { id: 'w5', title: '5. Transit Analysis for Finance', prompt: ctx => makePrompt(`Current transits for finance:
Jupiter transit: which natal house, impact on wealth (2nd=savings, 5th=investments, 9th=fortune, 11th=maximum gains), duration
Saturn transit: restriction or discipline in finances, which house, implications
Rahu transit: sudden financial changes over 2nd or 11th?
Net financial transit picture: accumulation or caution?
Any upcoming major transit events affecting finances in next 6–12 months?`, ctx) },
      { id: 'w6', title: '6. Wealth — Final Analysis & Predictions', prompt: ctx => makePrompt(`Comprehensive final wealth synthesis:
PART A — Natal profile: overall rating, primary wealth sources (employment/business/investments/inheritance/speculation), financial strengths and challenges
PART B — Timing predictions:
  Near term (6 months): financial trajectory [Confidence + Evidence]
  Medium term (1–3 years): accumulation windows, best investment timing, caution periods
  Long term (3–7 years): peak wealth period, overall financial arc
PART C — Strategy: income domains aligned with this chart, risks to avoid, ideal timing for major financial decisions
Every prediction: [HIGH/MEDIUM/LOW CONFIDENCE] with evidence. State clearly if wealth is limited or delayed.`, ctx) },
    ],
    health: [
      { id: 'h1', title: '1. Constitution & Physical Vitality', prompt: ctx => makePrompt(`Analyze physical constitution:
• Lagna sign: body type and constitutional tendencies it indicates
• Lagna lord: placement, dignity, strength — the lagna lord IS the body karaka
• Is the lagna lord in kendra (strong), trikona (protected), or dusthana (vulnerable)?
• Planets in 1st house: benefics strengthen, malefics stress
• Aspects to 1st house from malefics vs benefics
• 6th house: sign, lord placement — what disease domains are associated with this sign?
• 8th house: chronic conditions, longevity indicators
• 12th house: hospitalization risk, hidden ailments
DISCLAIMER: Jyotish analysis only — always consult medical professionals.`, ctx) },
      { id: 'h2', title: '2. Health Significator Planets', prompt: ctx => makePrompt(`Analyze each health planet:
Sun (vitality, heart, spine, immunity): sign, house, dignity, afflictions from Saturn/Rahu/Mars, core vitality verdict
Moon (mind, blood, fluids, emotional health): strength (waxing/waning, sign), afflictions, mental health implications
Mars (muscles, blood, accidents, surgery, inflammation): placement and aspects
Saturn (chronic disease, bones, joints, nervous system, depression): position and what chronic tendencies it indicates
Rahu (mysterious illnesses, poisons, viral infections): position and health implications
Ketu (immune disorders, mysterious ailments): position
For each: what does its condition reveal about this person's health vulnerabilities?`, ctx) },
      { id: 'h3', title: '3. Disease Patterns & Indicators', prompt: ctx => makePrompt(`Analyze specific disease patterns:
6th house sign — what diseases are classically associated with it:
(Aries=head/fever, Taurus=throat/thyroid, Gemini=respiratory/nervous, Cancer=digestive, Leo=heart/spine, Virgo=intestinal/anxiety, Libra=kidney/hormonal, Scorpio=reproductive/infections, Sagittarius=liver/hips, Capricorn=bones/joints, Aquarius=circulation/nervous, Pisces=feet/lymphatic/addiction)
Classical health combinations present in this chart:
• Moon+Saturn: chronic melancholy
• Mars+Saturn: accidents, chronic inflammation
• Sun+Rahu: unusual vitality fluctuations
• Malefics in 8th: longevity concerns
Mental health indicators: Moon's condition, Mercury's condition, Jupiter's protective aspect
Doshas detected and their health implications
DISCLAIMER: Jyotish analysis only.`, ctx) },
      { id: 'h4', title: '4. Dasha Timing for Health', prompt: ctx => makePrompt(`Exhaustive dasha timing for health:
Current Mahadasha: does it rule 6th/8th/12th (health sensitivity) or 1st/5th/9th (protection)?
Natural planet nature for health (Saturn/Rahu = challenging, Jupiter = protective), health verdict
Current Antardasha: activates which health houses? Near-term health conditions
Current Pratyantar: immediate health sensitivity in coming weeks
Upcoming health-sensitive periods (next 5 years): identify 6th/8th/12th lord activations
Recovery/vitality periods: when is health strongest?
IMPORTANT: Health dasha timing indicates sensitivity requiring vigilance, not certainty of illness.`, ctx) },
      { id: 'h5', title: '5. Transit Analysis for Health', prompt: ctx => makePrompt(`Current transits for health:
Saturn transit: which natal house, lagna/Moon impact, Sade Sati active? Phase? Duration
Jupiter transit: aspecting lagna or lagna lord? Protective? Which house?
Rahu-Ketu axis: Rahu over lagna or Moon = mental health stress, unusual health events
Mars transit: over 6th or 8th = inflammation/accident risk
Net health transit picture: supportive or stressing?
Upcoming high-risk transit combinations in next 6–12 months?`, ctx) },
      { id: 'h6', title: '6. Health — Final Analysis', prompt: ctx => makePrompt(`Comprehensive final health synthesis:
PART A — Constitutional profile: rating (Robust/Moderately strong/Moderate/Delicate), primary body systems needing attention, constitutional vulnerabilities and strengths
PART B — Mental health profile: Moon's condition, chronic emotional tendencies, when mental health is most stable vs challenged
PART C — Timing predictions:
  Near term (6 months): health conditions in current dasha+transit [Confidence + Evidence]
  Medium term (1–3 years): sensitive periods, recovery periods [Confidence + Evidence]
  Long term (3–7 years): overall health trajectory
PART D — Guidance: health practices aligned with this chart's patterns, body systems to prioritize, lifestyle adjustments suggested by planetary positions
MANDATORY DISCLAIMER: Jyotish analysis for self-awareness only. Not medical advice. Consult qualified medical professionals for health decisions.`, ctx) },
    ],
  };
  return defs[type];
}

// ─── Stream one section with automatic continuation ───────────────────────────

async function streamSection(
  prompt: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
): Promise<'done' | 'error'> {
  const MAX_CONTINUATIONS = 3;
  let fullContent = '';

  for (let pass = 0; pass <= MAX_CONTINUATIONS; pass++) {
    if (signal.aborted) return 'error';

    // For continuation passes: send a compact message only — NOT the full prompt again.
    // The full prompt + 4096 tokens of previous content would exceed practical limits.
    // Instead, give just a short reminder + the tail of what was written.
    const TAIL_CHARS = 600;
    const messages =
      pass === 0
        ? [{ role: 'user', content: prompt }]
        : [
            {
              role: 'user',
              content: `You are writing a Jyotish analysis section that was cut off. Continue EXACTLY from where it stopped — do not repeat anything. Here is the last part of what was already written:\n\n"...${fullContent.slice(-TAIL_CHARS)}"\n\nPick up seamlessly from the cut-off point and complete the analysis.`,
            },
          ];

    let finishReason: string | null = null;
    let passContent = '';

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
        throw new Error(`${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buf = '';

      outer: while (true) {
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
    } catch {
      if (signal.aborted) return 'error';
      // Treat fetch error as done with whatever we have
      return fullContent.length > 0 ? 'done' : 'error';
    }

    if (signal.aborted) return 'error';

    // If model stopped naturally or produced nothing new, we're done
    if (finishReason === 'stop' || passContent.length === 0) return 'done';

    // finishReason === 'length' means the model hit the token limit — continue
    // Add a small pause before continuation call
    if (pass < MAX_CONTINUATIONS) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return 'done';
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const params = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportType>('career');
  const [reports, setReports] = useState<Partial<Record<ReportType, ReportState>>>({});
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

    for (let i = 0; i < sections.length; i++) {
      if (ctrl.signal.aborted) break;

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
      let lastError = '';
      let succeeded = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (ctrl.signal.aborted) break;
        // Longer backoff on retry — NVIDIA rate limits typically need 15-30s to recover
        if (attempt > 0) await new Promise(r => setTimeout(r, 20000));

        const result = await streamSection(
          section.prompt(chartCtx),
          ctrl.signal,
          (fullText) => {
            setReports(prev => ({
              ...prev,
              [reportType]: {
                ...prev[reportType]!,
                sections: prev[reportType]!.sections.map((s, idx) =>
                  idx === i ? { ...s, content: fullText } : s,
                ),
              },
            }));
          },
        );

        if (result === 'done') {
          setReports(prev => ({
            ...prev,
            [reportType]: {
              ...prev[reportType]!,
              sections: prev[reportType]!.sections.map((s, idx) =>
                idx === i ? { ...s, status: 'done' as SectionStatus } : s,
              ),
            },
          }));
          succeeded = true;
          break;
        }

        if (!ctrl.signal.aborted) {
          lastError = 'Section failed';
          if (attempt === 0) addToast({ type: 'error', message: `Section ${i + 1} failed — retrying…` });
        }
      }

      if (!succeeded && !ctrl.signal.aborted) {
        setReports(prev => ({
          ...prev,
          [reportType]: {
            ...prev[reportType]!,
            sections: prev[reportType]!.sections.map((s, idx) =>
              idx === i ? { ...s, content: lastError, status: 'error' as SectionStatus } : s,
            ),
          },
        }));
      }

      if (i < sections.length - 1 && !ctrl.signal.aborted) {
        // 6s pause between sections avoids NVIDIA rate limit (30 RPM default)
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    if (!ctrl.signal.aborted) {
      setReports(prev => ({ ...prev, [reportType]: { ...prev[reportType]!, status: 'done' } }));
    }
  }, [storedChart, addToast]);

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

  const downloadReport = useCallback((reportType: ReportType) => {
    const state = reports[reportType];
    if (!state) return;
    const meta = REPORT_META[reportType];
    const text = [
      `# ${meta.title} Report`,
      `## ${profile?.name ?? 'Jyotish Chart'}`,
      `Generated by LuckyRay · ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
      '', '---', '',
      ...state.sections.filter(s => s.status === 'done').flatMap(s => [`## ${s.title}`, '', s.content, '', '---', '']),
      '',
      '_Disclaimer: Jyotish analysis for educational and self-awareness purposes only. Not a substitute for professional medical, legal, or financial advice._',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luckyray-${reportType}-report-${profile?.name?.replace(/\s+/g, '-') ?? 'chart'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Report downloaded' });
  }, [reports, profile, addToast]);

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
                <Button variant="ghost" size="sm" onClick={() => downloadReport(selectedReport)}>
                  <Download size={14} /> Download
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
                  const genDone = state?.status === 'done';
                  const genRunning = state?.status === 'generating';

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
                      {genDone && <span className="text-green-500 text-xs">✓</span>}
                      {genRunning && <Loader2 size={11} className="animate-spin text-accent" />}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
                <div className="max-w-3xl mx-auto p-6 space-y-4">
                  {/* Report header */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-content">{REPORT_META[selectedReport].title}</h2>
                      {isGenerating && (
                        <p className="text-xs text-content-muted mt-0.5">
                          Generating section {completedSections + 1} of {totalSections}…
                          {completedSections > 0 && ' Automatically continuing if cut off.'}
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
                          {currentReport ? <><RefreshCw size={13} /> Regenerate</> : <><Play size={13} /> Generate</>}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
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
                      <p className="text-sm font-medium text-content">{REPORT_META[selectedReport].title} Report</p>
                      <p className="text-xs text-content-muted max-w-sm mx-auto leading-relaxed">
                        6 sections of deep Jyotish analysis — natal placements, yogas, dasha timing
                        (Mahadasha → Antardasha → Pratyantar), transits, and final predictions with confidence levels.
                        Sections continue automatically if the model is cut off.
                      </p>
                      <Button variant="primary" onClick={() => generateReport(selectedReport)}>
                        <Play size={14} /> Generate Report
                      </Button>
                    </div>
                  )}

                  {/* Sections */}
                  {currentReport && (
                    <div className="space-y-3">
                      {currentReport.sections.map((section) => (
                        <SectionCard key={section.sectionId} section={section} />
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

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: GeneratedSection }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (section.status === 'done') setExpanded(true);
  }, [section.status]);

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      section.status === 'done'      ? 'border-surface-border bg-surface-elevated' :
      section.status === 'generating' ? 'border-accent-muted/50 bg-accent-subtle/10' :
      section.status === 'error'     ? 'border-red-900/30 bg-red-950/10' :
      'border-surface-border bg-surface opacity-40',
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => section.status === 'done' && setExpanded(e => !e)}
        disabled={section.status !== 'done'}
      >
        <StatusIcon status={section.status} />
        <span className={cn(
          'flex-1 text-xs font-semibold',
          section.status === 'done'       ? 'text-content' :
          section.status === 'generating' ? 'text-accent' : 'text-content-muted',
        )}>
          {section.title}
        </span>
        {section.status === 'done' && (
          <ChevronDown size={13} className={cn(
            'text-content-subtle flex-shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )} />
        )}
      </button>

      {section.status === 'generating' && section.content.length > 0 && (
        <div className="px-5 pb-4 border-t border-accent-muted/20">
          <p className="text-2xs text-accent mb-2">Writing… will continue if cut off</p>
          <div className="text-sm text-content leading-relaxed whitespace-pre-wrap line-clamp-6 opacity-70">
            {section.content}
          </div>
        </div>
      )}

      {section.status === 'generating' && section.content.length === 0 && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-accent-muted/20">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i*150}ms` }} />
          ))}
          <span className="text-2xs text-content-muted">Analyzing…</span>
        </div>
      )}

      {expanded && section.status === 'done' && (
        <div className="px-5 pb-5 border-t border-surface-border">
          <div className="mt-4 text-sm text-content leading-relaxed whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      )}

      {section.status === 'error' && (
        <div className="px-4 pb-3 border-t border-red-900/20">
          <p className="text-2xs text-red-400 mt-2">{section.content}</p>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === 'done')       return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />;
  if (status === 'generating') return <Loader2 size={14} className="text-accent animate-spin flex-shrink-0" />;
  if (status === 'error')      return <span className="text-sm text-red-500 flex-shrink-0">✕</span>;
  return <div className="w-3.5 h-3.5 rounded-full border border-surface-border flex-shrink-0" />;
}
