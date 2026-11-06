import { gcd } from "./common";

export type Frac = [number, number];

const norm = (n: number, d: number): Frac => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
export const fr = (n: number, d = 1): Frac => norm(n, d);
export const add = (a: Frac, b: Frac): Frac => norm(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
export const sub = (a: Frac, b: Frac): Frac => norm(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
export const mul = (a: Frac, b: Frac): Frac => norm(a[0] * b[0], a[1] * b[1]);
export const div = (a: Frac, b: Frac): Frac => norm(a[0] * b[1], a[1] * b[0]);
export const isZero = (a: Frac) => a[0] === 0;
export const eq = (a: Frac, b: Frac) => a[0] === b[0] && a[1] === b[1];

/**
 * For an integer matrix whose nullspace is exactly one-dimensional, returns the
 * nullspace vector scaled to coprime integers (sign chosen so the first non-zero is positive).
 * Returns null if the nullspace dimension is not exactly 1.
 */
export function nullspace1(rows: number[][], n: number): number[] | null {
  const m: Frac[][] = rows.map((r) => r.map((x) => fr(x)));
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < m.length; c++) {
    let p = -1;
    for (let i = r; i < m.length; i++) if (!isZero(m[i][c])) { p = i; break; }
    if (p < 0) continue;
    [m[r], m[p]] = [m[p], m[r]];
    const pv = m[r][c];
    m[r] = m[r].map((x) => div(x, pv));
    for (let i = 0; i < m.length; i++) {
      if (i === r || isZero(m[i][c])) continue;
      const f = m[i][c];
      m[i] = m[i].map((x, j) => sub(x, mul(f, m[r][j])));
    }
    pivots.push(c);
    r++;
  }
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  if (free.length !== 1) return null;
  const fc = free[0];
  const v: Frac[] = Array(n).fill(fr(0));
  v[fc] = fr(1);
  pivots.forEach((c, i) => { v[c] = sub(fr(0), m[i][fc]); });
  const lcm = v.reduce((acc, x) => (acc * x[1]) / gcd(acc, x[1]), 1);
  let ints = v.map((x) => (x[0] * lcm) / x[1]);
  const g = ints.reduce((a, b) => gcd(a, b), 0) || 1;
  ints = ints.map((x) => x / g);
  const firstNz = ints.find((x) => x !== 0) ?? 1;
  return firstNz < 0 ? ints.map((x) => -x) : ints;
}
