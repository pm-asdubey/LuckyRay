/**
 * LuckyRay Validation Script
 *
 * Tests the full pipeline against 5 sample birth charts.
 *
 * For each chart:
 *   1. Chart generation (jyotish engine)
 *   2. 30 chat questions (diverse topics)
 *   3. All 4 reports (Career, Love, Wealth, Health) — 2 sections each
 *   4. KP timing deep-dive (marriage, job, job switch, property)
 *   5. Model comparison on KP: llama-3.1-70b vs llama-3.3-70b
 *
 * Output → scripts/validation-results.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Load API key from env file
const envContent = fs.readFileSync(path.join(ROOT, 'apps/web/.env.local'), 'utf8');
const NVIDIA_API_KEY = envContent.match(/NVIDIA_API_KEY=(.+)/)?.[1]?.trim();
if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY missing');

// Load bundles
const { generateChart } = await import('./bundle-out/jyotish.mjs');
const { buildChartContext, serializeChartContext } = await import('./bundle-out/ai.mjs');

// ─── Models ──────────────────────────────────────────────────────────────────

const MODEL_A = 'meta/llama-3.1-70b-instruct';
const MODEL_B = 'meta/llama-3.3-70b-instruct';
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

// ─── 5 Sample Profiles ───────────────────────────────────────────────────────
// utcOffset in minutes: IST = +330, EST = -300, GMT = 0

const PROFILES = [
  {
    name: 'Arjun Sharma',
    gender: 'male',
    date: '1990-03-15', time: '06:30',
    latitude: 28.6139, longitude: 77.2090,
    timezone: 'Asia/Kolkata', place: 'New Delhi, India',
    utcOffset: 330,  // IST
  },
  {
    name: 'Priya Nair',
    gender: 'female',
    date: '1995-08-22', time: '14:15',
    latitude: 9.9312, longitude: 76.2673,
    timezone: 'Asia/Kolkata', place: 'Kochi, Kerala, India',
    utcOffset: 330,
  },
  {
    name: 'Rohan Mehta',
    gender: 'male',
    date: '1985-11-30', time: '23:45',
    latitude: 19.0760, longitude: 72.8777,
    timezone: 'Asia/Kolkata', place: 'Mumbai, India',
    utcOffset: 330,
  },
  {
    name: 'Sarah Mitchell',
    gender: 'female',
    date: '1992-06-04', time: '09:20',
    latitude: 40.7128, longitude: -74.0060,
    timezone: 'America/New_York', place: 'New York, USA',
    utcOffset: -240, // EDT (summer)
  },
  {
    name: 'James O\'Brien',
    gender: 'male',
    date: '1988-01-17', time: '16:50',
    latitude: 51.5074, longitude: -0.1278,
    timezone: 'Europe/London', place: 'London, UK',
    utcOffset: 0,   // GMT (winter)
  },
];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function callNvidia(model, system, user, maxTokens = 1500) {
  const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw Object.assign(new Error(`429: rate limited`), { is429: true });
    throw new Error(`NVIDIA ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return { content: data.choices[0].message.content, finish: data.choices[0].finish_reason };
}

async function ask(model, system, user, maxTokens = 1500, attempt = 0) {
  try {
    return await callNvidia(model, system, user, maxTokens);
  } catch (e) {
    if (e.is429 && attempt < 4) {
      const wait = 45 + attempt * 30;
      console.log(`  ⏳ 429 — wait ${wait}s...`);
      await sleep(wait * 1000);
      return ask(model, system, user, maxTokens, attempt + 1);
    }
    throw e;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── System Prompts ──────────────────────────────────────────────────────────

const CHAT_SYSTEM = (chartText) => `You are a Jyotish advisor giving direct, practical guidance.

Use plain English. Minimize technical astrology jargon.
When you mention a planet, say what it DOES for this person — not just its house/sign.
Do NOT say "The native". Use "you" or the person's name.
Keep answers focused. Max 250 words unless depth is essential.
Label timing predictions: [HIGH], [MEDIUM], or [LOW] confidence.
Be honest about challenges — do not soften negative indicators.

--- CHART DATA ---
${chartText}`;

const REPORT_SYSTEM = (chartText) => `You are a Jyotish analyst writing a report section.

STRICT OUTPUT RULES:
- ONLY analyze the topic requested. Do not bring in other life areas.
- Format: **Planet/Factor** — what it means for this person. [CONFIDENCE]
- Bullet points. 1–2 sentences per bullet max.
- No Jyotish theory explanations. Just what the chart shows.
- No meta-commentary. No preamble. Start the analysis immediately.
- End with: **Bottom line:** 1–2 sentence summary.

--- CHART DATA ---
${chartText}`;

const KP_SYSTEM = (chartText) => `You are a KP Jyotish timing expert.

The chart includes detailed KP analysis: sub-lords, significators (L1/L2/L3/L4), and predicted periods.

When answering timing questions:
- Use the KP predicted periods from the chart data — they have actual date ranges
- Cross-check with Vimshottari dasha
- Cite the specific sub-lord and what houses it signifies
- Give month/year estimates where possible
- Label: [HIGH], [MEDIUM], or [LOW] confidence
- Plain language — explain what the timing means for real life

--- CHART DATA ---
${chartText}`;

// ─── Questions ───────────────────────────────────────────────────────────────

const CHAT_QUESTIONS = [
  // Personality (5)
  ['Personality', 'What kind of person is this based on the chart? Core strengths and character?'],
  ['Personality', 'What is the biggest weakness or blind spot that could hold this person back?'],
  ['Personality', 'Is this person naturally an introvert or extrovert?'],
  ['Personality', 'How does this person think and make decisions — logical, emotional, or intuitive?'],
  ['Personality', 'What drives this person most — ambition, relationships, security, or knowledge?'],
  // Career (5)
  ['Career', 'What career path suits this person best?'],
  ['Career', 'Better suited to employment or running their own business?'],
  ['Career', 'What are the most financially rewarding fields for this chart?'],
  ['Career', 'What does the current major period mean for career right now?'],
  ['Career', 'Best window in the next 3 years for a career move or promotion?'],
  // Relationships (5)
  ['Relationships', 'How does this person experience love and relationships?'],
  ['Relationships', 'What type of partner is most compatible?'],
  ['Relationships', 'Will there be delays or challenges in marriage?'],
  ['Marriage', 'What is the most favorable period for marriage?'],
  ['Relationships', 'What is the biggest relationship challenge for this person?'],
  // Wealth (5)
  ['Wealth', 'Will this person accumulate significant wealth?'],
  ['Wealth', 'Natural style with money — saver, spender, or investor?'],
  ['Wealth', 'When is the peak financial period in this chart?'],
  ['Wealth', 'Good candidate for business or better as an employee for financial stability?'],
  ['Wealth', 'Should this person invest in real estate, stocks, or business?'],
  // Health (3)
  ['Health', 'What health areas need attention based on this chart?'],
  ['Health', 'Is this person prone to anxiety, stress, or mental health challenges?'],
  ['Health', 'What is the natural energy level and constitution?'],
  // Life themes (5)
  ['Timing', 'What are the most significant life events likely in the next 5 years?'],
  ['Timing', 'Which past period was most challenging and why?'],
  ['Current', 'What is happening right now and what should this person focus on?'],
  ['Family', 'What is the relationship with parents like based on the chart?'],
  ['Foreign', 'Any indication of foreign travel, opportunities, or relocation?'],
  // Summary (2)
  ['Summary', 'The single most important life lesson this chart holds?'],
  ['Caution', 'What should this person absolutely avoid in the next 12 months?'],
];

const REPORT_SECTIONS = [
  {
    type: 'career', label: 'CAREER & PROFESSION',
    sections: [
      {
        title: 'Career Signature & Timing',
        prompt: `TOPIC: Career and profession ONLY.

Bullets covering:
- **10th lord** — where it sits and what that means for career trajectory
- **Saturn** (career discipline and longevity) — condition and implication
- **Sun** (authority, status, recognition) — placement and career meaning
- Career domains — 2–3 specific fields this chart naturally points to
- **Current dasha** — career verdict [CONFIDENCE]
- **Best career window** in next 3 years [CONFIDENCE]

**Bottom line:** overall career signature and timing.`,
      },
      {
        title: 'Career Strategy & Yogas',
        prompt: `TOPIC: Career strategy and potential ONLY.

- Any **Raja Yogas** or career yogas — name them and their impact
- Employment vs business — which does this chart support and why
- Top 2 professional strengths from this chart
- Top 1 professional vulnerability
- One actionable step for career growth right now

**Bottom line:** career potential rating and strategic direction.`,
      },
    ],
  },
  {
    type: 'love', label: 'LOVE & MARRIAGE',
    sections: [
      {
        title: 'Relationship Signature & Delays',
        prompt: `TOPIC: Love and marriage ONLY.

- **7th lord** — placement and what it means for partnership
- **Venus** — condition and love expression
- **Moon** — emotional pattern in relationships
- Delay indicators — state any honestly
- Any positive marriage yogas
- Partner profile — 2–3 likely qualities

**Bottom line:** marriage outlook and timeline.`,
      },
      {
        title: 'Marriage Timing',
        prompt: `TOPIC: Marriage timing ONLY.

- **Current dasha/antardasha** — marriage trigger or not? [CONFIDENCE]
- **Primary marriage window** — which period, approximate dates [CONFIDENCE]
- **Jupiter transit** — supporting or neutral?
- **KP H7 sub-lord** — what houses it signifies and what that means for marriage

**Bottom line:** when marriage is most likely.`,
      },
    ],
  },
  {
    type: 'wealth', label: 'WEALTH & FINANCE',
    sections: [
      {
        title: 'Wealth Signature & Potential',
        prompt: `TOPIC: Wealth and finances ONLY.

- **11th lord** (income and gains) — placement and earning capacity
- **2nd lord** (savings and assets) — condition
- **Jupiter** (wealth expansion) — strength and financial role
- **Dhana Yoga** — present or absent, strength
- Overall wealth potential: Exceptional / Strong / Moderate / Limited

**Bottom line:** wealth profile in one sentence.`,
      },
      {
        title: 'Financial Timing & Strategy',
        prompt: `TOPIC: Financial timing and strategy ONLY.

- **Current dasha** — financial conditions now [CONFIDENCE]
- **Best accumulation window** in next 3 years
- Primary income channel for this chart (salary/business/investments)
- One investment style suited to this chart
- One financial mistake to avoid

**Bottom line:** financial timing and strategy.`,
      },
    ],
  },
  {
    type: 'health', label: 'HEALTH & VITALITY',
    sections: [
      {
        title: 'Vitality & Vulnerabilities',
        prompt: `TOPIC: Physical health and constitution ONLY.

- **Lagna lord** — vitality baseline
- **Sun** — core immunity and energy
- **Moon** — emotional and mental health
- **Saturn** — chronic vulnerability if any
- 2–3 body systems to proactively support
Disclaimer: Self-awareness only. Consult a doctor for medical decisions.

**Bottom line:** constitution rating and primary vulnerability.`,
      },
      {
        title: 'Health Timing',
        prompt: `TOPIC: Health timing ONLY.

- **Current dasha** — health-sensitive or protective? [CONFIDENCE]
- Any sensitive periods in next 3 years — brief
- Best protective period in the chart
Disclaimer: Sensitivity periods mean vigilance, not certain illness.

**Bottom line:** health timing verdict.`,
      },
    ],
  },
];

const KP_QUESTIONS = [
  { topic: 'Marriage', q: `Using the KP analysis in this chart, when is this person most likely to get married? What does the H7 sub-lord indicate? Is marriage promised? Give specific period dates.` },
  { topic: 'First Job / Employment', q: `When did or will this person get their first stable employment? What does the H6 and H10 KP analysis show? Which dasha activates it?` },
  { topic: 'Job Switch / Promotion', q: `When is the best window to switch jobs or get promoted? Use both KP periods and dasha timing. What specific combination creates the opportunity?` },
  { topic: 'Property Purchase', q: `Does this chart support property ownership? When is the best time to buy property? What does the H4 KP analysis say? Which dasha activates the 4th house?` },
  { topic: 'Financial Breakthrough', q: `Using KP significators and dasha timing, when is the biggest financial improvement period? What combination triggers it?` },
  { topic: 'Foreign / Relocation', q: `What does the KP analysis say about foreign opportunities or relocation? Which houses and dasha periods support this?` },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

const out = [];
const log = (...args) => { const line = args.join(' '); console.log(line); out.push(line); };
const div = title => log('\n' + '═'.repeat(70) + '\n  ' + title + '\n' + '═'.repeat(70) + '\n');
const sec = title => log('\n' + '─'.repeat(60) + '\n  ' + title + '\n' + '─'.repeat(60) + '\n');

log('# LuckyRay Validation Report');
log(`Generated: ${new Date().toUTCString()}`);
log('');

for (const profile of PROFILES) {
  div(`PROFILE: ${profile.name.toUpperCase()} — ${profile.date}, ${profile.time}, ${profile.place}`);

  // ── 1. Generate Chart ──────────────────────────────────────────────────────
  console.log(`\n🔭 Generating chart for ${profile.name}...`);
  const birthDetails = {
    date: profile.date,
    time: profile.time,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    place: profile.place,
    utcOffset: profile.utcOffset,
  };

  const chartResult = generateChart({
    profile: { id: `test-${profile.name.replace(/\s/g, '-').toLowerCase()}`, name: profile.name, gender: profile.gender },
    birthDetails,
  });

  if (!chartResult.success) {
    log(`❌ Chart generation failed: ${chartResult.error} — ${chartResult.details}`);
    continue;
  }

  const chart = chartResult.chart;
  const chartCtx = buildChartContext(chart, 'general');
  const CHART_TEXT = serializeChartContext(chartCtx);

  // Chart summary
  const moonP = chart.planets.find(p => p.id === 'Moon');
  const sunP = chart.planets.find(p => p.id === 'Sun');
  const satP = chart.planets.find(p => p.id === 'Saturn');
  const venP = chart.planets.find(p => p.id === 'Venus');
  const jupP = chart.planets.find(p => p.id === 'Jupiter');

  log(`## Chart Summary`);
  log(`- **Ascendant**: ${chart.ascendant.sign} ${chart.ascendant.degree}°${chart.ascendant.minute}'`);
  log(`- **Sun**: ${sunP?.sign} H${sunP?.house} (${sunP?.dignity})`);
  log(`- **Moon**: ${moonP?.sign} H${moonP?.house} — ${moonP?.nakshatra} (${moonP?.dignity})`);
  log(`- **Saturn**: ${satP?.sign} H${satP?.house} (${satP?.dignity})`);
  log(`- **Jupiter**: ${jupP?.sign} H${jupP?.house} (${jupP?.dignity})`);
  log(`- **Venus**: ${venP?.sign} H${venP?.house} (${venP?.dignity})`);
  log(`- **Mahadasha**: ${chart.dashas.currentMahadasha.planet} → ${chart.dashas.currentMahadasha.endDate.slice(0,10)}`);
  log(`- **Antardasha**: ${chart.dashas.currentAntardasha?.planet ?? 'n/a'} → ${chart.dashas.currentAntardasha?.endDate.slice(0,10) ?? 'n/a'}`);
  const kpEvts = chart.kp?.events ?? [];
  const kpMar = kpEvts.find(e => e.topic === 'marriage');
  const kpCar = kpEvts.find(e => e.topic === 'career');
  const kpWealth = kpEvts.find(e => e.topic === 'wealth');
  log(`- **KP Marriage H7**: ${kpMar?.primaryCuspSubLord ?? 'n/a'} → H${kpMar?.sublordSignifies?.join(', H') ?? '?'} — ${kpMar?.promiseStrength ?? '?'} (${kpMar?.isPromised ? 'promised' : 'not promised'})`);
  log(`- **KP Career H10**: ${kpCar?.primaryCuspSubLord ?? 'n/a'} → H${kpCar?.sublordSignifies?.join(', H') ?? '?'} — ${kpCar?.isPromised ? 'promised' : 'not promised'}`);
  log(`- **KP Wealth H11**: ${kpWealth?.primaryCuspSubLord ?? 'n/a'} → ${kpWealth?.isPromised ? 'promised' : 'not promised'}`);
  const yogas = chart.yogas.filter(y => y.detected).map(y => y.name);
  log(`- **Yogas**: ${yogas.length > 0 ? yogas.join(', ') : 'None detected'}`);
  const doshas = chart.doshas.filter(d => d.detected).map(d => d.name);
  log(`- **Doshas**: ${doshas.length > 0 ? doshas.join(', ') : 'None'}`);
  log('');

  console.log(`✅ Chart OK — Asc: ${chart.ascendant.sign}, MD: ${chart.dashas.currentMahadasha.planet}→${chart.dashas.currentAntardasha?.planet}`);

  const chatSys = CHAT_SYSTEM(CHART_TEXT);
  const reportSys = REPORT_SYSTEM(CHART_TEXT);
  const kpSys = KP_SYSTEM(CHART_TEXT);

  // ── 2. 30 Chat Questions ───────────────────────────────────────────────────
  sec('PART 1 — 30 CHAT QUESTIONS');

  let qNum = 0;
  for (const [topic, q] of CHAT_QUESTIONS) {
    qNum++;
    console.log(`  Q${qNum}/30 [${topic}] ${q.slice(0, 55)}...`);
    try {
      const r = await ask(MODEL_A, chatSys, q, 500);
      log(`### Q${qNum} [${topic}]: ${q}`);
      log(r.content);
      log('');
      await sleep(3000);
    } catch (e) {
      log(`### Q${qNum} [${topic}] ERROR: ${e.message}`);
    }
  }

  // ── 3. Four Reports ───────────────────────────────────────────────────────
  sec('PART 2 — FOUR REPORTS');

  for (const report of REPORT_SECTIONS) {
    log(`### REPORT: ${report.label}`);
    for (const section of report.sections) {
      console.log(`  📄 ${report.label} — ${section.title}...`);
      try {
        const r = await ask(MODEL_A, reportSys, section.prompt, 1200);
        log(`#### ${section.title}`);
        log(r.content);
        log('');
        await sleep(5000);
      } catch (e) {
        log(`**ERROR**: ${e.message}`);
      }
    }
  }

  // ── 4. KP Timing + Model Comparison ──────────────────────────────────────
  sec('PART 3 — KP TIMING (Model Comparison)');
  log(`Comparing **${MODEL_A.split('/')[1]}** vs **${MODEL_B.split('/')[1]}**`);
  log('');

  for (const { topic, q } of KP_QUESTIONS) {
    console.log(`  🔍 [KP ${topic}] running both models...`);
    log(`### KP: ${topic}`);
    log(`**Question**: ${q}`);
    log('');
    try {
      const [rA, rB] = await Promise.allSettled([
        ask(MODEL_A, kpSys, q, 1200),
        ask(MODEL_B, kpSys, q, 1200),
      ]);
      log(`**${MODEL_A.split('/')[1]}**:`);
      log(rA.status === 'fulfilled' ? rA.value.content : `Error: ${rA.reason?.message}`);
      log('');
      log(`**${MODEL_B.split('/')[1]}**:`);
      log(rB.status === 'fulfilled' ? rB.value.content : `Error: ${rB.reason?.message}`);
      log('');
      log('---');
      await sleep(6000);
    } catch (e) {
      log(`**ERROR**: ${e.message}`);
    }
  }
}

// ─── Write output ─────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, 'validation-results.md');
fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log(`\n✅ Done. Results → scripts/validation-results.md (${out.length} lines)`);
