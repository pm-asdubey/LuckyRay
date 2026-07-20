import type { PlanetId } from '@luckyray/shared';

export interface PlanetTheme {
  planet: PlanetId;
  positiveEvents: string[];
  challengingEvents: string[];
  generalVibe: string;
  keywords: string[];
  voiceCharacter: string;
  physicalAssociations: string[];
}

export const PLANET_THEMES: Record<PlanetId, PlanetTheme> = {
  Sun: {
    planet: 'Sun',
    positiveEvents: [
      'recognition or promotion at work',
      'government-related success',
      'father\'s health improved or major event with father',
      'taking on leadership or authority',
      'strong sense of identity and direction',
    ],
    challengingEvents: [
      'conflict with authority or superiors',
      'father\'s illness or estrangement',
      'ego clashes and isolation',
      'health issues related to heart or vitality',
      'government or bureaucratic trouble',
    ],
    generalVibe: 'authority, self-expression, recognition, father, government',
    keywords: ['recognition', 'leadership', 'authority', 'father', 'promotion', 'government', 'identity', 'confidence'],
    voiceCharacter: 'clear, authoritative, measured, naturally commanding',
    physicalAssociations: ['square jaw', 'strong brow', 'upright posture', 'direct gaze', 'confident bearing'],
  },

  Moon: {
    planet: 'Moon',
    positiveEvents: [
      'home purchase or major move',
      'emotional bonding or nurturing relationships',
      'creative or artistic flourishing',
      'closeness with mother or maternal figure',
      'popularity and public recognition',
    ],
    challengingEvents: [
      'emotional instability or anxiety',
      'mother\'s health concerns',
      'restlessness and frequent changes',
      'mind-related stress or sleep issues',
      'family or domestic disruptions',
    ],
    generalVibe: 'emotions, mind, mother, home, travel, public life',
    keywords: ['emotional', 'home', 'mother', 'travel', 'mind', 'public', 'domestic', 'nurturing', 'change'],
    voiceCharacter: 'melodic, flowing, expressive, emotionally responsive',
    physicalAssociations: ['round face', 'soft eyes', 'pale or light complexion', 'full cheeks', 'gentle expression'],
  },

  Mars: {
    planet: 'Mars',
    positiveEvents: [
      'athletic achievement or physical training',
      'real estate transaction (buying or selling property)',
      'surgery with positive outcome',
      'courageous decision that changed course',
      'starting a business or independent venture',
    ],
    challengingEvents: [
      'accidents, injuries, or surgery',
      'conflicts, disputes, legal battles',
      'property disputes or sudden losses',
      'impulsive decisions with consequences',
      'brothers or siblings as source of tension',
    ],
    generalVibe: 'action, courage, conflict, property, surgery, siblings',
    keywords: ['conflict', 'property', 'surgery', 'bold', 'accident', 'courage', 'brother', 'competitive', 'energy'],
    voiceCharacter: 'sharp, direct, fast-paced, can be forceful or clipped',
    physicalAssociations: ['sharp features', 'reddish complexion', 'athletic build', 'scars or marks', 'intense eyes'],
  },

  Mercury: {
    planet: 'Mercury',
    positiveEvents: [
      'educational achievement or new skill acquired',
      'business success through communication or trade',
      'writing, publishing, or speaking milestone',
      'sibling harmony or important sibling event',
      'travel for study or short professional trips',
    ],
    challengingEvents: [
      'nervousness, anxiety, or overthinking',
      'miscommunications causing problems',
      'difficulties with siblings or neighbors',
      'scattered energy and inability to focus',
      'skin or nervous system issues',
    ],
    generalVibe: 'intellect, communication, education, siblings, trade, travel',
    keywords: ['communication', 'learning', 'writing', 'travel', 'siblings', 'analysis', 'business', 'nervous', 'agile'],
    voiceCharacter: 'quick, intelligent, varied pace, often articulate and precise',
    physicalAssociations: ['youthful appearance', 'expressive hands', 'quick eyes', 'slender build', 'animated face'],
  },

  Jupiter: {
    planet: 'Jupiter',
    positiveEvents: [
      'marriage or committed partnership',
      'birth of a child',
      'spiritual growth, teacher, or mentor appeared',
      'financial expansion or windfall',
      'higher education, law, or philosophy milestones',
    ],
    challengingEvents: [
      'overconfidence leading to poor decisions',
      'weight gain or liver-related health',
      'children-related concerns',
      'excessive spending or financial overreach',
      'legal disputes or ethical dilemmas',
    ],
    generalVibe: 'expansion, wisdom, marriage, children, wealth, spirituality',
    keywords: ['growth', 'marriage', 'children', 'wisdom', 'wealth', 'expansion', 'teacher', 'optimism', 'religion'],
    voiceCharacter: 'warm, expansive, deliberate, naturally reassuring',
    physicalAssociations: ['broad forehead', 'warm expression', 'well-built frame', 'dignified bearing', 'kind eyes'],
  },

  Venus: {
    planet: 'Venus',
    positiveEvents: [
      'romantic relationship or marriage',
      'artistic, creative, or aesthetic achievement',
      'luxury acquisition (car, jewelry, home decor)',
      'social popularity and pleasures',
      'financial gains through investments or inheritance',
    ],
    challengingEvents: [
      'relationship difficulties or breakup',
      'overindulgence in pleasures',
      'financial losses through luxury or excess',
      'reproductive health concerns (especially for women)',
      'envy or vanity causing social friction',
    ],
    generalVibe: 'love, beauty, luxury, creativity, relationships, pleasure',
    keywords: ['romance', 'beauty', 'luxury', 'art', 'pleasure', 'relationship', 'creativity', 'refined', 'social'],
    voiceCharacter: 'pleasant, melodious, charming, often soft and appealing',
    physicalAssociations: ['symmetrical features', 'attractive appearance', 'graceful movement', 'clear skin', 'bright eyes'],
  },

  Saturn: {
    planet: 'Saturn',
    positiveEvents: [
      'hard-earned career advancement or responsibility',
      'disciplined study or skill mastery over time',
      'foreign work or long-term project completed',
      "elderly relative's significant event",
      'property acquisition through sustained effort',
    ],
    challengingEvents: [
      'delays, obstacles, and frustrations',
      'chronic health issues or fatigue',
      'career stagnation or losses',
      'social isolation or loneliness',
      'losses through servants, subordinates, or betrayal',
    ],
    generalVibe: 'discipline, delay, restriction, karma, longevity, hard work',
    keywords: ['delay', 'discipline', 'karma', 'restriction', 'service', 'elderly', 'responsibility', 'slow', 'endurance'],
    voiceCharacter: 'measured, low-pitched, deliberate, economical with words',
    physicalAssociations: ['lean or wiry frame', 'dark complexion', 'gaunt features', 'serious expression', 'prominent bones'],
  },

  Rahu: {
    planet: 'Rahu',
    positiveEvents: [
      'unconventional opportunity that paid off',
      'foreign connections, travel abroad, or emigration',
      'sudden breakthrough in technology or innovation',
      'fame or recognition in unusual circumstances',
      'material gains through risk or out-of-the-ordinary means',
    ],
    challengingEvents: [
      'confusion, illusion, or self-deception',
      'obsession or addictive behaviour',
      'sudden unexpected disruptions',
      'dealing with foreigners causing complications',
      'health issues that were hard to diagnose',
    ],
    generalVibe: 'foreign, unconventional, obsession, sudden change, illusion, ambition',
    keywords: ['foreign', 'unconventional', 'ambition', 'sudden', 'technology', 'obsession', 'illusion', 'disruption'],
    voiceCharacter: 'intense, sometimes hypnotic, unusual cadence, can be dramatic',
    physicalAssociations: ['unusual or striking appearance', 'intense gaze', 'unconventional style', 'may look older or different from age'],
  },

  Ketu: {
    planet: 'Ketu',
    positiveEvents: [
      'spiritual awakening or deep inner change',
      'detachment leading to freedom',
      'past-life skills surfacing naturally',
      'healing or recovery from a long illness',
      'research, occult, or mystical insight',
    ],
    challengingEvents: [
      'feeling disconnected or purposeless',
      'mysterious or hard-to-diagnose health issues',
      'sudden endings or separations',
      'accidents involving sharp objects',
      'sense of loss or sacrifice',
    ],
    generalVibe: 'spirituality, detachment, moksha, mysticism, sudden loss, past karma',
    keywords: ['spiritual', 'detachment', 'loss', 'mystical', 'past', 'healing', 'isolation', 'research', 'sacrifice'],
    voiceCharacter: 'soft, introspective, sometimes hesitant, can fade out at end of sentences',
    physicalAssociations: ['slight build', 'spiritual expression', 'unusual eyes', 'marks on the body', 'quiet presence'],
  },
};

/** Returns a compact theme summary for AI prompt injection. */
export function serializePlanetThemes(planets: PlanetId[]): string {
  const lines: string[] = ['── PLANET THEMES FOR ANSWER SCORING ──────────────────────────'];
  for (const p of planets) {
    const t = PLANET_THEMES[p];
    if (!t) continue;
    lines.push(`${p.toUpperCase()}: ${t.generalVibe}`);
    lines.push(`  Positive events: ${t.positiveEvents.slice(0, 3).join('; ')}`);
    lines.push(`  Challenging: ${t.challengingEvents.slice(0, 3).join('; ')}`);
    lines.push(`  Keywords: ${t.keywords.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Returns voice quality descriptions for relevant planets, for the physical analysis prompt. */
export function getAllVoiceThemes(): string {
  const lines: string[] = ['── VOCAL QUALITIES BY RULING PLANET ──────────────────────────'];
  for (const [planet, theme] of Object.entries(PLANET_THEMES)) {
    lines.push(`${planet}: ${theme.voiceCharacter}`);
  }
  lines.push('');
  return lines.join('\n');
}
