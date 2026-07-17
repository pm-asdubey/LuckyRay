import { generateChart } from './bundle-out/jyotish.mjs';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const r = generateChart({
  profile: { id: 'ashutosh', name: 'Ashutosh Dubey', gender: 'male' },
  birthDetails: {
    date: '2000-03-28', time: '13:22:00',
    latitude: 22.0667, longitude: 82.15,
    timezone: 'Asia/Kolkata', utcOffset: 330,
    place: 'Bilaspur, Chhattisgarh'
  }
});

if (!r.success) { console.error(r); process.exit(1); }
const c = r.chart;

console.log('\n══ ASHUTOSH DUBEY — 2000-03-28 13:22 IST, Bilaspur (22.07°N 82.15°E) ══');
console.log(`ASC: ${c.ascendant.sign} ${c.ascendant.degree}°${c.ascendant.minute}' | Nakshatra: ${c.ascendant.nakshatra} pada ${c.ascendant.pada}`);
console.log('\n── Planets (sidereal) ──────────────────────────────────────────────');
c.planets.forEach(p => {
  const sid = p.siderealLongitude;
  const signIdx = Math.floor(sid / 30) % 12;
  const deg = sid % 30;
  const retro = p.isRetrograde ? ' (R)' : '';
  console.log(`  ${p.id.padEnd(8)} ${SIGNS[signIdx].padEnd(13)} ${deg.toFixed(2)}°  H${p.house}${retro}`);
});

console.log('\n── KP Placidus Cusps (sidereal) ────────────────────────────────────');
c.kp.cusps.forEach(cu => {
  console.log(`  H${String(cu.house).padStart(2)}: ${cu.sign.padEnd(13)} ${cu.degreesInSign.toFixed(2)}°  | nak=${cu.nakshatraLord.padEnd(7)} sub=${cu.subLord}`);
});

console.log('\n── Dasha ───────────────────────────────────────────────────────────');
console.log('  Current MD:', c.dashas.currentMahadasha?.planet, 'until', c.dashas.currentMahadasha?.endDate?.slice(0,10));
const now = new Date();
const activePeriods = c.dashas.allPeriods.filter(p => new Date(p.endDate) > now).slice(0,4);
activePeriods.forEach(p => {
  const current = c.dashas.currentAntardasha;
  console.log(`  MD: ${p.planet} (${p.startDate.slice(0,10)} - ${p.endDate.slice(0,10)})`);
});
if (c.dashas.currentAntardasha) {
  console.log(`  AD: ${c.dashas.currentAntardasha.planet} (${c.dashas.currentAntardasha.startDate.slice(0,10)} - ${c.dashas.currentAntardasha.endDate.slice(0,10)})`);
}

console.log('\n── KP Events ───────────────────────────────────────────────────────');
c.kp.events.forEach(e => {
  const s = e.isPromised ? `PROMISED (${e.promiseStrength})` : 'NOT PROMISED';
  console.log(`  ${e.topic.padEnd(12)}: ${s}`);
  if (e.isPromised && e.predictedPeriods.length) {
    e.predictedPeriods.slice(0,2).forEach(p => {
      console.log(`    ${p.mahadasha} MD / ${p.antardasha} AD: ${p.startDate} — ${p.endDate} [${p.confidence}]`);
    });
  }
});
