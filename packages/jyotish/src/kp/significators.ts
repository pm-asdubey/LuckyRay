/**
 * KP House Significators — 4-level system.
 *
 * Level 1 (strongest) — Occupants: planets physically in the house (Placidus)
 * Level 2            — Star lords of occupants: planets whose nakshatra lord is a Level-1 planet
 * Level 3            — Cusp sign lord: the planet that rules the sign on the house cusp
 * Level 4 (weakest)  — Star lords of cusp lord: planets whose nakshatra lord is the sign lord
 *
 * A planet is assigned the HIGHEST level at which it qualifies for each house
 * (i.e. it does not appear in L2 if it already appears in L1 for the same house).
 *
 * A planet may signify multiple houses through different levels.
 *
 * Reference: K.S. Krishnamurti, "Krishnamurti Padhdhati", Vol. 1
 */

import type { PlanetId, KPHouseSignificators } from '@luckyray/shared';

export interface PlanetWithHouse {
  planet: PlanetId;
  kpHouse: number;
  nakshatraLord: PlanetId;
  subLord: PlanetId;
}

/**
 * Compute KP significators for all 12 houses, preserving all 4 levels.
 */
export function computeKPSignificators(
  planetsWithHouses: PlanetWithHouse[],
  cuspSignLords: PlanetId[],
): KPHouseSignificators[] {
  const result: KPHouseSignificators[] = [];

  for (let h = 1; h <= 12; h++) {
    // Level 1: planets physically occupying this house
    const level1 = planetsWithHouses
      .filter(p => p.kpHouse === h)
      .map(p => p.planet);

    const l1Set = new Set(level1);

    // Level 2: planets whose nakshatra lord is an occupant, not already in L1
    const level2 = planetsWithHouses
      .filter(p => !l1Set.has(p.planet) && level1.includes(p.nakshatraLord))
      .map(p => p.planet);

    const l2Set = new Set(level2);

    // Level 3: sign lord of this house cusp, not already in L1 or L2
    const houseLord = cuspSignLords[h - 1]!;
    const level3: PlanetId[] = (l1Set.has(houseLord) || l2Set.has(houseLord))
      ? []
      : [houseLord];

    const l3Set = new Set(level3);

    // Level 4: planets whose nakshatra lord is the sign lord, not already in L1/L2/L3
    const level4 = planetsWithHouses
      .filter(p =>
        !l1Set.has(p.planet) &&
        !l2Set.has(p.planet) &&
        !l3Set.has(p.planet) &&
        p.nakshatraLord === houseLord,
      )
      .map(p => p.planet);

    // Union (already deduped by the filters above)
    const significators: PlanetId[] = [...level1, ...level2, ...level3, ...level4];

    result.push({ house: h, level1, level2, level3, level4, significators });
  }

  return result;
}

/**
 * Returns a flat map: planet → houses it signifies (at any level).
 * Kept for backward-compatibility in rateConfidence calculations.
 */
export function buildPlanetSignificationMap(
  significators: KPHouseSignificators[],
): Map<PlanetId, number[]> {
  const map = new Map<PlanetId, number[]>();
  for (const hs of significators) {
    for (const planet of hs.significators) {
      const existing = map.get(planet) ?? [];
      if (!existing.includes(hs.house)) existing.push(hs.house);
      map.set(planet, existing);
    }
  }
  return map;
}

/**
 * Returns a level-aware map: planet → [{house, level}] for every house the
 * planet signifies. Used for promise detection and period confidence rating.
 */
export function buildPlanetSignificationDetail(
  significators: KPHouseSignificators[],
): Map<PlanetId, { house: number; level: 1 | 2 | 3 | 4 }[]> {
  const map = new Map<PlanetId, { house: number; level: 1 | 2 | 3 | 4 }[]>();

  const add = (planet: PlanetId, house: number, level: 1 | 2 | 3 | 4) => {
    const existing = map.get(planet) ?? [];
    existing.push({ house, level });
    map.set(planet, existing);
  };

  for (const hs of significators) {
    hs.level1.forEach(p => add(p, hs.house, 1));
    hs.level2.forEach(p => add(p, hs.house, 2));
    hs.level3.forEach(p => add(p, hs.house, 3));
    hs.level4.forEach(p => add(p, hs.house, 4));
  }

  return map;
}
