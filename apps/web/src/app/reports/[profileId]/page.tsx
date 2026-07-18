'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Download, Loader2, CheckCircle2, ChevronDown, Play, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart } from '@luckyray/shared';
import { buildChartContext } from '@luckyray/ai';
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
import { useTranslation } from '@/hooks/use-translation';

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

const REPORT_ICONS: Record<ReportType, React.ReactNode> = {
  career: <Briefcase size={15} />,
  love:   <Heart size={15} />,
  wealth: <Coins size={15} />,
  health: <Stethoscope size={15} />,
};

const REPORT_META: Record<ReportType, { title: string; subtitle: string }> = {
  career: { title: 'Career & Profession', subtitle: '10th house, dashas, timing' },
  love:   { title: 'Love & Marriage',     subtitle: '7th house, Venus, timing' },
  wealth: { title: 'Wealth & Finance',    subtitle: '2nd, 11th, Dhana yogas' },
  health: { title: 'Health & Vitality',   subtitle: 'Lagna, 6th, 8th house' },
};

const REPORT_TYPES: ReportType[] = ['career', 'love', 'wealth', 'health'];

// ─── Report System Prompt ─────────────────────────────────────────────────────
// This replaces the chat system prompt entirely for reports.
// Strict output style: planet → result → confidence. No Jyotish lectures.

const REPORT_SYSTEM_PROMPT = `You are a Jyotish analyst writing a structured astrological report section.

OUTPUT RULES — FOLLOW EXACTLY:
- Write only about the SPECIFIC topic you are asked. Do not bring in other life areas.
- Lead each observation with the planet or combination in **bold**, then 1–2 sentences max.
- Format: **Planet** (role) — result. [HIGH / MEDIUM / LOW]
- Use bullet points. Paragraphs only for the final summary line.
- Do NOT explain how Jyotish works or what houses/signs mean in general.
- Do NOT add preambles, meta-commentary, headers like "Response Structure", or instructions.
- Do NOT say "The native". Use direct statements.
- State negative indicators honestly. Do not soften them.
- End every section with **Bottom line:** followed by 1–2 sentences.
- Output ONLY the astrological analysis. Nothing else.`.trim();

// ─── Section Prompts ──────────────────────────────────────────────────────────

interface SectionDef { id: string; title: string; prompt: string }

function getSections(type: ReportType): SectionDef[] {
  const defs: Record<ReportType, SectionDef[]> = {
    career: [
      {
        id: 'c1',
        title: '1. Career Signature',
        prompt: `TOPIC: Career and profession ONLY. Do not mention marriage, health, or any other life area.

From the chart data, write bullet points covering:
- **10th lord** — which planet, where placed, its dignity, and what that means for career
- **Planets in 10th house** — each one and its career implication (skip if empty)
- **Sun** (authority, status, government) — placement and career meaning
- **Saturn** (career karaka, discipline, longevity) — placement and career meaning
- **6th lord** (daily work, service) — brief placement note
- **11th lord** (income, gains) — whether it supports earnings
- **Career domain** — 2–3 specific industries or roles this chart points to

End with: **Bottom line:** [1–2 sentence overall career signature]`,
      },
      {
        id: 'c2',
        title: '2. Yogas & Strengths',
        prompt: `TOPIC: Career yogas and potential ONLY.

From the chart data, identify:
- Any **Raja Yogas** involving career houses (10th, 6th, 11th) — name the planets and what they indicate
- **Dharma-Karmadhipati Yoga** (9th + 10th lords) — present or absent, implication
- Any **Pancha Mahapurusha Yoga** — which one, career domain it strengthens
- Any **Neecha Bhanga** or **Parivartana** affecting career planets
- **Overall career strength**: Exceptional / Strong / Moderate / Limited — 1 line of evidence

End with: **Bottom line:** [career potential in one sentence]`,
      },
      {
        id: 'c3',
        title: '3. Timing — Dasha, KP & Transits',
        prompt: `TOPIC: Career timing ONLY. Cover all three layers briefly.

**KP**: H10 sub-lord — which houses does it signify? Is career promised? What KP periods are active?

**Current Dasha**:
- Mahadasha lord — which houses it rules, career verdict [CONFIDENCE]
- Antardasha lord — immediate career conditions [CONFIDENCE]

**Upcoming 3 years**: for each upcoming antardasha, one bullet: planet → career implication → dates

**Transits** (use gochar data from chart):
- Saturn transit — which natal house, career impact
- Jupiter transit — which natal house, career impact

**Best career window** in the next 3 years — identify it with the dasha+transit combination that creates it.

End with: **Bottom line:** [timing verdict in 1–2 sentences]`,
      },
    ],
    love: [
      {
        id: 'l1',
        title: '1. Relationship Signature',
        prompt: `TOPIC: Love and marriage ONLY. Do not mention career, health, or wealth.

From the chart data, write bullet points covering:
- **7th lord** — placement, dignity, and partnership implication
- **Planets in 7th house** — each with its relationship implication (skip if empty)
- **Venus** (love, partnership karaka) — sign, house, dignity, and relationship meaning
- **Moon** (emotional nature in relationships) — condition and emotional pattern
- **5th lord** (romance, attraction) — brief note
- **Partner profile** — 2–3 qualities the 7th house sign and lord indicate in a partner

End with: **Bottom line:** [relationship signature in 1–2 sentences]`,
      },
      {
        id: 'l2',
        title: '2. Doshas, Yogas & Delays',
        prompt: `TOPIC: Marriage combinations ONLY.

From the chart data, identify:
- **Manglik Dosha** — Mars in which house? Severity? Any cancellations present?
- **Marriage yoga** — any Raja Yoga or beneficial exchange involving the 7th lord
- **Afflictions** — Saturn, Rahu, Ketu influence on 7th house or Venus
- **Delay indicators** — if 7th lord is in dusthana or afflicted, state it honestly
- **Overall marriage prospect**: Favorable / Delayed / Challenged — 1 line of evidence

End with: **Bottom line:** [marriage potential summary]`,
      },
      {
        id: 'l3',
        title: '3. Timing — Dasha, KP & Transits',
        prompt: `TOPIC: Marriage timing ONLY.

**KP**: H7 sub-lord — houses signified, marriage promised? Active KP marriage periods?

**Current Dasha**:
- Mahadasha lord — does it trigger 7th/5th/11th? Marriage verdict [CONFIDENCE]
- Antardasha lord — immediate relationship conditions [CONFIDENCE]

**Primary marriage window** — which dasha combination creates it, approximate dates [CONFIDENCE]

**Transits** (use gochar data):
- Jupiter transit — natal house, marriage support or neutral
- Saturn transit — delays or maturity in relationships

**Best upcoming window** combining dasha + transit.

End with: **Bottom line:** [timing verdict in 1–2 sentences]`,
      },
    ],
    wealth: [
      {
        id: 'w1',
        title: '1. Wealth Signature',
        prompt: `TOPIC: Wealth and finances ONLY. Do not mention career ambitions, marriage, or health.

From the chart data, write bullet points covering:
- **2nd lord** (accumulated wealth) — placement, dignity, wealth implication
- **11th lord** (income and gains) — placement and earning capacity
- **Jupiter** (wealth karaka, expansion) — sign, house, dignity
- **Venus** (luxury, assets) — condition and material comfort
- **9th lord** (fortune, luck) — whether it supports wealth
- Planets in 2nd or 11th — each with wealth implication (skip if empty)
- **Primary income style** — employment / business / investment / inheritance based on chart

End with: **Bottom line:** [wealth signature in 1–2 sentences]`,
      },
      {
        id: 'w2',
        title: '2. Dhana Yogas',
        prompt: `TOPIC: Wealth yogas and financial combinations ONLY.

From the chart data, identify:
- **Dhana Yoga** (2nd + 11th lord connection) — conjunct, aspecting, or exchange? Strength?
- **Lakshmi Yoga** — 9th lord + Venus conditions — present?
- Any **Raja Yoga** involving 2nd or 11th lords
- **Negative combinations** — 2nd lord in 12th, 11th lord in dusthana — state honestly
- **Overall wealth potential**: Exceptional / Strong / Moderate / Limited

End with: **Bottom line:** [wealth potential in one sentence]`,
      },
      {
        id: 'w3',
        title: '3. Timing — Dasha, KP & Transits',
        prompt: `TOPIC: Financial timing ONLY.

**KP**: H11 sub-lord — houses signified, wealth promised? Active KP financial periods?

**Current Dasha**:
- Mahadasha lord — does it activate 2nd/11th/5th/9th? Financial verdict [CONFIDENCE]
- Antardasha lord — immediate financial conditions [CONFIDENCE]

**Best accumulation windows** in next 3 years — dasha combinations that activate wealth [CONFIDENCE]

**Transits** (use gochar data):
- Jupiter transit — which house, financial impact
- Saturn transit — restriction or structured accumulation

**One caution period** — when to avoid major financial risk.

End with: **Bottom line:** [financial timing verdict in 1–2 sentences]`,
      },
    ],
    health: [
      {
        id: 'h1',
        title: '1. Vitality & Constitution',
        prompt: `TOPIC: Physical health and constitution ONLY. Do not mention career, relationships, or finances.

From the chart data, write bullet points covering:
- **Lagna lord** (body karaka) — placement, dignity, vitality implication
- **Sun** (core vitality, immunity) — sign, house, any afflictions
- **Moon** (mind, fluids, emotional health) — condition and health pattern
- **Saturn** (chronic conditions, bones, joints) — any health vulnerabilities indicated
- **6th house sign** — which body systems are naturally stressed
- **Mars** (inflammation, accidents, surgery risk) — placement note
- **Rahu/Ketu** — any unusual health patterns

Disclaimer: Jyotish health analysis is for self-awareness only. Consult a doctor for medical decisions.

End with: **Bottom line:** [constitution rating and key vulnerability in 1–2 sentences]`,
      },
      {
        id: 'h2',
        title: '2. Disease Patterns',
        prompt: `TOPIC: Health vulnerabilities and patterns ONLY.

From the chart data:
- **6th house sign** disease associations — which organ systems are naturally stressed
- **Classical combinations present** — Moon+Saturn (mental health), Mars+Saturn (inflammation/accidents), Rahu+Sun (unusual conditions) — only mention ones actually present
- **8th house** — chronic condition or longevity indicator
- **Mental health** — Moon condition and Mercury condition, brief note
- **Strongest health protection** — which benefic aspect provides recovery and immunity

Disclaimer: Jyotish analysis only — not medical advice.

End with: **Bottom line:** [key health vulnerability and protective factor]`,
      },
      {
        id: 'h3',
        title: '3. Timing — Dasha, KP & Transits',
        prompt: `TOPIC: Health timing ONLY.

**KP**: H1 sub-lord — does it signify H6/H8/H12 (challenge) or H1/H5/H11 (strength)?

**Current Dasha**:
- Mahadasha lord — health-sensitive or protective? [CONFIDENCE]
- Antardasha lord — immediate health conditions [CONFIDENCE]

**Sensitive periods in next 3 years** — when 6th/8th/12th lords activate (list dates briefly)

**Transits** (use gochar data):
- Saturn transit — natal house, health impact
- Rahu-Ketu — any health-sensitive natal houses affected

Disclaimer: Health sensitivity periods indicate vigilance, not certainty of illness. Consult medical professionals.

End with: **Bottom line:** [health timing verdict in 1–2 sentences]`,
      },
    ],
  };
  return defs[type];
}

// ─── Stream engine — bulletproof with 429 handling ────────────────────────────

interface StreamResult {
  outcome: 'done' | 'error' | 'aborted';
  content: string;
}

function parseSSELines(buf: string): { content: string; finishReason: string | null; remaining: string } {
  let content = '';
  let finishReason: string | null = null;
  const events = buf.split('\n\n');
  const remaining = events.pop() ?? '';
  for (const event of events) {
    for (const line of event.split('\n')) {
      const t = line.trim();
      if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(t.slice(6));
        const delta = json?.choices?.[0]?.delta?.content;
        const fr = json?.choices?.[0]?.finish_reason;
        if (typeof delta === 'string' && delta) content += delta;
        if (typeof fr === 'string' && fr && fr !== 'null') finishReason = fr;
      } catch { /* skip */ }
    }
  }
  return { content, finishReason, remaining };
}

async function streamSection(
  sectionDef: SectionDef,
  chartContext: import('@luckyray/shared').ChartContext,
  signal: AbortSignal,
  onChunk: (text: string, waitingMsg?: string) => void,
): Promise<StreamResult> {
  const MAX_PASSES = 4;
  const MAX_ATTEMPTS_PER_PASS = 3;
  let fullContent = '';
  let conversationMessages: { role: 'user' | 'assistant'; content: string }[] = [];

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (signal.aborted) return { outcome: 'aborted', content: fullContent };

    const messages: { role: 'user' | 'assistant'; content: string }[] =
      pass === 0
        ? [{ role: 'user', content: sectionDef.prompt }]
        : [
            ...conversationMessages,
            { role: 'user', content: 'Continue from exactly where you stopped. Do not repeat anything already written.' },
          ];

    let finishReason: string | null = null;
    let passContent = '';
    let passSucceeded = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PASS; attempt++) {
      if (signal.aborted) return { outcome: 'aborted', content: fullContent };

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            messages,
            chartContext,
            systemPromptOverride: REPORT_SYSTEM_PROMPT,
            model: 'meta/llama-3.1-70b-instruct',
            stream: true,
            maxTokens: 2048,
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) {
            const retryAfterHeader = response.headers.get('retry-after');
            const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 45 + attempt * 30;
            onChunk(fullContent, `Rate limited — waiting ${waitSec}s…`);
            await new Promise(r => setTimeout(r, waitSec * 1000));
            continue;
          }
          if (status >= 500) {
            const waitSec = 10 + attempt * 15;
            onChunk(fullContent, `Server error (${status}) — retrying in ${waitSec}s…`);
            await new Promise(r => setTimeout(r, waitSec * 1000));
            continue;
          }
          throw new Error(`HTTP ${status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let buf = '';
        finishReason = null;
        passContent = '';

        try {
          while (true) {
            if (signal.aborted) { reader.cancel(); break; }
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const { content, finishReason: fr, remaining } = parseSSELines(buf);
            buf = remaining;
            if (content) { passContent += content; fullContent += content; onChunk(fullContent); }
            if (fr) finishReason = fr;
          }
          // flush leftover
          if (buf.trim()) {
            const { content, finishReason: fr } = parseSSELines(buf + '\n\n');
            if (content) { passContent += content; fullContent += content; onChunk(fullContent); }
            if (fr) finishReason = fr;
          }
        } finally {
          reader.releaseLock();
        }

        passSucceeded = true;
        break;
      } catch (err) {
        if (signal.aborted) return { outcome: 'aborted', content: fullContent };
        const waitSec = 15 + attempt * 20;
        onChunk(fullContent, `Connection error — retrying in ${waitSec}s…`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      }
    }

    if (signal.aborted) return { outcome: 'aborted', content: fullContent };
    if (!passSucceeded) {
      return fullContent.length > 0 ? { outcome: 'done', content: fullContent } : { outcome: 'error', content: fullContent };
    }

    if (finishReason !== 'length' || !passContent) {
      return { outcome: 'done', content: fullContent };
    }

    // Continue: build conversation context for next pass
    if (pass === 0) {
      conversationMessages = [
        { role: 'user', content: sectionDef.prompt },
        { role: 'assistant', content: passContent },
      ];
    } else {
      conversationMessages = [
        ...conversationMessages,
        { role: 'user', content: 'Continue from exactly where you stopped.' },
        { role: 'assistant', content: passContent },
      ];
    }

    onChunk(fullContent, `Continuing…`);
    await new Promise(r => setTimeout(r, 1500));
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

  // Dark background for the first page
  doc.setFillColor(5, 3, 14);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── Page helpers ───────────────────────────────────────────────────────────

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      // Dark background on new page
      doc.setFillColor(5, 3, 14);
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
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
    // Ensure dark background on every page (footer always on top)
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
  const t = useTranslation();

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
    const chartContext = buildChartContext(storedChart.chart, reportType, gochar.planets);

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
        section,
        chartContext,
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
      addToast({ type: 'success', message: t.reports.download });
    } catch (e) {
      addToast({ type: 'error', message: 'PDF generation failed' });
    }
  }, [reports, profile, addToast, t]);

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
            title={t.reports.title}
            description={profile.name}
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label={t.common.back}>
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
            actions={
              isDone ? (
                <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(selectedReport)}>
                  <Download size={14} className="mr-1.5" /> {t.reports.download}
                </Button>
              ) : undefined
            }
          />

          {!chart ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-content-muted text-sm">{t.reports.noChart}</p>
                <Link href={`/chart/${profile.id}`}>
                  <Button variant="primary">{t.reports.generateChartFirst}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Report type tabs */}
              <div className="flex border-b border-surface-border shrink-0 overflow-x-auto">
                {REPORT_TYPES.map(type => {
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
                        {REPORT_ICONS[type]}
                      </span>
                      <span className="font-medium">{t.reports.reportTypes[type]}</span>
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
                      <h2 className="text-sm font-semibold text-content">{t.reports.reportTypes[selectedReport]}</h2>
                      {isGenerating && (
                        <p className="text-xs text-content-muted mt-0.5">
                          {t.reports.sectionProgress(completedSections + 1, totalSections)}
                        </p>
                      )}
                      {isDone && (
                        <p className="text-xs text-content-muted mt-0.5">{t.reports.sectionsComplete(completedSections)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isGenerating ? (
                        <Button variant="ghost" size="sm" onClick={cancelGeneration}>{t.reports.cancel}</Button>
                      ) : (
                        <Button
                          variant={currentReport ? 'ghost' : 'primary'}
                          size="sm"
                          onClick={() => generateReport(selectedReport)}
                        >
                          {currentReport
                            ? <><RefreshCw size={13} className="mr-1.5" /> {t.reports.regenerate}</>
                            : <><Play size={13} className="mr-1.5" /> {t.reports.generate}</>}
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
                      <p className="text-sm font-medium text-content">{t.reports.reportTypes[selectedReport]}</p>
                      <p className="text-xs text-content-muted max-w-sm mx-auto leading-relaxed">
                        {t.reports.reportSubtitles[selectedReport]}
                      </p>
                      <Button variant="primary" onClick={() => generateReport(selectedReport)}>
                        <Play size={14} className="mr-1.5" /> {t.reports.generate}
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
