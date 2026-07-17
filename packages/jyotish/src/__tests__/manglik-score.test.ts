/**
 * Manglik Dosh weighted scoring engine tests.
 *
 * All sign inputs use the conventional 1–12 scale:
 * 1 Mesh, 2 Vrishabh, ..., 12 Meen.
 */

import { describe, it, expect } from 'vitest';
import { computeManglikScore } from '../manglik-score';

describe('computeManglikScore', () => {
  it('returns zero total when no scored planet occupies a Manglik house group', () => {
    // Put every scored planet in neutral houses from all references
    const result = computeManglikScore({
      lagnaSign: 1,
      moonSign: 1,
      venusSign: 1,
      marsSign: 3,   // Mithun (house 3 from Lagna) — not in {1,7,8} or {2,4,12}
      saturnSign: 6, // Kanya (house 6)
      rahuSign: 9,   // Dhanu (house 9)
      ketuSign: 11,  // Kumbh (house 11)
      sunSign: 5,    // Simha (house 5)
    });

    expect(result.total).toBe(0);
    for (const p of result.planets) {
      expect(p.subtotal).toBe(0);
      for (const d of p.details) {
        expect(d.houseGroup).toBeNull();
        expect(d.rawScore).toBe(0);
        expect(d.weightedScore).toBe(0);
      }
    }
  });

  it('computes Mars in Lagna (own sign) with correct weights', () => {
    // Lagna = Mesh (1), Mars = Mesh (1) → Mars in H1, own sign
    // Moon = Vrishabh (2), Venus = Mithun (3)
    const result = computeManglikScore({
      lagnaSign: 1,
      moonSign: 2,
      venusSign: 3,
      marsSign: 1,
      saturnSign: 6,
      rahuSign: 9,
      ketuSign: 11,
      sunSign: 5,
    });

    const mars = result.planets.find(p => p.planet === 'Mars')!;
    const lagnaDetail = mars.details.find(d => d.reference === 'Lagna')!;
    expect(lagnaDetail.house).toBe(1);
    expect(lagnaDetail.houseGroup).toBe('1,7,8');
    // Mars in Mesh is Moolatrikona (priority before Own Sign per spec)
    expect(lagnaDetail.dignity).toBe('Moolatrikona');
    expect(lagnaDetail.rawScore).toBe(108);  // moolatrikona, group 1,7,8, Mangal column
    expect(lagnaDetail.weight).toBe(1.0);
    expect(lagnaDetail.weightedScore).toBe(108);

    const moonDetail = mars.details.find(d => d.reference === 'Moon')!;
    expect(moonDetail.house).toBe(12); // Mesh from Vrishabh → 12th house
    expect(moonDetail.houseGroup).toBe('2,4,12');
    expect(moonDetail.rawScore).toBe(27); // moolatrikona, group 2,4,12
    expect(moonDetail.weight).toBe(0.5);
    expect(moonDetail.weightedScore).toBe(13.5);

    const venusDetail = mars.details.find(d => d.reference === 'Venus')!;
    expect(venusDetail.house).toBe(11); // Mesh from Mithun → 11th house
    expect(venusDetail.houseGroup).toBeNull();
    expect(venusDetail.rawScore).toBe(0);
    expect(venusDetail.weightedScore).toBe(0);

    expect(mars.subtotal).toBe(108 + 13.5 + 0);
  });

  it('computes Sun exalted in Mesh from all three references', () => {
    // Lagna = Vrishabh (2), Moon = Mithun (3), Venus = Kark (4)
    // Sun = Mesh (1), exalted
    const result = computeManglikScore({
      lagnaSign: 2,
      moonSign: 3,
      venusSign: 4,
      marsSign: 6,
      saturnSign: 8,
      rahuSign: 10,
      ketuSign: 12,
      sunSign: 1,
    });

    const sun = result.planets.find(p => p.planet === 'Sun')!;
    const lagna = sun.details.find(d => d.reference === 'Lagna')!;
    expect(lagna.house).toBe(12); // Mesh from Vrishabh
    expect(lagna.houseGroup).toBe('2,4,12');
    expect(lagna.dignity).toBe('Uchcha (Exalted)');
    expect(lagna.rawScore).toBe(12); // Uchcha, group 2,4,12, Surya column
    expect(lagna.weightedScore).toBe(12);

    const moon = sun.details.find(d => d.reference === 'Moon')!;
    expect(moon.house).toBe(11); // Mesh from Mithun
    expect(moon.houseGroup).toBeNull();
    expect(moon.rawScore).toBe(0);

    const venus = sun.details.find(d => d.reference === 'Venus')!;
    expect(venus.house).toBe(10); // Mesh from Kark
    expect(venus.houseGroup).toBeNull();
    expect(venus.rawScore).toBe(0);

    expect(sun.subtotal).toBe(12);
  });

  it('computes Saturn debilitated in Aries in the 7th from Lagna', () => {
    // Lagna = Tula (7), Saturn = Mesh (1) → debilitated (exaltation Tula + 6 = Mesh)
    // Mesh from Tula → house 7
    const result = computeManglikScore({
      lagnaSign: 7,
      moonSign: 7,
      venusSign: 7,
      marsSign: 3,
      saturnSign: 1,
      rahuSign: 4,
      ketuSign: 10,
      sunSign: 5,
    });

    const saturn = result.planets.find(p => p.planet === 'Saturn')!;
    for (const d of saturn.details) {
      expect(d.house).toBe(7);
      expect(d.houseGroup).toBe('1,7,8');
      expect(d.dignity).toBe('Neech (Debilitated)');
      expect(d.rawScore).toBe(128); // Neech, group 1,7,8, Shani-Rahu-Ketu column
    }
    expect(saturn.subtotal).toBeCloseTo(128 * 1.75, 5);
  });

  it('uses Shani friendship grid for Rahu and Ketu', () => {
    // Put Rahu in Venus sign (Tula, 7) so sign lord is Venus — a friend of Shani/Rahu/Ketu
    // Lagna = Mesh (1), so Rahu in H7
    const result = computeManglikScore({
      lagnaSign: 1,
      moonSign: 1,
      venusSign: 1,
      marsSign: 5,
      saturnSign: 3,
      rahuSign: 7,
      ketuSign: 5,
      sunSign: 9,
    });

    const rahu = result.planets.find(p => p.planet === 'Rahu')!;
    expect(rahu.details[0].dignity).toBe('Adhimitra (Great Friend)');
    expect(rahu.details[0].rawScore).toBe(28);
  });

  it('computes the grand total as the sum of planet subtotals', () => {
    const result = computeManglikScore({
      lagnaSign: 1,
      moonSign: 1,
      venusSign: 1,
      marsSign: 1,
      saturnSign: 1,
      rahuSign: 1,
      ketuSign: 1,
      sunSign: 1,
    });

    const manualTotal =
      108 * 1.75 +   // Mars moolatrikona H1
      128 * 1.75 +   // Saturn debilitated H1
      116 * 1.75 +   // Rahu enemy H1 (Shani-Rahu-Ketu column)
      116 * 1.75 +   // Ketu enemy H1 (Shani-Rahu-Ketu column)
      24 * 1.75;     // Sun exalted H1

    expect(result.total).toBeCloseTo(manualTotal, 5);
    expect(result.total).toBeCloseTo(
      result.planets.reduce((sum, p) => sum + p.subtotal, 0),
      5,
    );
  });

  it('round-trips dignity priority: exaltation beats own sign', () => {
    // Sun in Mesh (1): exalted, even though Mesh is also Mars' own sign irrelevant for Sun
    const result = computeManglikScore({
      lagnaSign: 1,
      moonSign: 1,
      venusSign: 1,
      marsSign: 6,
      saturnSign: 8,
      rahuSign: 10,
      ketuSign: 12,
      sunSign: 1,
    });

    const sun = result.planets.find(p => p.planet === 'Sun')!;
    expect(sun.details[0].dignity).toBe('Uchcha (Exalted)');
  });
});
