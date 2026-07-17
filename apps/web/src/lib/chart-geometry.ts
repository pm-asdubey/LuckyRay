/**
 * Shared North Indian (diamond) kundli geometry.
 *
 * The layout is a square divided into 12 non-overlapping compartments:
 *   4 central diamond houses (H1 top, H4 left, H7 bottom, H10 right)
 *   8 triangular houses filling the gaps counter-clockwise from H1.
 *
 * House positions are FIXED; only the zodiac signs rotate based on the
 * ascendant sign. The numbering follows the standard counter-clockwise
 * North Indian convention:
 *   H1 top, H2 upper-left, H3 mid-left, H4 left, H5 lower-left, H6 bottom-left,
 *   H7 bottom, H8 bottom-right, H9 mid-right, H10 right, H11 upper-right, H12 top-right.
 */

export interface HouseGeometry {
  house: number;
  points: string;
  cx: number;
  cy: number;
}

/**
 * Return SVG polygon points and label centers for every house in a North Indian
 * chart of the given square size.
 *
 * @param size  Width/height of the square SVG viewBox in pixels
 */
export function getNorthIndianHouseGeometry(size: number): HouseGeometry[] {
  const S = size;
  const q = S / 4;
  const h = S / 2;
  const tq = (3 * S) / 4;

  const p = (x: number, y: number) => `${x},${y}`;

  return [
    // H1 — top center diamond
    { house: 1, points: `${p(q, q)} ${p(h, 0)} ${p(tq, q)} ${p(h, h)}`, cx: h, cy: q },
    // H2 — upper-left triangle
    { house: 2, points: `${p(0, 0)} ${p(q, q)} ${p(h, 0)}`, cx: q, cy: S / 12 },
    // H3 — mid-left triangle
    { house: 3, points: `${p(0, 0)} ${p(0, h)} ${p(q, q)}`, cx: S / 12, cy: q },
    // H4 — left center diamond
    { house: 4, points: `${p(0, h)} ${p(q, tq)} ${p(h, h)} ${p(q, q)}`, cx: q, cy: h },
    // H5 — lower-left triangle
    { house: 5, points: `${p(0, S)} ${p(q, tq)} ${p(0, h)}`, cx: S / 12, cy: tq },
    // H6 — bottom-left triangle
    { house: 6, points: `${p(0, S)} ${p(h, S)} ${p(q, tq)}`, cx: q, cy: (11 * S) / 12 },
    // H7 — bottom center diamond
    { house: 7, points: `${p(q, tq)} ${p(h, S)} ${p(tq, tq)} ${p(h, h)}`, cx: h, cy: tq },
    // H8 — bottom-right triangle
    { house: 8, points: `${p(S, S)} ${p(tq, tq)} ${p(h, S)}`, cx: tq, cy: (11 * S) / 12 },
    // H9 — mid-right triangle
    { house: 9, points: `${p(S, S)} ${p(S, h)} ${p(tq, tq)}`, cx: (11 * S) / 12, cy: tq },
    // H10 — right center diamond
    { house: 10, points: `${p(tq, q)} ${p(h, h)} ${p(tq, tq)} ${p(S, h)}`, cx: tq, cy: h },
    // H11 — upper-right triangle
    { house: 11, points: `${p(S, 0)} ${p(tq, q)} ${p(S, h)}`, cx: (11 * S) / 12, cy: q },
    // H12 — top-right triangle
    { house: 12, points: `${p(S, 0)} ${p(h, 0)} ${p(tq, q)}`, cx: tq, cy: S / 12 },
  ];
}

/**
 * Sign index → 2-letter abbreviation used on the chart grid.
 * Kept here so both D1 and divisional renderers stay consistent.
 */
export const SIGN_ABBREVIATIONS: string[] = [
  'Ar', 'Ta', 'Ge', 'Ca', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi',
];
