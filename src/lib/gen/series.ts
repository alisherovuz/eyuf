import type { Level } from "../types";
import type { Rng } from "../rng";
import { type Built, type Generator, numericOptions } from "./common";

interface SeriesRule {
  key: string;
  level: Level;
  /** Builds a random instance: returns the full sequence and a description. */
  make: (rng: Rng, n: number) => { seq: number[]; text: string } | null;
  /** Derives parameters from the first terms (always known) and returns the full sequence, or null if it does not fit. */
  fit: (t: number[], n: number) => number[] | null;
}

const run = (n: number, start: number[], step: (prev: number[], i: number) => number) => {
  const s = start.slice();
  while (s.length < n) s.push(step(s, s.length));
  return s;
};

export const SERIES_RULES: SeriesRule[] = [
  {
    key: "arith", level: 1,
    make: (r, n) => { const a = r.int(1, 99), d = r.int(2, 15); return { seq: run(n, [a], (s) => s[s.length - 1] + d), text: `Har bir son oldingisidan ${d} ga katta.` }; },
    fit: (t, n) => { const d = t[1] - t[0]; return run(n, [t[0]], (s) => s[s.length - 1] + d); },
  },
  {
    key: "geom", level: 1,
    make: (r, n) => { const a = r.int(1, 25), q = r.pick([2, 3]); return { seq: run(n, [a], (s) => s[s.length - 1] * q), text: `Har bir son oldingisining ${q} barobari.` }; },
    fit: (t, n) => { if (t[0] === 0 || t[1] % t[0] !== 0) return null; const q = t[1] / t[0]; return run(n, [t[0]], (s) => s[s.length - 1] * q); },
  },
  {
    key: "alt", level: 1,
    make: (r, n) => { const p = r.int(3, 12), q = r.int(1, p - 1), a = r.int(5, 40); return { seq: run(n, [a], (s, i) => s[i - 1] + (i % 2 ? p : -q)), text: `Navbatma-navbat +${p} va −${q}.` }; },
    fit: (t, n) => { const p = t[1] - t[0], q = t[1] - t[2]; return run(n, [t[0]], (s, i) => s[i - 1] + (i % 2 ? p : -q)); },
  },
  {
    key: "inc-diff", level: 2,
    make: (r, n) => { const a = r.int(1, 40), d = r.int(1, 6), st = r.pick([1, 2, 3]); return { seq: run(n, [a], (s, i) => s[i - 1] + d + (i - 1) * st), text: `Ayirmalar har safar ${st} ga ortadi: +${d}, +${d + st}, +${d + 2 * st}, …` }; },
    fit: (t, n) => { const d = t[1] - t[0], st = t[2] - t[1] - d; return run(n, [t[0]], (s, i) => s[i - 1] + d + (i - 1) * st); },
  },
  {
    key: "interleave", level: 2,
    make: (r, n) => {
      const a = r.int(1, 20), d1 = r.pick([2, 3, 4, 5]), b = r.int(20, 60), d2 = r.pick([-5, -4, -3, -2, 6, 7]);
      return { seq: run(n, [a, b], (s, i) => s[i - 2] + (i % 2 ? d2 : d1)), text: `Ikki qator aralash: toq o‘rinlarda +${d1}, juft o‘rinlarda ${d2 > 0 ? "+" : "−"}${Math.abs(d2)}.` };
    },
    fit: (t, n) => { const d1 = t[2] - t[0], d2 = t[3] - t[1]; return run(n, [t[0], t[1]], (s, i) => s[i - 2] + (i % 2 ? d2 : d1)); },
  },
  {
    key: "xq+k", level: 2,
    make: (r, n) => { const a = r.int(1, 12), q = r.pick([2, 3]), k = r.pick([-3, -2, -1, 1, 2, 3, 4, 5]); return { seq: run(n, [a], (s) => s[s.length - 1] * q + k), text: `Har bir son: oldingisi × ${q} ${k > 0 ? "+" : "−"} ${Math.abs(k)}.` }; },
    fit: (t, n) => { const dd = t[1] - t[0]; if (dd === 0 || (t[2] - t[1]) % dd !== 0) return null; const q = (t[2] - t[1]) / dd, k = t[1] - q * t[0]; return run(n, [t[0]], (s) => s[s.length - 1] * q + k); },
  },
  {
    key: "squares+k", level: 2,
    make: (r, n) => { const s0 = r.int(1, 12), k = r.int(-5, 5); return { seq: Array.from({ length: n }, (_, i) => (i + s0) ** 2 + k), text: `Ketma-ket sonlarning kvadratlari${k ? ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}` : ""}: ${s0}², ${s0 + 1}², …` }; },
    fit: (t, n) => { const d = t[1] - t[0]; if ((d - 1) % 2 !== 0) return null; const s0 = (d - 1) / 2, k = t[0] - s0 * s0; return Array.from({ length: n }, (_, i) => (i + s0) ** 2 + k); },
  },
  {
    key: "fib", level: 3,
    make: (r, n) => { const a = r.int(1, 15), b = r.int(1, 20); return { seq: run(n, [a, b], (s, i) => s[i - 1] + s[i - 2]), text: "Har bir son oldingi ikki sonning yig‘indisi." }; },
    fit: (t, n) => run(n, [t[0], t[1]], (s, i) => s[i - 1] + s[i - 2]),
  },
  {
    key: "mul-add", level: 3,
    make: (r, n) => { const a = r.int(1, 12), p = r.pick([2, 3]), q = r.int(1, 12); return { seq: run(n, [a], (s, i) => (i % 2 ? s[i - 1] * p : s[i - 1] + q)), text: `Navbatma-navbat × ${p} va + ${q}.` }; },
    fit: (t, n) => { if (t[0] === 0 || t[1] % t[0] !== 0) return null; const p = t[1] / t[0], q = t[2] - t[1]; return run(n, [t[0]], (s, i) => (i % 2 ? s[i - 1] * p : s[i - 1] + q)); },
  },
  {
    key: "add-mul", level: 3,
    make: (r, n) => { const a = r.int(1, 12), p = r.pick([2, 3]), q = r.int(1, 12); return { seq: run(n, [a], (s, i) => (i % 2 ? s[i - 1] + q : s[i - 1] * p)), text: `Navbatma-navbat + ${q} va × ${p}.` }; },
    fit: (t, n) => { const q = t[1] - t[0]; if (t[1] === 0 || t[2] % t[1] !== 0) return null; const p = t[2] / t[1]; return run(n, [t[0]], (s, i) => (i % 2 ? s[i - 1] + q : s[i - 1] * p)); },
  },
  {
    key: "diff-geom", level: 3,
    make: (r, n) => { const a = r.int(1, 40), d = r.int(1, 4), q = r.pick([2, 3]); return { seq: run(n, [a], (s, i) => s[i - 1] + d * q ** (i - 1)), text: `Ayirmalar har safar ${q} barobar ortadi: +${d}, +${d * q}, +${d * q * q}, …` }; },
    fit: (t, n) => { const d = t[1] - t[0]; if (d === 0 || (t[2] - t[1]) % d !== 0) return null; const q = (t[2] - t[1]) / d; return run(n, [t[0]], (s, i) => s[i - 1] + d * q ** (i - 1)); },
  },
  {
    key: "cubes+k", level: 3,
    make: (r, n) => { const s0 = r.int(1, 8), k = r.int(-3, 3); return { seq: Array.from({ length: n }, (_, i) => (i + s0) ** 3 + k), text: `Ketma-ket sonlarning kublari${k ? ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}` : ""}: ${s0}³, ${s0 + 1}³, …` }; },
    fit: (t, n) => {
      for (let s0 = 0; s0 <= 12; s0++) { const k = t[0] - s0 ** 3; const seq = Array.from({ length: n }, (_, i) => (i + s0) ** 3 + k); if (seq[1] === t[1] && seq[2] === t[2]) return seq; }
      return null;
    },
  },
];

function predictions(items: (number | null)[]): Set<number> {
  const n = items.length;
  const known = items.filter((x): x is number => x !== null);
  const preds = new Set<number>();
  for (const r of SERIES_RULES) {
    const seq = r.fit(known.slice(0, 4), n);
    if (!seq || seq.some((v) => !Number.isFinite(v))) continue;
    if (items.every((x, i) => x === null || x === seq[i])) preds.add(seq[items.indexOf(null)]);
  }
  return preds;
}

function build(rng: Rng, level: Level, ruleKey: string): Built | null {
  const rule = SERIES_RULES.find((r) => r.key === ruleKey)!;
  const n = level === 1 || ruleKey === "cubes+k" ? 6 : 7;
  const made = rule.make(rng, n);
  if (!made) return null;
  const { seq, text } = made;
  if (seq.some((v) => Math.abs(v) > 6000) || new Set(seq).size < n - 1) return null;
  if (level === 1 && seq.some((v) => v < 0)) return null;
  const miss = rng.pick([n - 1, n - 2]);
  const items = seq.map((v, i) => (i === miss ? null : v));
  const preds = predictions(items);
  if (preds.size !== 1 || !preds.has(seq[miss])) return null;
  const ans = seq[miss];
  const d = seq[miss] - seq[miss - 1];
  const opts = numericOptions(rng, ans, rng.shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + d, ans - d, seq[miss - 1] + d + 1, ans + 3, ans - 3]));
  if (!opts) return null;
  return {
    prompt: "Qatorni davom ettiring: ? o‘rniga qaysi son keladi?",
    diagram: { kind: "series", items },
    options: opts.options,
    answer: opts.answer,
    explanation: [`Qoida: ${text}`, `To‘liq qator: ${seq.join(", ")}.`, `Demak, ? = ${ans}.`],
    params: `${ruleKey}:${seq.join(",")}:${miss}`,
  };
}

function verify(b: Built): number | null {
  if (b.diagram.kind !== "series") return null;
  const preds = predictions(b.diagram.items);
  if (preds.size !== 1) return null;
  const p = [...preds][0];
  const hits = b.options.map((o, i) => (Number(o.text) === p ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

export const series: Generator = {
  family: "qator",
  name: "Sonlar qatori",
  rules: (level) => SERIES_RULES.filter((r) => r.level === level).map((r) => r.key),
  build,
  verify,
  targetSec: (level) => [0, 30, 50, 75][level],
};
