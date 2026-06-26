/**
 * KP House Significators.
 *
 * In KP, a planet signifies a house through four levels (ordered by strength):
 *
 * Level 1 — Occupants: planets physically in the house (Placidus)
 * Level 2 — Tenants' star lords: planets whose nakshatra lord is an occupant
 * Level 3 — House lord: sign lord of the cusp degree
 * Level 4 — Lord's star tenants: planets whose nakshatra lord is the house lord
 *
 * Only planets that signify a house through at least one level are significators.
 * A planet may signify multiple houses.
 *
 * Reference: K.S. Krishnamurti, "Krishnamurti Padhdhati", Vol. 1, Rule of Signification
 */

import type { PlanetId, KPHouseSignificators } from '@luckyray/shared';

export interface PlanetWithHouse {
  planet: PlanetId;
  kpHouse: number;       // Placidus house (1-12) the planet occupies
  nakshatraLord: PlanetId;
  subLord: PlanetId;
}

/**
 * Compute KP significators for all 12 houses.
 *
 * @param planetsWithHouses  Array of all planets with their KP house assignments
 * @param cuspSignLords      Array of 12 sign lords (index 0 = cusp 1 lord, etc.)
 * @returns KPHouseSignificators for all 12 houses
 */
export function computeKPSignificators(
  planetsWithHouses: PlanetWithHouse[],
  cuspSignLords: PlanetId[],
): KPHouseSignificators[] {
  const ALL_PLANETS: PlanetId[] = planetsWithHouses.map(p => p.planet);

  const result: KPHouseSignificators[] = [];

  for (let h = 1; h <= 12; h++) {
    const significatorSet = new Set<PlanetId>();

    // Level 1: Occupants of this house
    const occupants = planetsWithHouses.filter(p => p.kpHouse === h).map(p => p.planet);
    occupants.forEach(p => significatorSet.add(p));

    // Level 2: Planets whose nakshatra lord is an occupant of this house
    for (const pw of planetsWithHouses) {
      if (occupants.includes(pw.nakshatraLord)) {
        significatorSet.add(pw.planet);
      }
    }

    // Level 3: Sign lord of this house cusp
    const houseLord = cuspSignLords[h - 1]!;
    significatorSet.add(houseLord);

    // Level 4: Planets in the star of the house lord
    for (const pw of planetsWithHouses) {
      if (pw.nakshatraLord === houseLord) {
        significatorSet.add(pw.planet);
      }
    }

    result.push({ house: h, significators: Array.from(significatorSet) });
  }

  return result;
}

/**
 * Return a flat map: planet → houses it signifies
 */
export function buildPlanetSignificationMap(
  significators: KPHouseSignificators[],
): Map<PlanetId, number[]> {
  const map = new Map<PlanetId, number[]>();
  for (const hs of significators) {
    for (const planet of hs.significators) {
      const existing = map.get(planet) ?? [];
      existing.push(hs.house);
      map.set(planet, existing);
    }
  }
  return map;
}
