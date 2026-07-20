/**
 * The voice reading passage for birth time correction.
 *
 * Purpose: The user reads this aloud and records it. The recording is then
 * analyzed for vocal quality, pace, emotional tone, and speech patterns —
 * all of which carry signal about the natal chart's rising sign and its
 * sub-lord (Mercury/Moon placement affects voice significantly in KP).
 *
 * Design criteria:
 * - ~155 words: approximately 60 seconds at average speaking pace (150 wpm)
 * - Includes both statement and reflective/question modes (reveals cadence shifts)
 * - Varied sentence length (short punchy vs long flowing) to reveal natural rhythm
 * - Emotionally neutral content (avoids performance bias)
 * - Natural prose that people read without self-consciousness
 */

export const VOICE_READING_PASSAGE = `I have always believed that the way someone begins their day reveals something essential about them. Some people wake to the smallest sounds, already alert before their eyes adjust to the light. Others sink deeper into sleep until the very last moment, then move fast — as if making up for lost time. Some speak immediately, reaching for connection before they have even stood up. Others grow quiet at first, needing space to gather themselves before the day begins.

Notice how you felt just now, reading those words. Did you pace yourself evenly through each sentence? Did you speed up, or slow down, without quite meaning to? The way you move through language is as individual as a signature — shaped by something deeper than habit, more personal than style. There are no wrong answers here. Speak naturally, as you would to a close friend. We are simply listening to how you express yourself.`;

export const VOICE_READING_INSTRUCTIONS = [
  'Find a quiet space and speak clearly at your natural pace.',
  'Read the passage once silently, then record yourself reading it aloud.',
  'Do not try to perform — just speak as you normally would.',
  'The passage takes approximately one minute at a comfortable pace.',
];

export const VOICE_ANALYSIS_PROMPT = `You are analyzing a voice recording transcription for birth time rectification in Vedic astrology (KP system). The goal is to identify vocal qualities that suggest the rising sign and its planetary influences.

Analyze the following characteristics from the transcription and any metadata:
1. PACE: Fast/measured/slow — Mars/Mercury accelerate, Saturn/Moon slow down
2. RHYTHM: Even vs variable — Mercury/Gemini varies, Saturn/Capricorn is even
3. VOLUME TENDENCY: Loud/medium/soft — Sun/Leo projects, Moon/Cancer softens
4. EMOTIONAL TONE: Warm/neutral/detached — Venus/Jupiter warm, Saturn/Aquarius detached
5. ENUNCIATION: Precise vs relaxed — Virgo/Mercury precise, Pisces/Neptune relaxed
6. TRAILING OFF: Sentences that fade at end — Pisces/Ketu common, Aries/Sun rarely

Based on these vocal characteristics, assign likelihood scores (0.0–1.0) to each of the 12 rising signs. Signs whose vocal style best matches should score highest.`;
