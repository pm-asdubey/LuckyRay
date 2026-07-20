/**
 * KP-integrated palmistry RAG data for birth time rectification.
 *
 * In KP Jyotish, dominant planetary energy shows up in the hand through the
 * prominence of specific mounts. The dominant mount identifies which planet
 * is strongest in the chart — this correlates with the Ascendant sub-lord
 * and sign lord, narrowing the birth time window.
 *
 * The AI receives this data to interpret a photo of the palm.
 */

export interface PalmMount {
  name: string;
  location: string;
  planet: string;
  /** KP Ascendant signs that correlate with this mount being prominent */
  correlatedSigns: string[];
  wellDevelopedMeaning: string;
  flatOrAbsentMeaning: string;
  physicalAppearanceClue: string;
}

export interface MajorLine {
  name: string;
  kpSignificance: string;
  interpretation: {
    quality: string;
    meaning: string;
  }[];
}

export const PALM_MOUNTS: PalmMount[] = [
  {
    name: 'Mount of Jupiter',
    location: 'Base of the index finger',
    planet: 'Jupiter',
    correlatedSigns: ['Sagittarius', 'Pisces'],
    wellDevelopedMeaning: 'Strong Jupiter influence — ambition, leadership, wisdom, optimism, religious inclination. Likely Sagittarius or Pisces rising, or Jupiter as Ascendant sub-lord.',
    flatOrAbsentMeaning: 'Jupiter is weaker in the chart. Less likely to be a Jupiter-dominated rising sign.',
    physicalAppearanceClue: 'Often accompanied by a broad, well-proportioned hand and warm, expansive eyes.',
  },
  {
    name: 'Mount of Saturn',
    location: 'Base of the middle finger',
    planet: 'Saturn',
    correlatedSigns: ['Capricorn', 'Aquarius'],
    wellDevelopedMeaning: 'Strong Saturn influence — discipline, patience, seriousness, karmic lessons, endurance. Likely Capricorn or Aquarius rising, or Saturn as sub-lord.',
    flatOrAbsentMeaning: 'Saturn is not the dominant planet. Less likely Capricorn or Aquarius rising.',
    physicalAppearanceClue: 'Often a lean, angular hand; fingers may be knobbly or prominent-jointed.',
  },
  {
    name: 'Mount of Apollo (Sun)',
    location: 'Base of the ring finger',
    planet: 'Sun',
    correlatedSigns: ['Leo'],
    wellDevelopedMeaning: 'Strong Sun influence — creativity, confidence, fame, artistic talent, vitality. Leo rising is highly probable, or Sun as dominant planet.',
    flatOrAbsentMeaning: 'Sun is not the primary force. Leo rising less likely.',
    physicalAppearanceClue: 'Often accompanied by a radiant, expressive appearance and natural poise.',
  },
  {
    name: 'Mount of Mercury',
    location: 'Base of the little finger',
    planet: 'Mercury',
    correlatedSigns: ['Gemini', 'Virgo'],
    wellDevelopedMeaning: 'Strong Mercury influence — intelligence, communication, commerce, adaptability, wit. Gemini or Virgo rising likely, or Mercury as sub-lord.',
    flatOrAbsentMeaning: 'Mercury is subdued in the chart. Less likely Gemini or Virgo rising.',
    physicalAppearanceClue: 'Often a quick, expressive face; lively, darting eyes; animated gestures.',
  },
  {
    name: 'Mount of Venus',
    location: 'Thick fleshy pad at the base of the thumb',
    planet: 'Venus',
    correlatedSigns: ['Taurus', 'Libra'],
    wellDevelopedMeaning: 'Strong Venus influence — sensuality, beauty, love, creativity, charm, comfort-seeking. Taurus or Libra rising likely, or Venus as sub-lord.',
    flatOrAbsentMeaning: 'Venus is not prominent. Less likely Taurus or Libra rising.',
    physicalAppearanceClue: 'The mount is literally fleshy and full — the thumb base should appear thick and well-cushioned.',
  },
  {
    name: 'Mount of Moon (Luna)',
    location: 'Outer edge of the palm, below the little finger, near the wrist',
    planet: 'Moon',
    correlatedSigns: ['Cancer'],
    wellDevelopedMeaning: 'Strong Moon influence — emotional sensitivity, imagination, intuition, nurturing, attachment to home and mother. Cancer rising highly probable, or Moon as sub-lord.',
    flatOrAbsentMeaning: 'Moon is less prominent. Cancer rising less likely.',
    physicalAppearanceClue: 'Often visible as a soft, slightly padded bulge on the outer lower palm.',
  },
  {
    name: 'Mount of Mars (Active / Inner)',
    location: 'Inner palm between the thumb and life line',
    planet: 'Mars (active)',
    correlatedSigns: ['Aries', 'Scorpio'],
    wellDevelopedMeaning: 'Courage, initiative, aggression, drive. Active Mars dominance — Aries rising or Mars-ruled sub-lord likely.',
    flatOrAbsentMeaning: 'Less aggressive, Mars not dominant.',
    physicalAppearanceClue: 'The area between the thumb base and the lifeline will appear firm and padded.',
  },
  {
    name: 'Mount of Mars (Passive / Outer)',
    location: 'Outer mid-palm between the heart line and Moon mount',
    planet: 'Mars (passive)',
    correlatedSigns: ['Scorpio'],
    wellDevelopedMeaning: 'Resistance, endurance, persistence, secretiveness. Scorpio rising more likely with both Mars mounts prominent.',
    flatOrAbsentMeaning: 'Less Mars energy overall.',
    physicalAppearanceClue: 'A slight firmness in the outer mid-palm area.',
  },
];

export const MAJOR_LINES: MajorLine[] = [
  {
    name: 'Life Line',
    kpSignificance: 'Represents vitality, physical constitution, and the strength of the First House (body and self). In KP, H1 sub-lord governs overall vitality.',
    interpretation: [
      { quality: 'Long, deep, and well-curved', meaning: 'Strong H1 indication — robust constitution, vital physical energy. Favors fire or earth rising signs.' },
      { quality: 'Short or broken', meaning: 'H1 may be afflicted. Saturn or Rahu aspects on the Ascendant possible.' },
      { quality: 'Faint or shallow', meaning: 'Sensitivity and delicacy — water signs (Cancer, Scorpio, Pisces) more probable.' },
      { quality: 'Wide curve into the palm center', meaning: 'Expansive, generous physical energy — Jupiter or Sun strong.' },
      { quality: 'Hugging close to the thumb', meaning: 'Cautious, reserved energy — Saturn influence or earth signs likely.' },
    ],
  },
  {
    name: 'Heart Line',
    kpSignificance: 'Represents emotional nature, relationships, and the Fifth House (love) and Seventh House (partnership). Venus and Moon are key significators.',
    interpretation: [
      { quality: 'Long, reaching across the palm toward Jupiter mount', meaning: 'Idealistic, romantic — Jupiter and Venus strong. Pisces, Sagittarius, or Libra rising.' },
      { quality: 'Curved upward toward index finger', meaning: 'Affectionate, emotional openness — Moon and Venus prominent.' },
      { quality: 'Straight and short', meaning: 'Practical in relationships — Saturn or Mercury influence.' },
      { quality: 'Multiple branches or chained', meaning: 'Complex emotional life — Rahu or multiple planet activation of H7.' },
      { quality: 'Deep and singular', meaning: 'Intense, focused emotional nature — Mars or Scorpio rising.' },
    ],
  },
  {
    name: 'Head Line',
    kpSignificance: 'Represents intellect, mindset, and the Fifth House (intellect) and Third House (communication). Mercury and Jupiter are key significators.',
    interpretation: [
      { quality: 'Long and straight', meaning: 'Logical, analytical mind — Mercury or Saturn strong. Virgo, Gemini, or Capricorn rising.' },
      { quality: 'Sloping toward Moon mount', meaning: 'Creative, imaginative thinking — Moon, Neptune, or Ketu influence. Water or mutable signs.' },
      { quality: 'Short', meaning: 'Practical, concrete thinking — earth signs.' },
      { quality: 'Forked at the end (Writers Fork)', meaning: 'Dual thinking — Gemini rising, Mercury dominant.' },
      { quality: 'Separated from life line at start', meaning: 'Independent thinker, risk-taker — Mars or Aries influence.' },
      { quality: 'Joined to life line at start', meaning: 'Cautious, family-oriented mindset — Cancer or Taurus rising.' },
    ],
  },
  {
    name: 'Fate Line',
    kpSignificance: 'Represents career path, external destiny, and the Tenth House. Saturn is the primary significator. Prominent fate lines correlate with strong H10 activation.',
    interpretation: [
      { quality: 'Deep and long, running from wrist to middle finger', meaning: 'Strongly defined career path — Saturn very prominent. Capricorn or Aquarius rising likely.' },
      { quality: 'Absent or very faint', meaning: 'Career is self-directed, not fate-driven — less Saturn influence on the Ascendant.' },
      { quality: 'Starts from Moon mount', meaning: 'Career influenced by public, mass appeal, or mother — Cancer or Moon prominent.' },
      { quality: 'Broken or irregular', meaning: 'Multiple career changes — Rahu, Uranus, or mutable signs.' },
      { quality: 'Starts late (near middle of palm)', meaning: 'Late career establishment — Saturn dasha came later, or delayed H10 activation.' },
    ],
  },
  {
    name: 'Sun Line (Apollo Line)',
    kpSignificance: 'Represents fame, recognition, creativity, and the Fifth House. Sun and Venus are significators.',
    interpretation: [
      { quality: 'Clear and present', meaning: 'Fame, recognition, creative talent — Sun or Venus strong. Leo, Taurus, or Libra rising.' },
      { quality: 'Multiple sun lines', meaning: 'Varied creative pursuits — Venus and Mercury both active.' },
      { quality: 'Absent', meaning: 'Fame less prominent in the chart. Introversion possible.' },
    ],
  },
];

export interface HandShape {
  type: string;
  element: string;
  correlatedSigns: string[];
  description: string;
  kpInterpretation: string;
}

export const HAND_SHAPES: HandShape[] = [
  {
    type: 'Earth Hand',
    element: 'Earth',
    correlatedSigns: ['Taurus', 'Virgo', 'Capricorn'],
    description: 'Square palm, short fingers. Practical, grounded, sensible.',
    kpInterpretation: 'Strong earth-sign energy. Taurus, Virgo, or Capricorn rising probable. Saturn or Venus as sub-lord likely.',
  },
  {
    type: 'Air Hand',
    element: 'Air',
    correlatedSigns: ['Gemini', 'Libra', 'Aquarius'],
    description: 'Square palm, long fingers. Intellectual, communicative, social.',
    kpInterpretation: 'Air-sign energy dominant. Gemini, Libra, or Aquarius rising. Mercury or Saturn as sub-lord.',
  },
  {
    type: 'Fire Hand',
    element: 'Fire',
    correlatedSigns: ['Aries', 'Leo', 'Sagittarius'],
    description: 'Rectangular (oblong) palm, short fingers. Enthusiastic, confident, impulsive.',
    kpInterpretation: 'Fire-sign energy. Aries, Leo, or Sagittarius rising. Sun, Mars, or Jupiter as sub-lord likely.',
  },
  {
    type: 'Water Hand',
    element: 'Water',
    correlatedSigns: ['Cancer', 'Scorpio', 'Pisces'],
    description: 'Rectangular (oblong) palm, long fingers. Sensitive, intuitive, emotional.',
    kpInterpretation: 'Water-sign energy. Cancer, Scorpio, or Pisces rising. Moon, Mars (Scorpio), or Jupiter (Pisces) as sub-lord.',
  },
  {
    type: 'Mixed Hand',
    element: 'Mixed',
    correlatedSigns: [],
    description: 'Does not fit neatly into one category. Look at the dominant mount instead.',
    kpInterpretation: 'Planetary sub-lord analysis more reliable than hand shape alone. Focus on mounts and line quality.',
  },
];

/**
 * Returns the full palmistry reference block for AI injection.
 */
export function serializePalmistryRAG(): string {
  const lines: string[] = [
    '══ KP PALMISTRY REFERENCE FOR BIRTH TIME RECTIFICATION ══════════════════',
    '',
    'IMPORTANT: In KP Jyotish, birth time determines the Ascendant sub-lord, which',
    'governs the core life theme. Planetary energies also show up in the dominant',
    'palm mount. Use the palm to NARROW the probable rising sign window.',
    '',
    '── HAND SHAPE (Elemental Indication) ──────────────────────────────────────',
  ];

  for (const shape of HAND_SHAPES) {
    lines.push(`${shape.type} (${shape.element})`);
    lines.push(`  Description: ${shape.description}`);
    lines.push(`  KP: ${shape.kpInterpretation}`);
    if (shape.correlatedSigns.length) lines.push(`  Correlated rising signs: ${shape.correlatedSigns.join(', ')}`);
    lines.push('');
  }

  lines.push('── PALM MOUNTS (Planetary Dominance) ──────────────────────────────────────');
  for (const mount of PALM_MOUNTS) {
    lines.push(`${mount.name} — located at: ${mount.location}`);
    lines.push(`  Planet: ${mount.planet}  |  Correlated rising signs: ${mount.correlatedSigns.join(', ')}`);
    lines.push(`  If prominent: ${mount.wellDevelopedMeaning}`);
    lines.push(`  If flat/absent: ${mount.flatOrAbsentMeaning}`);
    lines.push('');
  }

  lines.push('── MAJOR LINES ─────────────────────────────────────────────────────────────');
  for (const line of MAJOR_LINES) {
    lines.push(`${line.name}`);
    lines.push(`  KP significance: ${line.kpSignificance}`);
    for (const interp of line.interpretation) {
      lines.push(`  · ${interp.quality}: ${interp.meaning}`);
    }
    lines.push('');
  }

  lines.push('ANALYSIS INSTRUCTIONS:');
  lines.push('1. Identify the hand shape (Earth/Air/Fire/Water) from overall proportions.');
  lines.push('2. Note which mounts are most prominent (raised, firm, or well-padded).');
  lines.push('3. Assess the major lines for depth, length, and curve.');
  lines.push('4. Return signLikelihoods for ALL 12 signs, not just obvious candidates.');
  lines.push('5. A strong mount does NOT guarantee that sign — it increases the probability.');
  lines.push('6. If the image quality is low, note this in reasoning and widen your probabilities.');
  lines.push('');
  lines.push('════════════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
