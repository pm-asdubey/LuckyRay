/**
 * Verify KP Placidus house cusps for Arjun Sharma.
 * Birth: 1985-03-20 08:30 IST (+5:30), New Delhi (28.6139N, 77.2090E)
 */

import { generateChart } from './bundle-out/jyotish.mjs';

const result = generateChart({
  profile: { id: 'arjun-test', name: 'Arjun Sharma', gender: 'male' },
  birthDetails: {
    date: '1985-03-20',
    time: '08:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    utcOffset: 330,
    place: 'New Delhi, India',
  },
});

if (!result.success) {
  console.error('Chart generation failed:', result.error, result.details);
  process.exit(1);
}

const { chart } = result;
const cusps = chart.kp.cusps;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  KP Placidus House Cusps — Arjun Sharma');
console.log('  Birth: 1985-03-20 08:30 IST, New Delhi (28.61°N, 77.21°E)');
console.log('═══════════════════════════════════════════════════════════════');

const H_LABELS = [
  'H1  (ASC)', 'H2        ', 'H3        ', 'H4  (IC) ',
  'H5        ', 'H6        ', 'H7  (DESC)', 'H8        ',
  'H9        ', 'H10 (MC) ', 'H11       ', 'H12       ',
];

cusps.forEach((c, i) => {
  const sign = (c.sign ?? '?').padEnd(13);
  const deg  = c.degreesInSign?.toFixed(4) ?? '?';
  const lon  = c.longitude?.toFixed(4) ?? '?';
  console.log(`  ${H_LABELS[i]}: ${sign} ${deg}°  (sid ${lon}°)  ✦ ${c.nakshatraLord ?? '?'} / ${c.subLord ?? '?'}`);
});

// ── Sanity Checks ─────────────────────────────────────────────────────────
console.log('\n── Sanity Checks ──────────────────────────────────────────────');

function norm(d) { return ((d % 360) + 360) % 360; }
function angDiff(a, b) {
  // Shortest angular distance between two angles, unsigned
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
function check(label, condition) {
  console.log(`  ${condition ? '✓' : '✗'} ${label}`);
  return condition;
}

const lons = cusps.map(c => c.longitude);  // raw float, no norm needed
const [h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12] = lons;

let allOk = true;

// Opposite axis checks — use direct subtraction since values are in [0,360)
allOk &= check(`H7  = H1  + 180° (${norm(h7)?.toFixed(2)}° vs ${norm(h1+180)?.toFixed(2)}°)`,
  angDiff(h7, h1 + 180) < 0.5);
allOk &= check(`H4  = H10 + 180° (${norm(h4)?.toFixed(2)}° vs ${norm(h10+180)?.toFixed(2)}°)`,
  angDiff(h4, h10 + 180) < 0.5);
allOk &= check(`H5  = H11 + 180° (${norm(h5)?.toFixed(2)}° vs ${norm(h11+180)?.toFixed(2)}°)`,
  angDiff(h5, h11 + 180) < 0.5);
allOk &= check(`H6  = H12 + 180° (${norm(h6)?.toFixed(2)}° vs ${norm(h12+180)?.toFixed(2)}°)`,
  angDiff(h6, h12 + 180) < 0.5);
allOk &= check(`H8  = H2  + 180° (${norm(h8)?.toFixed(2)}° vs ${norm(h2+180)?.toFixed(2)}°)`,
  angDiff(h8, h2 + 180) < 0.5);
allOk &= check(`H9  = H3  + 180° (${norm(h9)?.toFixed(2)}° vs ${norm(h3+180)?.toFixed(2)}°)`,
  angDiff(h9, h3 + 180) < 0.5);

// Monotonic sequence check (cusps should be strictly increasing 0→360)
let monotonic = true;
for (let i = 0; i < 12; i++) {
  const cur  = lons[i];
  const next = lons[(i + 1) % 12];
  let span = next - cur;
  if (span < 0) span += 360;
  if (span <= 0 || span >= 180) { monotonic = false; }
}
allOk &= check('Cusps form a strictly increasing sequence (0→360°)', monotonic);

// House span checks (all spans should be 15–65° for lat 28.6°)
const spans = [];
let spansOk = true;
for (let i = 0; i < 12; i++) {
  let span = lons[(i + 1) % 12] - lons[i];
  if (span < 0) span += 360;
  spans.push(span);
  if (span < 15 || span > 65) spansOk = false;
}
allOk &= check(
  `All spans 15–65° [${spans.map(s => s.toFixed(1)).join(', ')}]`,
  spansOk,
);

// No duplicate consecutive cusps
let noDups = true;
for (let i = 0; i < 12; i++) {
  if (Math.abs(lons[i] - lons[(i + 1) % 12]) < 0.01) noDups = false;
}
allOk &= check('No duplicate consecutive cusps', noDups);

// Sign-level sanity (sidereal positions for 1985-03-20 08:30 IST New Delhi)
// Sidereal sign boundaries: Aries=0-30, Tau=30-60, Gem=60-90, Can=90-120, Leo=120-150,
//   Vir=150-180, Lib=180-210, Sco=210-240, Sag=240-270, Cap=270-300, Aqu=300-330, Pis=330-360
allOk &= check(`H1  (ASC) in Aries     (sidereal   0– 30°) — ${norm(h1)?.toFixed(2)}°`,  h1 >= 0   && h1 < 30);
allOk &= check(`H4  (IC)  in Cancer    (sidereal  90–120°) — ${norm(h4)?.toFixed(2)}°`,  h4 >= 90  && h4 < 120);
allOk &= check(`H7  (DESC) in Libra    (sidereal 180–210°) — ${norm(h7)?.toFixed(2)}°`,  h7 >= 180 && h7 < 210);
allOk &= check(`H10 (MC)  in Capricorn (sidereal 270–300°) — ${norm(h10)?.toFixed(2)}°`, h10 >= 270 && h10 < 300);

// ── Planet house placements ─────────────────────────────────────────────
console.log('\n── Planet House Assignments (KP Placidus) ──────────────────────');
chart.kp.planets?.forEach(p => {
  const planet = p.planet.padEnd(8);
  const house  = `H${p.house}`;
  const star   = (p.nakshatraLord ?? '?').padEnd(7);
  const sub    = p.subLord ?? '?';
  console.log(`  ${planet}: ${house}  star=${star}  sub=${sub}`);
});

// ── KP Cusp Sub-Lords ─────────────────────────────────────────────────
console.log('\n── KP Cusp Sub-Lords ───────────────────────────────────────────');
cusps.forEach((c, i) => {
  const sign = (c.sign ?? '?').padEnd(13);
  const nak  = (c.nakshatra ?? '?').padEnd(20);
  const star = (c.nakshatraLord ?? '?').padEnd(7);
  const sub  = c.subLord ?? '?';
  console.log(`  H${String(i+1).padStart(2)}: ${sign} | ${nak} | star=${star} | sub=${sub}`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(allOk ? '  ALL CHECKS PASSED ✓' : '  SOME CHECKS FAILED ✗');
console.log('═══════════════════════════════════════════════════════════════\n');

if (!allOk) process.exit(1);
