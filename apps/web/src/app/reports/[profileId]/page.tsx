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
import { Badge } from '@/components/ui/badge';
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

// ─── Report configuration ─────────────────────────────────────────────────────

const REPORT_META: Record<ReportType, { title: string; subtitle: string; icon: React.ReactNode }> = {
  career:  { title: 'Career & Profession', subtitle: '10th house, dashas, timing', icon: <Briefcase size={16} /> },
  love:    { title: 'Love & Marriage',      subtitle: '7th house, Venus, timing',   icon: <Heart size={16} /> },
  wealth:  { title: 'Wealth & Finance',     subtitle: '2nd, 11th, Dhana yogas',     icon: <Coins size={16} /> },
  health:  { title: 'Health & Vitality',    subtitle: 'Lagna, 6th, 8th house',      icon: <Stethoscope size={16} /> },
};

const REPORT_TYPES: ReportType[] = ['career', 'love', 'wealth', 'health'];

// ─── Section prompts ──────────────────────────────────────────────────────────

const INSTRUCTION_PREAMBLE = `
ANALYSIS RULES — FOLLOW STRICTLY:

DATA FIDELITY (most important):
- Use ONLY the planetary positions, house occupants, and aspects listed in the CHART DATA section below
- ASPECTS: Only state aspects that are explicitly listed in the "Planetary Aspects (Drishti)" section. Do not invent aspects.
- CONJUNCTIONS: Planets in the same house are CONJUNCT. They do not "aspect" each other. Never say "X aspects Y" if they share a house.
- DIGNITY: Own sign / Moolatrikona = STRONG (not neutral). Read the dignity label from the chart data and use it exactly.
- HOUSE OCCUPANCY: If a house shows "(empty)", do not place any planet in it. If it shows occupants, use those exactly.

ANALYSIS QUALITY:
- Every statement must cite specific chart data (house number, planet name, sign, degree)
- State confidence on EVERY prediction: [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE]
- Do NOT soften negative indicators. Honest analysis serves the person better than false comfort
- For timing: analyze Mahadasha → Antardasha → Pratyantar → Gochar in sequence
- Be specific about time windows. Avoid vague phrases like "in the future" or "someday"

OUTPUT:
- MINIMUM 800 words for this section. Do not stop until every sub-topic listed is fully covered
- CRITICAL: Never truncate mid-sentence or mid-analysis. If approaching your output limit, wrap up with a summary paragraph — but do not stop abruptly
- Write in clear prose with paragraph breaks. This is a professional report
`.trim();

function makePrompt(instruction: string, chartCtx: string): string {
  return `${INSTRUCTION_PREAMBLE}\n\n${instruction}\n\n---\nCHART DATA:\n${chartCtx}`;
}

interface SectionDef {
  id: string;
  title: string;
  prompt: (ctx: string) => string;
}

function getSections(type: ReportType): SectionDef[] {
  const defs: Record<ReportType, SectionDef[]> = {
    career: [
      {
        id: 'c1', title: '1. Natal Career Architecture',
        prompt: ctx => makePrompt(`Analyze the natal career architecture in depth:

House-by-house analysis:
• 10th house (Karma Bhava): exact sign, degree of cusp, lord's placement (sign, house, aspects received and given), all planets in 10th and their impact
• 10th lord's strength: is it exalted, own sign, friendly, neutral, enemy, or debilitated? Aspects it receives from benefics vs malefics
• 6th house (service, competition, daily work): its condition, lord's placement, what it reveals about work environment
• 2nd house (accumulated income, speech in career): lord's position, planets present
• 11th house (gains, fulfillment): lord's strength, aspects
• Interconnections: does 10th lord aspect the 2nd or 11th? Does 11th lord support career houses?

What career fields are strongly indicated by this chart based on the signs, lords, and occupying planets? Name specific domains.`, ctx),
      },
      {
        id: 'c2', title: '2. Career Significator Planets',
        prompt: ctx => makePrompt(`Analyze every career-significant planet from the natal chart in depth:

Sun — authority, government, leadership, healthcare administration, politics:
• Sign, house, nakshatra, degree
• Dignity (exalted/own/friend/neutral/enemy/debilitated)
• Aspects from benefics (Jupiter, Venus, Mercury, Moon) vs malefics (Saturn, Mars, Rahu, Ketu)
• What career domains does Sun's position activate for this person?

Saturn — profession in general (it is the natural Karaka of career), discipline, law, construction, labor relations, judiciary, agriculture, oil, minerals:
• Same depth of analysis

Mercury — intellect, communication, writing, accounting, IT, analysis, commerce:
• Same depth

Mars — engineering, military, surgery, athletics, real estate, firefighting, initiative:
• Same depth

Jupiter — education, law, counseling, banking, finance, advisory, management, medicine:
• Same depth

For each: what does its condition reveal about this person's professional strengths or weaknesses? Be explicit.`, ctx),
      },
      {
        id: 'c3', title: '3. Career Yogas & Special Combinations',
        prompt: ctx => makePrompt(`Thoroughly analyze career-relevant yogas and combinations from the supplied chart data:

Raja Yogas present:
• Identify each one precisely: which lords are involved, which houses they connect, how strong is the yoga (planets in own/exalted vs weakened signs)?
• What specific career elevation do they promise?

Dharma-Karmadhipati Yoga:
• Analyze the 9th lord and 10th lord relationship — are they conjunct, mutually aspecting, or in exchange?
• This yoga between fortune and career is critical for career height

Pancha Mahapurusha Yogas:
• Sasha Yoga (Saturn in Kendra in own/exaltation): authority, organization, power
• Ruchaka Yoga (Mars in Kendra in own/exaltation): courage, military, leadership
• Hamsa Yoga (Jupiter in Kendra in own/exaltation): wisdom, justice, teaching
• Malavya Yoga (Venus in Kendra in own/exaltation): arts, luxury, finance
• Bhadra Yoga (Mercury in Kendra in own/exaltation): intellect, trade, writing
Which of these are present? What do they specifically add to career prospects?

Neecha Bhanga (cancellation of debilitation):
• Any debilitated planet with cancellation? What does this mean for career?

Parivartana (mutual exchange):
• Any exchange involving career houses (1, 2, 6, 10, 11)?

Viparita Raja Yoga:
• Lord of 6/8/12 in another dusthana? This paradoxically gives material success.

Overall assessment: Based on the yogas present, rate the career potential as Excellent / Good / Moderate / Weak and justify with specific yogas.`, ctx),
      },
      {
        id: 'c4', title: '4. Dasha Timing for Career',
        prompt: ctx => makePrompt(`Provide exhaustive dasha timing analysis for career:

MAHADASHA ANALYSIS:
Current Mahadasha lord — analyze deeply:
• Which houses does it rule in this chart? (This determines what domains of life it activates)
• Which house does it occupy? (This is where it acts)
• What is its strength/dignity?
• What aspects does it receive?
• Is this Mahadasha lord a natural benefic or malefic for THIS specific chart (functional benefic/malefic)?
• Career verdict for this Mahadasha period: supportive, neutral, or challenging? With evidence.

ANTARDASHA ANALYSIS:
Current Antardasha lord — same detailed treatment:
• Its rulership, occupation, strength
• Its relationship with the Mahadasha lord (natural friend/neutral/enemy)
• Specific career implications of this Antardasha
• Which months within the current Antardasha are stronger vs weaker for career?

PRATYANTAR ANALYSIS:
Current Pratyantar lord:
• Immediate career conditions in the coming weeks
• Is this a time to push forward or consolidate?

UPCOMING DASHA PERIODS (next 1-5 years):
For each upcoming Antardasha and any upcoming Mahadasha change:
• Which houses does the incoming lord rule?
• Is the transition favorable or challenging for career?
• Identify the single best career window in the next 5 years with reasoning

Provide confidence levels for each timing assessment.`, ctx),
      },
      {
        id: 'c5', title: '5. Gochar (Transit) Analysis for Career',
        prompt: ctx => makePrompt(`Analyze current planetary transits (Gochar) for career impact:

SATURN TRANSIT:
• Which natal house is Saturn currently transiting?
• Is it in its own sign, exaltation, debilitation, or neutral sign?
• What specific career impact does this transit have?
• How long will this transit last (Saturn moves ~1 sign per 2.5 years)?
• Is Sade Sati active? (Saturn in 12th, 1st, or 2nd from natal Moon)

JUPITER TRANSIT:
• Which natal house is Jupiter transiting?
• Jupiter in 2nd, 5th, 9th, 10th, or 11th from Lagna = generally favorable
• What career blessing or expansion does this transit bring?
• Jupiter transits last ~12 months per sign

RAHU-KETU AXIS:
• Which natal houses are Rahu and Ketu in currently?
• Rahu's transit over 10th = career disruption and unconventional opportunities
• What specific disruptions or sudden changes does this axis indicate?

MARS TRANSIT:
• Where is Mars transiting? If over 10th, expect career activity (positive or challenging)

COMBINED TRANSIT + DASHA VERDICT:
Do current transits reinforce or contradict the dasha indications? What is the NET career environment right now?

State specific timing: "This transit lasts until approximately [timeframe]"`, ctx),
      },
      {
        id: 'c6', title: '6. Career Predictions — Final Analysis',
        prompt: ctx => makePrompt(`Provide the final comprehensive career synthesis. This is the most important section.

PART A — NATAL CHART CAREER SUMMARY:
• Overall career strength rating: Excellent / Good / Moderate / Weak (with evidence from yogas, house conditions, significator strengths)
• Primary career domains suited to this chart (name specific fields/industries)
• Core professional strengths backed by specific planetary combinations
• Core professional challenges backed by specific planetary combinations

PART B — TIMING PREDICTIONS (be specific):
Near term (next 6 months):
• What is the career trajectory? [Confidence level + evidence]
• Any significant career events expected? [Confidence + timing evidence]

Medium term (1-3 years):
• Major career developments indicated [Confidence level + evidence]
• Best window for job change, promotion, or new venture [Confidence level]
• Any difficult periods requiring caution? [Confidence level + evidence]

Long term (3-7 years):
• Peak career period and what it looks like [Confidence level]
• Overall career arc based on dasha sequence

PART C — ACTIONABLE GUIDANCE:
Based specifically on this chart (not generic advice):
• What career actions are aligned with this chart's planetary patterns?
• What to avoid based on planetary weaknesses?
• Which timing windows are ideal for major career moves?

For EVERY prediction, label: [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE] and give the astrological evidence behind the rating. Be honest if the chart shows limited career elevation — accurate analysis is the goal.`, ctx),
      },
    ],

    love: [
      {
        id: 'l1', title: '1. Natal Relationship Architecture',
        prompt: ctx => makePrompt(`Analyze the natal relationship architecture in depth:

House-by-house analysis:
• 7th house (Kalatra Bhava — spouse and partnership): exact sign on 7th cusp, 7th lord's placement (sign, house, all aspects received and given), planets in 7th house and their precise impact on marriage
• 7th lord's strength and dignity: is it supporting or undermining marriage?
• 5th house (romance, love affairs, purva punya): its condition, lord's placement, what it reveals about romantic experiences
• 2nd house (family life, marital harmony through family): lord's strength
• 11th house (fulfillment of desires, social relationships): its role in relationship fulfillment
• 8th house (spouse's wealth, longevity of marriage, transformations in relationships): its condition

Describe the type of spouse and relationship indicated: what qualities does the 7th house sign suggest about the partner? What does the 7th lord's placement in a specific house reveal about where the spouse will come from or the nature of partnership?`, ctx),
      },
      {
        id: 'l2', title: '2. Relationship Significator Planets',
        prompt: ctx => makePrompt(`Deep analysis of relationship significator planets:

VENUS (prime significator of love and marriage for all charts):
• Sign, house, nakshatra, exact degree
• Dignity — exalted in Pisces, own in Taurus/Libra, debilitated in Virgo
• Aspects from malefics (Saturn, Rahu, Mars, Sun) that afflict Venus = relationship challenges
• Aspects from benefics (Jupiter, Moon) that protect Venus = harmonious relationships
• Is Venus combust (within 10° of Sun)? Combust Venus weakens relationship prospects significantly
• What does Venus's condition reveal about the person's love life and relationship capacity?

MOON (emotional nature, receptivity, compatibility):
• Its sign, house, and nakshatra
• Is Moon waxing or waning? (waxing = stronger)
• Afflictions from Rahu (Graha Yuddha or conjunction), Saturn, Mars on Moon
• Moon's strength reveals emotional stability and compatibility capacity

MARS (desire, passion, sexual energy — and the Manglik factor):
• Its placement, house rulership, and aspects
• Relationship between Mars and Venus (do they aspect each other? Conjunction?)
• Mars's influence on the 7th house or 7th lord?

JUPITER (natural significator of husband for female charts; expansion of blessings):
• Its placement and aspect on 7th house or Venus

RAHU (unconventional relationships, foreign connections, sudden attractions):
• Its position and influence on relationship houses`, ctx),
      },
      {
        id: 'l3', title: '3. Marriage Yogas, Doshas & Cancellations',
        prompt: ctx => makePrompt(`Analyze marriage yogas, doshas, and their cancellations thoroughly:

MANGLIK DOSHA ANALYSIS:
• Is Mars in 1st, 4th, 7th, 8th, or 12th house? (Parashari school, from Lagna only)
• If present: what is its severity? (Mars in own sign/exaltation = reduced severity)
• Cancellations present: Mars in its own sign? Mars with Jupiter? Mars in signs of Saturn? Partner also Manglik?
• What does the presence or absence of Manglik Dosha mean for this person's marriage?

MARRIAGE YOGAS PRESENT:
• Any Raja Yoga involving the 7th lord?
• Parivartana (exchange) between 7th lord and any other lord?
• 5th lord and 7th lord relationship — romance leading to marriage?
• Venus and Jupiter's mutual relationship?

AFFLICTIONS TO MARRIAGE:
• Saturn aspecting or occupying 7th house: delay in marriage (classic indicator)
• Rahu in 7th: unconventional marriage, possible intercaste/foreign spouse
• Multiple malefics afflicting 7th house or Venus: marriage challenges
• 7th lord in 6/8/12: challenges in marriage quality or timing

INDICATORS OF DELAYS, MULTIPLE MARRIAGES, OR SEPARATION:
• Be explicit if these are present in the chart — honesty is required
• What cancellations exist if any?

Overall marriage prospect rating: Favorable / Moderately favorable / Challenged (with evidence)`, ctx),
      },
      {
        id: 'l4', title: '4. Dasha Timing for Marriage & Relationships',
        prompt: ctx => makePrompt(`Exhaustive dasha timing analysis for marriage and relationships:

MAHADASHA ANALYSIS:
Current Mahadasha lord:
• Does it rule or occupy 7th, 5th, or 11th house? If yes, marriage/relationships are activated
• What is its relationship with Venus?
• Is this a marriage-triggering Mahadasha? Why or why not? [With evidence and confidence level]

ANTARDASHA ANALYSIS:
Current Antardasha lord:
• Its relationship with 7th house or Venus
• Marriage periods in classical Jyotish: Antardasha of 7th lord, Venus, or planets in 7th
• What does the current Antardasha indicate for relationships right now?

PRATYANTAR ANALYSIS:
Current Pratyantar lord:
• Immediate relationship conditions — weeks/months timescale

MARRIAGE TIMING ANALYSIS — UPCOMING PERIODS:
Classic marriage triggers in Jyotish:
1. Dasha/Antardasha of the 7th lord
2. Dasha/Antardasha of Venus
3. Dasha/Antardasha of planets occupying the 7th house
4. Dasha/Antardasha of the Darakaraka (planet with lowest degree — often Venus/Moon)

From the upcoming dasha sequence provided:
• Which upcoming periods fit the above triggers?
• Identify the PRIMARY marriage window with reasoning [Confidence level]
• Identify a SECONDARY window if the primary passes [Confidence level]
• Are there periods ahead that suggest relationship difficulties? Be explicit.`, ctx),
      },
      {
        id: 'l5', title: '5. Transit (Gochar) Analysis for Marriage',
        prompt: ctx => makePrompt(`Analyze current and upcoming transits for marriage and relationships:

JUPITER TRANSIT (most important marriage trigger):
• Which natal house is Jupiter currently transiting?
• Jupiter transiting 7th house, or aspecting natal Venus by 5th or 9th aspect = high marriage potential
• Jupiter transiting 2nd, 5th, 11th from Lagna = favorable for marriage
• How long does this Jupiter transit last? When does it move to the next sign?

SATURN TRANSIT:
• Saturn over 7th house: serious relationships, marriage with delays, stable but tested partnerships
• Saturn's current position relative to natal Venus: conjunction or aspect delays romance
• Is Sade Sati affecting the natal Moon sign? This can delay marriage during peak Sade Sati

VENUS TRANSIT:
• Venus is fast-moving (about 25 days per sign normally)
• Current Venus transit — is it triggering natal 5th or 7th house?

RAHU-KETU AXIS:
• Rahu over natal Venus or 7th house = sudden unconventional relationships
• Ketu over 7th = detachment from relationships

COMBINED TRANSIT + DASHA ASSESSMENT:
• Do current transits support or delay marriage?
• When is the next high-probability marriage window combining dasha + transit triggers?
• State specific approximate timing (month and year ranges, not exact dates)`, ctx),
      },
      {
        id: 'l6', title: '6. Marriage & Love — Final Analysis',
        prompt: ctx => makePrompt(`Comprehensive final synthesis for love and marriage.

PART A — NATAL RELATIONSHIP PROFILE:
• Overall relationship/marriage potential: Excellent / Good / Moderate / Challenging (with evidence)
• Partner profile indicated by the chart: What qualities, background, and nature does the 7th house sign and lord suggest about the ideal partner?
• Relationship patterns: Is this person inclined toward stable/traditional relationships? Passionate/intense? Unconventional? Delayed but lasting? (Cite planetary evidence)
• Emotional compatibility style: What does the Moon's condition reveal about emotional needs in a relationship?

PART B — MARRIAGE TIMING PREDICTIONS:
• Primary marriage window: [Month/Year range, Confidence level, Evidence — which dasha + transit combination triggers it]
• Secondary window: [Same format]
• If marriage is delayed past these windows: why, and what happens then?
• Any indicators of relationship difficulties, separation, or unconventional marriage? State honestly.

PART C — RELATIONSHIP DYNAMICS AFTER MARRIAGE:
• What does the chart indicate about marital harmony? (7th lord strength, Venus condition, 8th house)
• Potential areas of conflict vs harmony in the marriage
• Financial dynamics with spouse (8th house analysis)

PART D — ACTIONABLE GUIDANCE:
• Based specifically on this chart's planetary patterns, what relationship approaches serve this person best?
• What to be cautious about in relationships based on afflictions?
• What timing is ideal for actively seeking marriage?

Label every prediction: [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE] with full evidence.`, ctx),
      },
    ],

    wealth: [
      {
        id: 'w1', title: '1. Natal Wealth Architecture',
        prompt: ctx => makePrompt(`Analyze the natal wealth architecture in exhaustive detail:

House-by-house analysis:
• 2nd house (Dhana Bhava — accumulated wealth, savings, family wealth): exact sign, lord placement, aspects, planets in 2nd and their financial impact
• 2nd lord's strength: exalted/own/friend/enemy/debilitated? What source of wealth does its placement in a specific house indicate?
• 11th house (Labha Bhava — income, gains, fulfillment of financial desires): sign, lord, occupants, all aspects
• 11th lord's strength and what its house placement indicates about income sources
• 5th house (investments, speculation, gambling, creativity income, royalties): its condition
• 9th house (fortune, luck, inherited wealth, father's wealth): its condition
• 8th house (inheritance, insurance, sudden windfalls, spouse's wealth, hidden resources): its condition
• 12th house (expenditure, foreign income, investment outflows): how it balances with income houses

Overall: Are the wealth houses (2nd, 11th) strong and supported, or afflicted and weak? Is the 2nd lord in a kendra (power) or dusthana (difficulty)?`, ctx),
      },
      {
        id: 'w2', title: '2. Financial Significator Planets',
        prompt: ctx => makePrompt(`Deep analysis of wealth significator planets:

JUPITER (natural Karaka of wealth, expansion, abundance):
• Sign, house, nakshatra, degree
• Is Jupiter strong (exalted in Cancer, own in Sagittarius/Pisces)?
• Aspects from malefics that weaken Jupiter's wealth-giving capacity
• Which wealth houses does Jupiter rule in this chart? Which does it occupy?
• Does Jupiter aspect the 2nd, 5th, 9th, or 11th house? (direct wealth indication)

VENUS (luxury, material comfort, physical wealth, artistic income):
• Its sign, house, strength
• Does Venus rule the 2nd or 11th? Does it occupy them?
• Its relationship with the wealth houses

MERCURY (business acumen, trade, financial intelligence, communication income):
• Sign, house, strength
• Its role in this person's financial profile

MOON (liquid assets, fluctuating wealth, emotional relationship with money):
• Moon's strength: waxing/waning, sign placement, aspects
• Moon in wealth houses vs dusthanas

SATURN (slow but steady accumulation, hard work income, real estate, mining):
• Its condition and house placement relevant to wealth

RAHU (sudden unconventional wealth, foreign income, speculative gains):
• Where is Rahu? Does it amplify or disrupt wealth houses?`, ctx),
      },
      {
        id: 'w3', title: '3. Dhana Yogas & Wealth Combinations',
        prompt: ctx => makePrompt(`Identify and analyze every wealth-related yoga in this chart:

DHANA YOGAS (classical wealth combinations):
Rule: Lords of 2nd and 11th in conjunction, mutual aspect, or exchange = Dhana Yoga
• Identify ALL Dhana Yogas present by examining relationships between 2nd lord, 11th lord, 5th lord, 9th lord
• For each Dhana Yoga found: state how strong it is (both planets strong = powerful yoga; one or both weakened = reduced results)

LAKSHMI YOGA:
• Lord of 9th in own sign/exaltation, Venus strong and in kendra/trikona = Lakshmi Yoga for great wealth
• Is this present? What wealth level does it indicate?

RAJA YOGAS WITH FINANCIAL IMPACT:
• Which Raja Yogas are present? Do they involve lords of 2nd or 11th (adding financial elevation)?

PANCHA MAHAPURUSHA YOGAS and wealth:
• Which are present and what financial domains do they activate?

VIPARITA RAJA YOGA:
• Lord of 6/8/12 in another dusthana = paradoxical material success
• If present, what wealth pattern does it indicate?

NEGATIVE COMBINATIONS TO NOTE:
• 2nd lord in 12th (expenditure erodes savings)
• 11th lord in 6/8/12 (income challenged)
• Malefics in 2nd without mitigation (wealth damaged)
• Saturn in 2nd (delayed wealth accumulation — but steady eventually)

Rate overall wealth potential: Exceptional / Strong / Moderate / Limited — with evidence from yogas.`, ctx),
      },
      {
        id: 'w4', title: '4. Dasha Timing for Wealth',
        prompt: ctx => makePrompt(`Exhaustive dasha timing analysis for wealth accumulation:

MAHADASHA ANALYSIS:
Current Mahadasha lord:
• Does it rule or occupy 2nd, 11th, 5th, or 9th house (wealth triggers)?
• Does it rule or occupy 6th, 8th, or 12th (wealth challenges)?
• Its natural signification for wealth (Jupiter Mahadasha = expansive; Saturn = hard-earned; Rahu = sudden)
• Overall wealth verdict for this Mahadasha: growth period, consolidation, or challenge?

ANTARDASHA ANALYSIS:
Current Antardasha lord:
• Its specific financial implications for the next months
• Its relationship with the Mahadasha lord — friend/neutral/enemy
• Does this Antardasha activate any Dhana Yoga?

PRATYANTAR ANALYSIS:
Current Pratyantar lord:
• Immediate financial conditions in the coming weeks — favorable for transactions, investments, or caution?

UPCOMING WEALTH PERIODS:
For the next 5 years, identify:
• Best wealth-generating periods (which upcoming dashas activate 2nd/11th lords?)
• Periods of expenditure or financial caution (6/8/12 lord activations)
• The single peak wealth period in the next decade and why

SOURCES OF WEALTH TIMING:
When are different income sources most likely activated?
• Business vs. employment vs. investments vs. speculation vs. inheritance — when does each get activated by dashas?

Label all timing predictions with confidence levels and astrological evidence.`, ctx),
      },
      {
        id: 'w5', title: '5. Transit (Gochar) Analysis for Finance',
        prompt: ctx => makePrompt(`Analyze current planetary transits for financial impact:

JUPITER TRANSIT (biggest financial transit indicator):
• Which natal house is Jupiter transiting NOW?
• Jupiter over 2nd: wealth growth, savings increase
• Jupiter over 5th: investment gains, speculative success
• Jupiter over 9th: fortune and luck activated
• Jupiter over 11th: maximum income gains (most positive for wealth)
• Jupiter over 8th: inheritance, windfall possible but also expenditure
• Current Jupiter transit assessment — favorable, neutral, or challenging for finance?
• When does Jupiter move to the next sign (approximate)?

SATURN TRANSIT:
• Current position: which natal house?
• Saturn over 2nd: delays in financial growth but also disciplined savings
• Saturn over 11th: income restricted or delayed
• Saturn over 8th: inheritance or loss depending on chart strength
• How does current Saturn transit affect this person's finances?

RAHU TRANSIT:
• Rahu over 2nd or 11th: sudden financial changes (can be dramatic gains or losses)
• Current Rahu position and financial implications

MARS TRANSIT:
• Mars over 2nd: quick financial activity
• Mars over 11th: aggressive income generation

NET FINANCIAL TRANSIT PICTURE:
• Do current transits support wealth accumulation or indicate financial caution?
• Any upcoming major transit events to watch? (Jupiter entering a key house in the coming months)`, ctx),
      },
      {
        id: 'w6', title: '6. Wealth Predictions — Final Analysis',
        prompt: ctx => makePrompt(`Comprehensive final wealth analysis — be thorough and honest.

PART A — NATAL WEALTH PROFILE:
• Overall wealth potential rating: Exceptional / Strong / Moderate / Limited (with complete evidence from yogas, house conditions, planet strengths)
• Primary wealth sources indicated by this chart: service income, business, investments, speculation, inheritance, real estate, foreign income, creative work? (Cite specific planetary evidence for each)
• Financial strengths: What specific planetary combinations protect and grow wealth?
• Financial challenges: What specific combinations create delays, losses, or expenditure?

PART B — WEALTH TIMING PREDICTIONS:
Near term (next 6 months):
• Financial trajectory [Confidence + Evidence]
• Any significant financial events expected? [Confidence + Evidence]

Medium term (1-3 years):
• Major wealth accumulation periods [Confidence + Evidence]
• Best windows for investments, business ventures, property purchase [Confidence + Evidence]
• Periods requiring financial caution [Confidence + Evidence]

Long term (3-7 years):
• Peak wealth accumulation period in this timeframe [Confidence + Evidence]
• Overall financial arc based on dasha sequence

PART C — FINANCIAL STRATEGY (chart-specific):
• What investment or income approach is most aligned with this chart's planetary patterns?
• Which financial domains to focus on based on strong planetary indicators?
• What financial risks to avoid based on chart weaknesses?
• What timing windows are ideal for major financial decisions?

Label EVERY prediction: [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE] with astrological evidence. Do not round up — if wealth is limited or delayed, state it clearly.`, ctx),
      },
    ],

    health: [
      {
        id: 'h1', title: '1. Constitution & Physical Vitality',
        prompt: ctx => makePrompt(`Analyze the physical constitution and vital force in depth:

LAGNA ANALYSIS (1st house — the body itself):
• The Lagna sign determines the basic body type and constitutional tendencies
• Lagna lord: its sign placement, house, strength — the Lagna lord is the karaka of the physical body; its weakness = constitutional vulnerability
• Is the Lagna lord in a kendra (strong), trikona (protected), or dusthana (weakened)?
• Planets in the 1st house: benefics strengthen vitality; malefics create constitutional stress
• Aspects to the 1st house: malefics aspecting Lagna without benefic mitigation = health challenges

LAGNA LORD STRENGTH:
• Exalted, own sign, friendly, neutral, enemy, or debilitated?
• Aspects it receives
• What body systems does its sign rulership govern?

6TH HOUSE (disease, illness, enemies of health):
• 6th house sign: what diseases are classically associated with this sign?
• 6th lord placement: in which house? A strong 6th lord in a powerful house = more health challenges
• Planets in 6th: each planet in 6th relates to specific body systems being stressed

8TH HOUSE (chronic conditions, longevity, acute crises):
• 8th house sign and condition
• 8th lord placement

12TH HOUSE (hospitalization, hidden ailments, confinement):
• Its condition and impact

DISCLAIMER: All analysis is Jyotish interpretation only. Always consult medical professionals for health decisions.`, ctx),
      },
      {
        id: 'h2', title: '2. Health Significator Planets',
        prompt: ctx => makePrompt(`Analyze each health-significant planet in detail:

SUN (vitality, heart, spine, right eye, bones, immunity, father's health):
• Sign, house, nakshatra, degree
• Sun's strength is the fundamental vitality indicator — a strong Sun = robust constitution
• Afflictions from Saturn (chronic stress on Sun = heart, bone issues), Rahu (Sun + Rahu = unusual health complaints), Mars (inflammation)
• What does Sun's condition reveal about core vitality?

MOON (mind, emotions, blood, stomach, lymphatic system, left eye, fluids, mother's health):
• Moon's strength (waxing much stronger than waning, own sign Cancer = strongest)
• Mental health indicator — afflicted Moon (Saturn, Rahu, Mars) = emotional instability, anxiety, depression risk
• Moon's nakshatra and its health implications

MARS (blood, muscles, accidents, surgery, inflammation, fever, bile, right brain):
• In 6th house: prone to competitive injuries and inflammation
• Mars aspects 4th, 7th, 8th from itself — what does it aspect in this chart?
• Combust Mars with Sun: heightened accident risk

SATURN (chronic diseases, bones, teeth, joints, nervous system, skin, arthritis, depression):
• Saturn in 1st, 6th, 8th: significant health indicator
• Saturn aspecting the Moon: chronic mental health stress
• Saturn's sign placement determines the type of chronic tendency

RAHU (mysterious illnesses, poisons, viral infections, unusual conditions, mental confusion):
• Rahu in 6th, 8th, 12th: significant health indicator requiring analysis

KETU (spiritual health, mysterious ailments, immune disorders, detachment):
• Ketu's placement and health implications`, ctx),
      },
      {
        id: 'h3', title: '3. Disease Patterns & Specific Indicators',
        prompt: ctx => makePrompt(`Analyze specific disease patterns and health indicators:

ANALYSIS OF 6TH HOUSE SIGN (what diseases are indicated):
• Aries 6th: head injuries, fevers, inflammatory conditions, accidents
• Taurus 6th: throat, thyroid, neck-related conditions
• Gemini 6th: respiratory, nervous system, shoulders, hands
• Cancer 6th: digestive, stomach, chest, emotional eating
• Leo 6th: heart, spine, back problems, ego-related stress
• Virgo 6th: intestinal, digestive, anxiety disorders, skin allergies
• Libra 6th: kidney, urinary, lower back, hormonal balance
• Scorpio 6th: reproductive organs, sexual health, infections, hidden conditions
• Sagittarius 6th: hips, liver, sciatic, respiratory
• Capricorn 6th: bones, joints, knees, chronic conditions, dental
• Aquarius 6th: ankles, circulation, nervous disorders, unconventional conditions
• Pisces 6th: feet, lymphatic, addiction susceptibility, psychosomatic conditions

Identify which sign occupies the 6th in this chart and analyze accordingly.

CLASSICAL HEALTH COMBINATIONS:
• Moon + Saturn conjunction or aspect: chronic melancholy, depression tendency
• Mars + Saturn: accidents and chronic inflammation, possible surgical events
• Sun + Rahu: unusual vitality fluctuations, possible hidden health issues
• Saturn in Lagna: chronic nature of health challenges but long life
• Malefics in 8th without mitigation: longevity concerns

MENTAL HEALTH INDICATORS:
• Moon's overall condition (sign, house, waxing/waning, aspects)
• Mercury's condition (nervous system, communication-related anxiety)
• Jupiter's aspect on Moon or Lagna (protective for mental health)

DOSHAS DETECTED IN CHART:
• What doshas are present and what are their health implications?

DISCLAIMER: Jyotish analysis only — not medical diagnosis or advice.`, ctx),
      },
      {
        id: 'h4', title: '4. Dasha Timing for Health',
        prompt: ctx => makePrompt(`Exhaustive dasha timing analysis for health:

MAHADASHA HEALTH ANALYSIS:
Current Mahadasha lord:
• Does it rule the 6th, 8th, or 12th house? If yes, this Mahadasha carries health sensitivity
• Does it rule the 1st, 5th, or 9th? If yes, vitality and protection are strengthened
• Is the Mahadasha lord a natural health-challenge planet (Saturn, Rahu, Ketu, Mars)?
• What is the Mahadasha lord's condition (strong/weak)?
• Health verdict for this Mahadasha: robust, moderate health, or requiring vigilance?

ANTARDASHA HEALTH ANALYSIS:
Current Antardasha lord:
• Does it activate the 6th, 8th, or 12th house?
• Its condition and what it means for health in the near term

PRATYANTAR HEALTH ANALYSIS:
Current Pratyantar lord:
• Immediate health conditions in the coming weeks
• Any acute health sensitivity in this Pratyantar period?

UPCOMING HEALTH-SENSITIVE PERIODS:
Identify periods in the next 5 years where:
• 6th lord becomes active (disease period)
• 8th lord becomes active (acute crisis or transformation period)
• 12th lord becomes active (hospitalization risk period)
• Lagna lord or 1st house is strongly supported (recovery and vitality periods)

HEALTH RECOVERY PERIODS:
When is vitality strongest and recovery most supported?
• Periods of Jupiter Mahadasha/Antardasha (if favorable in chart)
• Periods when Lagna lord becomes active
• Periods of benefic transit support over Lagna

IMPORTANT: Health dasha timing indicates SENSITIVITY periods requiring vigilance, not certainty of illness. Label all timing predictions with confidence levels.`, ctx),
      },
      {
        id: 'h5', title: '5. Transit Analysis for Health',
        prompt: ctx => makePrompt(`Analyze current planetary transits for health:

SATURN TRANSIT (most significant long-term health transit):
• Which natal house is Saturn transiting?
• Saturn over Lagna: period of physical strain, chronic stress on body
• Saturn over Moon sign: Sade Sati — mental and physical health needs attention
• Saturn over 6th: health challenges from work overload, digestive issues
• Saturn over 8th: acute health events possible, requires extra care
• Is Sade Sati currently active? Which phase (rising/peak/setting)?
• How long does this Saturn transit last?

JUPITER TRANSIT (health protector):
• Jupiter aspecting the Lagna or Lagna lord protects health
• Jupiter in 5th or 9th from Lagna = general health blessings
• Is Jupiter currently supporting or neutral to health in this chart?

RAHU-KETU TRANSIT:
• Rahu over Lagna or Moon: mental health stress, unusual health events
• Ketu over 1st or 8th: mysterious ailments, spiritual health challenges
• Current axis and its health implications

MARS TRANSIT:
• Mars over 6th (from natal Lagna or Moon): inflammation, accident potential
• Mars over 8th: surgical or acute health events
• Current Mars position and its duration

NET HEALTH TRANSIT PICTURE:
• Are transits currently supporting or stressing health?
• Any upcoming high-risk transit combinations in the next 6-12 months?
• Any upcoming protective transit windows?

State timing for each transit observation.`, ctx),
      },
      {
        id: 'h6', title: '6. Health Predictions — Final Analysis',
        prompt: ctx => makePrompt(`Comprehensive final health analysis — be thorough, honest, and responsible.

PART A — CONSTITUTIONAL HEALTH PROFILE:
• Overall constitutional strength rating: Robust / Moderately strong / Moderate / Delicate (with evidence from Lagna, Lagna lord, Sun condition)
• Primary body systems requiring most attention based on natal chart (cite specific planetary evidence)
• Constitutional vulnerabilities: what recurring health themes does this chart indicate?
• Constitutional strengths: what protects and sustains this person's health?

PART B — MENTAL HEALTH PROFILE:
• Moon's overall condition and what it reveals about emotional and psychological health
• Any chronic mental health tendencies indicated? (cite planets aspecting Moon, Saturn-Moon relationship)
• Periods when mental health is most challenged vs. most stable

PART C — HEALTH TIMING PREDICTIONS:
Near term (next 6 months):
• Health conditions in the current dasha + transit combination [Confidence + Evidence]
• Any health vulnerabilities to be aware of? [Confidence + Evidence]

Medium term (1-3 years):
• Sensitive health periods requiring vigilance [Confidence + Evidence]
• Recovery and vitality periods [Confidence + Evidence]

Long term (3-7 years):
• Overall health trajectory based on dasha sequence
• Any major health-sensitive windows to prepare for

PART D — HEALTH GUIDANCE (chart-specific):
• Based on the chart's planetary patterns, what health practices are most important for this person?
• Which body systems to prioritize for preventive care?
• What lifestyle adjustments are suggested by planetary positions (e.g., Saturn indicators → bone health, dental care, stress management)?

Label ALL predictions: [HIGH CONFIDENCE], [MEDIUM CONFIDENCE], or [LOW CONFIDENCE] with evidence.

MANDATORY DISCLAIMER: This is Jyotish analysis for self-awareness and timing context only. It does not constitute medical advice, diagnosis, or treatment. Always consult qualified medical professionals for health decisions.`, ctx),
      },
    ],
  };

  return defs[type];
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  const generateReport = useCallback(async (reportType: ReportType) => {
    if (!storedChart?.chart) return;

    // Cancel any in-progress generation
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const sections = getSections(reportType);
    const gochar = computeCurrentGochar(storedChart.chart.ascendant.signIndex);
    const ctx = buildChartContext(storedChart.chart, reportType, gochar.planets);
    const chartCtx = serializeChartContext(ctx);

    // Initialize sections as pending
    setReports(prev => ({
      ...prev,
      [reportType]: {
        status: 'generating',
        sections: sections.map(s => ({
          sectionId: s.id,
          title: s.title,
          content: '',
          status: 'pending' as SectionStatus,
        })),
      },
    }));

    for (let i = 0; i < sections.length; i++) {
      if (ctrl.signal.aborted) break;

      const section = sections[i]!;

      // Mark section as generating
      setReports(prev => ({
        ...prev,
        [reportType]: {
          ...prev[reportType]!,
          sections: prev[reportType]!.sections.map((s, idx) =>
            idx === i ? { ...s, status: 'generating' as SectionStatus } : s,
          ),
        },
      }));

      // Attempt the section, retrying once on transient errors (502/504/rate limit)
      let lastError = '';
      let succeeded = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (ctrl.signal.aborted) break;
        if (attempt > 0) {
          // Wait before retry to let the API recover from rate limiting
          await new Promise(r => setTimeout(r, 5000));
        }

        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
              messages: [{ role: 'user', content: section.prompt(chartCtx) }],
              model: 'meta/llama-3.1-70b-instruct',
              stream: true,   // Streaming keeps connection alive — prevents 504 inactivity timeout
              maxTokens: 4096,
            }),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`API error ${response.status}: ${errText}`);
          }

          // Read the SSE stream and accumulate content
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response stream');

          const decoder = new TextDecoder();
          let buf = '';
          let accumulated = '';

          while (true) {
            if (ctrl.signal.aborted) { reader.cancel(); break; }
            const { done, value } = await reader.read();
            if (done) break;

            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (!trimmed.startsWith('data: ')) continue;
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') {
                  accumulated += delta;
                  setReports(prev => ({
                    ...prev,
                    [reportType]: {
                      ...prev[reportType]!,
                      sections: prev[reportType]!.sections.map((s, idx) =>
                        idx === i ? { ...s, content: accumulated } : s,
                      ),
                    },
                  }));
                }
              } catch { /* ignore malformed SSE chunks */ }
            }
          }

          if (!ctrl.signal.aborted) {
            setReports(prev => ({
              ...prev,
              [reportType]: {
                ...prev[reportType]!,
                sections: prev[reportType]!.sections.map((s, idx) =>
                  idx === i ? { ...s, content: accumulated || 'No response received.', status: 'done' as SectionStatus } : s,
                ),
              },
            }));
            succeeded = true;
            break; // success — exit retry loop
          }
        } catch (err) {
          if (ctrl.signal.aborted) break;
          lastError = err instanceof Error ? err.message : 'Section failed';
          if (attempt === 0) {
            addToast({ type: 'error', message: `Section ${i + 1} timed out — retrying…` });
          }
        }
      }

      if (!succeeded && !ctrl.signal.aborted) {
        setReports(prev => ({
          ...prev,
          [reportType]: {
            ...prev[reportType]!,
            sections: prev[reportType]!.sections.map((s, idx) =>
              idx === i ? { ...s, content: lastError || 'Failed after retry.', status: 'error' as SectionStatus } : s,
            ),
          },
        }));
        addToast({ type: 'error', message: `Section ${i + 1} failed after retry — continuing` });
      }

      // Brief pause between sections to stay within NVIDIA rate limits
      if (i < sections.length - 1 && !ctrl.signal.aborted) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!ctrl.signal.aborted) {
      setReports(prev => ({
        ...prev,
        [reportType]: { ...prev[reportType]!, status: 'done' },
      }));
    }
  }, [storedChart, addToast]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    setReports(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated) as ReportType[]) {
        if (updated[key]?.status === 'generating') {
          updated[key] = { ...updated[key]!, status: 'idle' };
        }
      }
      return updated;
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
      '',
      '---',
      '',
      ...state.sections
        .filter(s => s.status === 'done')
        .flatMap(s => [`## ${s.title}`, '', s.content, '', '---', '']),
      '',
      '_Disclaimer: This is Jyotish analysis for educational and self-awareness purposes only. Not a substitute for professional medical, legal, or financial advice._',
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
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-surface-border p-4 space-y-2">
                {REPORT_TYPES.map(t => <Skeleton key={t} className="h-16 rounded-xl" />)}
              </div>
              <div className="flex-1 p-6 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton lines={6} />
              </div>
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
              <ErrorCard title="Profile not found" message="This profile may have been deleted." onRetry={load} />
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
                <Button variant="icon" size="sm" aria-label="Back to chart">
                  <ArrowLeft size={16} />
                </Button>
              </Link>
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
            <div className="flex-1 flex overflow-hidden">
              {/* Left sidebar — report type list */}
              <nav
                className="w-56 shrink-0 border-r border-surface-border bg-surface flex flex-col gap-1 p-3 overflow-y-auto"
                aria-label="Report types"
              >
                <div className="text-2xs font-semibold text-content-muted uppercase tracking-wider px-2 mb-1">
                  Reports
                </div>
                {REPORT_TYPES.map(type => {
                  const meta = REPORT_META[type];
                  const state = reports[type];
                  const isActive = selectedReport === type;
                  const statusColor =
                    state?.status === 'done' ? 'text-green-500' :
                    state?.status === 'generating' ? 'text-accent' :
                    'text-content-subtle';

                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedReport(type)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-3 py-3 text-left transition-colors w-full',
                        isActive
                          ? 'bg-accent-subtle text-accent'
                          : 'text-content-muted hover:text-content hover:bg-surface-elevated',
                      )}
                    >
                      <span className={cn('mt-0.5 flex-shrink-0', isActive ? 'text-accent' : 'text-content-subtle')}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <div className={cn('text-xs font-semibold leading-tight', isActive ? 'text-accent' : 'text-content')}>
                          {meta.title}
                        </div>
                        <div className="text-2xs text-content-subtle mt-0.5 leading-tight truncate">
                          {meta.subtitle}
                        </div>
                        {state && (
                          <div className={cn('text-2xs mt-1 font-medium', statusColor)}>
                            {state.status === 'done' && `✓ ${state.sections.filter(s => s.status === 'done').length} sections`}
                            {state.status === 'generating' && `Generating…`}
                            {state.status === 'idle' && 'Partial'}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Right panel — report content */}
              <div className="flex-1 overflow-y-auto">
                <ReportPanel
                  reportType={selectedReport}
                  state={currentReport ?? null}
                  isGenerating={isGenerating}
                  isDone={isDone}
                  completedSections={completedSections}
                  totalSections={totalSections}
                  onGenerate={() => generateReport(selectedReport)}
                  onCancel={cancelGeneration}
                  onDownload={() => downloadReport(selectedReport)}
                />
              </div>
            </div>
          )}
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}

// ─── Report Panel ─────────────────────────────────────────────────────────────

function ReportPanel({
  reportType,
  state,
  isGenerating,
  isDone,
  completedSections,
  totalSections,
  onGenerate,
  onCancel,
  onDownload,
}: {
  reportType: ReportType;
  state: ReportState | null;
  isGenerating: boolean;
  isDone: boolean;
  completedSections: number;
  totalSections: number;
  onGenerate: () => void;
  onCancel: () => void;
  onDownload: () => void;
}) {
  const meta = REPORT_META[reportType];
  const hasContent = state && state.sections.length > 0;

  return (
    <div className="p-6 max-w-3xl space-y-5 pb-24 md:pb-6">
      {/* Report header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-content-muted">{meta.icon}</span>
            <h2 className="text-base font-semibold text-content">{meta.title}</h2>
          </div>
          <p className="text-xs text-content-muted">
            {hasContent
              ? isGenerating
                ? `Generating section ${completedSections + 1} of ${totalSections}…`
                : isDone
                  ? `${completedSections} sections · Deep Jyotish analysis`
                  : `${completedSections} of ${totalSections} sections complete`
              : 'Comprehensive Jyotish analysis across 6 specialist sections. Each section provides deep evidence-based analysis with explicit confidence levels.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isDone && (
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download size={14} />
              Download
            </Button>
          )}
          {isGenerating ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button
              variant={hasContent ? 'ghost' : 'primary'}
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {hasContent ? <><RefreshCw size={13} /> Regenerate</> : <><Play size={13} /> Generate</>}
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar (during generation) */}
      {isGenerating && (
        <div className="space-y-1.5">
          <div className="h-1 rounded-full bg-surface-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${(completedSections / totalSections) * 100}%` }}
            />
          </div>
          <p className="text-2xs text-content-subtle">
            This may take several minutes. Each section is analyzed independently for maximum depth.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !isGenerating && (
        <div className="rounded-xl border border-dashed border-surface-border bg-surface-elevated p-8 text-center space-y-3">
          <div className="text-3xl" aria-hidden="true">
            {reportType === 'career' ? '💼' : reportType === 'love' ? '❤️' : reportType === 'wealth' ? '💰' : '🏥'}
          </div>
          <div>
            <p className="text-sm font-medium text-content">Generate {meta.title} Report</p>
            <p className="text-xs text-content-muted mt-1 max-w-sm mx-auto leading-relaxed">
              6 sections of deep Jyotish analysis: natal placements, significator planets, yogas,
              dasha timing (Mahadasha→Antardasha→Pratyantar), current transits, and final predictions
              with confidence levels.
            </p>
          </div>
          <Button variant="primary" onClick={onGenerate}>
            <Play size={14} />
            Generate Report
          </Button>
        </div>
      )}

      {/* Sections */}
      {hasContent && (
        <div className="space-y-3">
          {state.sections.map((section) => (
            <SectionCard key={section.sectionId} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: GeneratedSection }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (section.status === 'done') setExpanded(true);
  }, [section.status]);

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      section.status === 'done' ? 'border-surface-border bg-surface-elevated' :
      section.status === 'generating' ? 'border-accent-muted/50 bg-accent-subtle/10' :
      section.status === 'error' ? 'border-red-900/30 bg-red-950/10' :
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
          section.status === 'done' ? 'text-content' :
          section.status === 'generating' ? 'text-accent' :
          'text-content-muted',
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

      {/* Generating pulse */}
      {section.status === 'generating' && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-accent-muted/20">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-2xs text-content-muted">Analyzing — this section may take up to a minute…</span>
        </div>
      )}

      {/* Done: expandable content */}
      {expanded && section.status === 'done' && (
        <div className="px-5 pb-5 border-t border-surface-border">
          <div className="mt-4 text-sm text-content leading-relaxed whitespace-pre-wrap prose-sm">
            {section.content}
          </div>
        </div>
      )}

      {/* Error */}
      {section.status === 'error' && (
        <div className="px-4 pb-3 border-t border-red-900/20">
          <p className="text-2xs text-red-400 mt-2">{section.content}</p>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === 'done')      return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />;
  if (status === 'generating') return <Loader2 size={14} className="text-accent animate-spin flex-shrink-0" />;
  if (status === 'error')      return <span className="text-sm text-red-500 flex-shrink-0 leading-none">✕</span>;
  return <div className="w-3.5 h-3.5 rounded-full border border-surface-border flex-shrink-0" />;
}
