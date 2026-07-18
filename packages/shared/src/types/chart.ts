import type { PlanetId, FriendshipStatus } from '../constants/planets';
import type { SignId } from '../constants/signs';
import type { NakshatraName } from '../constants/nakshatras';

export const CHART_SCHEMA_VERSION = '1.0';

// ─── Birth Details ────────────────────────────────────────────────────────────

export interface BirthDetails {
  date: string;        // ISO 8601 date: YYYY-MM-DD
  time: string;        // HH:MM (24-hour)
  place: string;       // Human-readable place name
  latitude: number;    // Decimal degrees, positive = North
  longitude: number;   // Decimal degrees, positive = East
  timezone: string;    // IANA timezone string e.g. "Asia/Kolkata"
  utcOffset: number;   // Minutes offset from UTC at birth
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  gender?: 'Male' | 'Female' | 'Other';
  birthDetails: BirthDetails;
  notes?: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
}

// ─── Astronomy Layer ──────────────────────────────────────────────────────────

export interface AstronomyData {
  julianDay: number;
  ayanamsa: number;         // Lahiri ayanamsa in degrees
  ayanamsaName: 'Lahiri';
  localSiderealTime: number; // In degrees
  ascendantTropical: number; // Tropical longitude of ASC in degrees
  library: string;
  ephemerisVersion: string;
  calculatedAt: string;     // ISO 8601
}

// ─── Planet ──────────────────────────────────────────────────────────────────

export interface PlanetPosition {
  id: PlanetId;
  name: string;
  sanskritName: string;
  symbol: string;
  tropicalLongitude: number;    // 0–360
  siderealLongitude: number;    // 0–360
  latitude: number;
  sign: SignId;
  signIndex: number;            // 0–11
  house: number;                // 1–12
  degreesInSign: number;        // 0–30
  minutesInSign: number;
  nakshatra: NakshatraName;
  nakshatraIndex: number;       // 0–26
  pada: number;                 // 1–4
  isRetrograde: boolean;
  isCombust: boolean;
  isExalted: boolean;
  isDebilitated: boolean;
  isInOwnSign: boolean;
  isInMoolatrikona: boolean;
  naturalBenefic: boolean;
  naturalMalefic: boolean;
  dignity: PlanetDignity;
  friendships: Partial<Record<PlanetId, FriendshipStatus>>;
}

export type PlanetDignity =
  | 'Exalted'
  | 'Moolatrikona'
  | 'OwnSign'
  | 'FriendlySign'
  | 'NeutralSign'
  | 'EnemySign'
  | 'Debilitated';

// ─── House ───────────────────────────────────────────────────────────────────

export interface HouseData {
  number: number;           // 1–12
  sign: SignId;
  signIndex: number;        // 0–11
  lord: PlanetId;
  occupants: PlanetId[];
  themes: string[];
  cuspDegree: number;       // Degree of house cusp in sidereal zodiac
}

// ─── Aspect (Drishti) ────────────────────────────────────────────────────────

export interface AspectData {
  sourcePlanet: PlanetId;
  targetHouse: number;      // 1–12
  targetPlanets: PlanetId[];
  aspectType: number;       // House number counted from source (1=conjunction, 7=opposition, etc.)
  strength: 'Full' | 'ThreeQuarter' | 'Half' | 'Quarter';
  isSpecial: boolean;
  notes?: string;
}

// ─── Conjunction ─────────────────────────────────────────────────────────────

export interface ConjunctionData {
  planets: PlanetId[];
  house: number;
  sign: SignId;
  orbDegrees: number;
}

// ─── Yoga ────────────────────────────────────────────────────────────────────

export interface YogaData {
  id: string;
  name: string;
  detected: boolean;
  strength: 'Strong' | 'Moderate' | 'Weak' | null;
  evidence: string[];
  reference: string;
  category: YogaCategory;
  description: string;
}

export type YogaCategory =
  | 'Raja'
  | 'Dhana'
  | 'Pancha Mahapurusha'
  | 'Lunar'
  | 'Solar'
  | 'Special'
  | 'Neecha Bhanga'
  | 'Parivartana';

// ─── Dosha ───────────────────────────────────────────────────────────────────

export interface DoshaData {
  id: string;
  name: string;
  detected: boolean;
  evidence: string[];
  severity?: 'High' | 'Moderate' | 'Low';
  cancellations: string[];
  reference: string;
  school: string;
  /** Optional structured data for dosha-specific scoring engines. */
  metadata?: Record<string, unknown>;
}

// ─── Dasha ───────────────────────────────────────────────────────────────────

export interface DashaPeriod {
  planet: PlanetId;
  startDate: string;   // ISO 8601
  endDate: string;     // ISO 8601
  durationYears: number;
  antardasha?: DashaPeriod[];
  pratyantar?: DashaPeriod[];  // Third-level periods (Pratyantar / Sookshma Dasha)
}

export interface DashaData {
  system: 'Vimshottari';
  birthNakshatra: NakshatraName;
  birthNakshatraLord: PlanetId;
  nakshatraPadaAtBirth: number;
  balanceDaysAtBirth: number; // Remaining days of dasha at birth
  allPeriods: DashaPeriod[];
  currentMahadasha: DashaPeriod;
  currentAntardasha: DashaPeriod | null;
  currentPratyantar: DashaPeriod | null;  // Current Pratyantar Dasha period
}

// Current planetary transit positions (Gochar)
export interface GocharPlanet {
  id: PlanetId;
  sign: string;
  signIndex: number;
  degree: number;
  nakshatra: string;
  isRetrograde: boolean;
  natalHouse: number;  // Which natal house this transit falls in
}

export interface GocharData {
  computedAt: string;  // ISO 8601
  date?: string;       // YYYY-MM-DD of computation
  planets: GocharPlanet[];
}

// ─── Divisional Charts ───────────────────────────────────────────────────────

export interface DivisionalChartPlanet {
  id: PlanetId;
  sign: SignId;
  signIndex: number;
  house: number;
}

export interface DivisionalChart {
  division: 'D1' | 'D9' | 'D10';
  name: string;
  ascendant: SignId;
  planets: DivisionalChartPlanet[];
}

// ─── KP (Krishnamurti Paddhati) Types ────────────────────────────────────────

export interface KPCusp {
  house: number;
  longitude: number;       // sidereal, 0-360
  sign: SignId;
  signIndex: number;
  degreesInSign: number;   // 0-30
  nakshatra: NakshatraName;
  nakshatraLord: PlanetId;
  subLord: PlanetId;
  subSubLord: PlanetId;
}

export interface KPPlanetInfo {
  planet: PlanetId;
  house: number;           // Placidus house (1-12)
  nakshatraLord: PlanetId;
  subLord: PlanetId;
  subSubLord: PlanetId;
}

export interface KPHouseSignificators {
  house: number;
  // 4 levels of KP signification (ordered strongest → weakest)
  level1: PlanetId[];  // planets physically occupying the house (Placidus)
  level2: PlanetId[];  // planets whose nakshatra lord is a level-1 occupant
  level3: PlanetId[];  // sign lord of this house cusp
  level4: PlanetId[];  // planets whose nakshatra lord is the sign lord
  significators: PlanetId[];  // union of all 4 levels, deduped
}

export interface KPData {
  cusps: KPCusp[];
  planets: KPPlanetInfo[];
  significators: KPHouseSignificators[];
  rulingPlanets: {
    ascStarLord: PlanetId;
    ascSubLord: PlanetId;
    ascSignLord: PlanetId;
    moonStarLord: PlanetId;
    moonSubLord: PlanetId;
    moonSignLord: PlanetId;
    dayLord: PlanetId;
  };
}

// ─── Canonical Chart ─────────────────────────────────────────────────────────

export interface CanonicalChart {
  version: typeof CHART_SCHEMA_VERSION;
  profile: Pick<Profile, 'id' | 'name' | 'gender'>;
  birthDetails: BirthDetails;
  astronomy: AstronomyData;
  ascendant: {
    sign: SignId;
    signIndex: number;
    degree: number;
    minute: number;
    nakshatra: NakshatraName;
    pada: number;
  };
  planets: PlanetPosition[];
  houses: HouseData[];
  aspects: AspectData[];
  conjunctions: ConjunctionData[];
  yogas: YogaData[];
  doshas: DoshaData[];
  dashas: DashaData;
  divisionalCharts: {
    D9: DivisionalChart;
    D10: DivisionalChart;
  };
  kp: KPData;
  metadata: {
    engineVersion: string;
    calculatedAt: string;
    calculationDurationMs: number;
    warnings: string[];
    assumptions: string[];
  };
}

// ─── Storage Types ────────────────────────────────────────────────────────────

export interface StoredChart {
  id: string;
  profileId: string;
  schemaVersion: string;
  chart: CanonicalChart;
  generatedAt: string;
  engineVersion: string;
}

export interface Conversation {
  id: string;
  profileId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  aiModel: string;
  aiProvider: 'nvidia';
  chartStyle: 'north-indian' | 'south-indian';
  animationsEnabled: boolean;
  debugMode: boolean;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'CALCULATION_ERROR'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'AI_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'NOT_FOUND'
  | 'UNEXPECTED_ERROR';

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: MessageRole;
  content: string;
}

export interface AIRequest {
  question: string;
  chartContext: ChartContext;
  conversationHistory: AIMessage[];
  promptVersion: string;
}

export interface ChartContext {
  profile: Pick<Profile, 'name' | 'gender'>;
  birthDetails: BirthDetails;
  ascendant: CanonicalChart['ascendant'];
  planets: Pick<PlanetPosition, 'id' | 'name' | 'sign' | 'house' | 'degreesInSign' |
    'nakshatra' | 'pada' | 'isRetrograde' | 'isCombust' | 'dignity'>[];
  houses: Pick<HouseData, 'number' | 'sign' | 'lord' | 'occupants'>[];
  dashas: {
    current: { planet: PlanetId; endsAt: string };
    antardasha: { planet: PlanetId; endsAt: string } | null;
    pratyantar?: { planet: PlanetId; endsAt: string } | null;
    upcomingPeriods?: Array<{
      level: 'Mahadasha' | 'Antardasha';
      planet: PlanetId;
      startsAt: string;
      endsAt: string;
    }>;
  };
  yogas: Pick<YogaData, 'name' | 'detected' | 'strength'>[];
  doshas: Pick<DoshaData, 'name' | 'detected' | 'severity'>[];
  aspects: Pick<AspectData, 'sourcePlanet' | 'targetHouse' | 'targetPlanets' | 'strength'>[];
  gochar?: Pick<GocharPlanet, 'id' | 'sign' | 'natalHouse' | 'isRetrograde' | 'nakshatra'>[];
}
