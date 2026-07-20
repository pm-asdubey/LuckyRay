import type { SignPhysicalProfile } from './types';

/**
 * KP-derived physical descriptions per rising sign.
 * Based on KSK's descriptions in KP Reader Vol 1 and classical Jyotish texts.
 * These are probabilistic tendencies, not deterministic rules.
 */
export const SIGN_PHYSICAL_PROFILES: SignPhysicalProfile[] = [
  {
    sign: 'Aries',
    build: 'medium to muscular, well-proportioned',
    height: 'medium to above average',
    complexion: 'ruddy, reddish, or healthy glow',
    faceShape: 'long face, prominent forehead, often a scar or mark',
    eyeCharacter: 'quick, sharp, can appear aggressive or intense',
    hairTendency: 'coarse hair, possible early hair loss or receding',
    distinguishingFeature: 'prominent brow ridge, often moves head forward when speaking',
    voiceQuality: 'direct, assertive, quick-paced, can be blunt',
    movementStyle: 'energetic, fast, purposeful, sometimes impatient',
  },
  {
    sign: 'Taurus',
    build: 'stocky, well-built, tends toward solidity',
    height: 'medium, rarely very tall',
    complexion: 'fair to slightly dark, even skin tone',
    faceShape: 'square or round face, full lips, broad neck',
    eyeCharacter: 'large, steady, calm, often beautiful',
    hairTendency: 'thick, lustrous hair',
    distinguishingFeature: 'graceful neck, pleasant voice, moves slowly and deliberately',
    voiceQuality: 'melodious, rich, pleasing, naturally musical',
    movementStyle: 'unhurried, deliberate, comfortable, averse to rushing',
  },
  {
    sign: 'Gemini',
    build: 'slender, tall, wiry',
    height: 'above average',
    complexion: 'light, sometimes sallow',
    faceShape: 'long face, prominent chin, expressive',
    eyeCharacter: 'quick, restless, intelligent, darting',
    hairTendency: 'fine hair, can be curly',
    distinguishingFeature: 'hands in constant motion, animated facial expressions',
    voiceQuality: 'quick, varied, articulate, often mimics others naturally',
    movementStyle: 'quick, versatile, multi-directional, fidgety',
  },
  {
    sign: 'Cancer',
    build: 'medium, tendency toward roundness especially in middle age',
    height: 'medium',
    complexion: 'pale or light, sometimes yellowish',
    faceShape: 'round or moon-shaped face, full cheeks',
    eyeCharacter: 'large, soft, empathetic, can appear slightly distant',
    hairTendency: 'fine, often light-colored',
    distinguishingFeature: 'soft expression, protective body language, arms often folded',
    voiceQuality: 'soft, nurturing, rises and falls emotionally, sympathetic',
    movementStyle: 'gentle, protective, indirect, crab-like—sideways approaches',
  },
  {
    sign: 'Leo',
    build: 'broad-shouldered, upright, commanding presence',
    height: 'above average',
    complexion: 'golden, wheat, or healthy tanned',
    faceShape: 'square-oval, prominent brow, majestic bearing',
    eyeCharacter: 'large, luminous, commanding, appears to look down even when equal height',
    hairTendency: 'thick, often luxurious, like a mane',
    distinguishingFeature: 'enters a room and is noticed, back very straight',
    voiceQuality: 'resonant, projecting, naturally carries without effort',
    movementStyle: 'regal, unhurried but purposeful, takes up space naturally',
  },
  {
    sign: 'Virgo',
    build: 'slender, average, neat and compact',
    height: 'medium',
    complexion: 'clear, sometimes pale, fine-pored skin',
    faceShape: 'oval, delicate, fine features',
    eyeCharacter: 'sharp, analytical, observing, appears to be cataloging details',
    hairTendency: 'fine, controlled, neat',
    distinguishingFeature: 'precise movements, often checks or adjusts things, impeccable grooming',
    voiceQuality: 'precise, measured, can seem critical, clear enunciation',
    movementStyle: 'efficient, exact, minimal wasted motion, slight nervous energy',
  },
  {
    sign: 'Libra',
    build: 'well-proportioned, tends toward beauty and balance',
    height: 'medium to above average',
    complexion: 'fair, attractive, often clear and luminous',
    faceShape: 'symmetrical oval, pleasant, aesthetic',
    eyeCharacter: 'beautiful, balanced, warm, often inviting',
    hairTendency: 'lustrous, well-kept',
    distinguishingFeature: 'graceful movements, naturally poised, often attractive to others',
    voiceQuality: 'pleasant, harmonious, diplomatic, tends to soften strong statements',
    movementStyle: 'graceful, balanced, seeks aesthetic harmony in movement',
  },
  {
    sign: 'Scorpio',
    build: 'medium to compact, often muscular in unexpected places',
    height: 'medium',
    complexion: 'dusky, dark, or deeply olive',
    faceShape: 'strong features, prominent nose, intense jaw',
    eyeCharacter: 'penetrating, magnetic, piercing—described as X-ray vision',
    hairTendency: 'thick, dark, coarse',
    distinguishingFeature: 'eyes that seem to look through people rather than at them',
    voiceQuality: 'low, intense, measured, can be hypnotic or unsettling',
    movementStyle: 'controlled, deliberate, economical—nothing wasted',
  },
  {
    sign: 'Sagittarius',
    build: 'athletic, tall, expansive',
    height: 'above average, often tallest in group',
    complexion: 'fair to olive, outdoor look',
    faceShape: 'long face, prominent forehead, often large nose',
    eyeCharacter: 'open, optimistic, visionary, long-distance look',
    hairTendency: 'thick, sometimes unruly',
    distinguishingFeature: 'long thighs, expansive gestures, tends to take up space',
    voiceQuality: 'enthusiastic, loud, philosophical, goes off-track easily',
    movementStyle: 'expansive, energetic, loves to cover ground, somewhat clumsy indoors',
  },
  {
    sign: 'Capricorn',
    build: 'lean, bony, angular',
    height: 'medium, may appear shorter due to posture',
    complexion: 'dark or olive, weathered-looking',
    faceShape: 'narrow face, prominent cheekbones, sharp jaw',
    eyeCharacter: 'serious, calculating, observant, rarely shows emotion',
    hairTendency: 'dry, dark, can be sparse',
    distinguishingFeature: 'ages well—looks older young, younger old; patient expression',
    voiceQuality: 'dry, authoritative, economical, purposeful',
    movementStyle: 'measured, goal-oriented, climbs steadily, averse to detours',
  },
  {
    sign: 'Aquarius',
    build: 'medium, often unconventional, sometimes unusual proportions',
    height: 'medium to above average',
    complexion: 'fair to brown, can have unusual quality',
    faceShape: 'well-defined, intellectual look, broad forehead',
    eyeCharacter: 'detached, observing, humanitarian, looks at groups rather than individuals',
    hairTendency: 'varied, sometimes unusual style',
    distinguishingFeature: 'unusual quality to the whole person, often looks like they don\'t quite fit in—and they don\'t mind',
    voiceQuality: 'detached, interesting, can seem like they\'re talking to humanity rather than to you',
    movementStyle: 'independent, unpredictable, follows their own rhythm entirely',
  },
  {
    sign: 'Pisces',
    build: 'soft, tends toward fluid, undefined shape',
    height: 'medium, often appears smaller than they are',
    complexion: 'pale, watery, sometimes luminous',
    faceShape: 'rounded, soft, dreamy features',
    eyeCharacter: 'large, liquid, empathetic, otherworldly or unfocused',
    hairTendency: 'fine, soft, can be wavy',
    distinguishingFeature: 'appears to be somewhere else even when present; large or prominent feet',
    voiceQuality: 'soft, musical, can trail off, full of feeling',
    movementStyle: 'fluid, impressionistic, avoids sharp angles, flows around obstacles',
  },
];

export function getSignProfile(sign: string): SignPhysicalProfile | undefined {
  return SIGN_PHYSICAL_PROFILES.find(p => p.sign === sign);
}

export function serializeSignProfiles(): string {
  const lines: string[] = ['── RISING SIGN PHYSICAL PROFILES (KP / Classical Jyotish) ─────'];
  for (const p of SIGN_PHYSICAL_PROFILES) {
    lines.push(`${p.sign.toUpperCase()}`);
    lines.push(`  Build: ${p.build}`);
    lines.push(`  Face: ${p.faceShape}`);
    lines.push(`  Eyes: ${p.eyeCharacter}`);
    lines.push(`  Complexion: ${p.complexion}`);
    lines.push(`  Voice: ${p.voiceQuality}`);
    lines.push(`  Movement: ${p.movementStyle}`);
    lines.push(`  Distinguishing: ${p.distinguishingFeature}`);
  }
  lines.push('');
  return lines.join('\n');
}
