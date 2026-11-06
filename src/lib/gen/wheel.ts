import type { Level } from "../types";
import type { Rng } from "../rng";
import { type Built, type Generator, numericOptions } from "./common";

interface Rel {
  key: string;
  level: Level;
  center: boolean;
  ks: number[];
  /** b from a */
  fwd: (a: number, k: number) => number | null;
  /** a from b */
  back: (b: number, k: number) => number | null;
  /** a, b inputs that define a valid pair */
  pick: (rng: Rng, k: number) => number;
  text: (k: number) => string;
}

const intOrNull = (x: number) => (Number.isInteger(x) ? x : null);

export const RELS: Rel[] = [
  { key: "opp-sum", level: 1, center: true, ks: [], fwd: (a, C) => C - a, back: (b, C) => C - b, pick: (r, C) => r.int(1, C - 1), text: (C) => `Qarama-qarshi sonlar yig‘indisi markazdagi ${C} ga teng.` },
  { key: "opp-prod", level: 2, center: true, ks: [], fwd: (a, C) => intOrNull(C / a), back: (b, C) => intOrNull(C / b), pick: () => 0, text: (C) => `Qarama-qarshi sonlar ko‘paytmasi markazdagi ${C} ga teng.` },
  { key: "opp-mul", level: 2, center: false, ks: [2, 3, 4, 5], fwd: (a, m) => a * m, back: (b, m) => intOrNull(b / m), pick: (r) => r.int(2, 15), text: (m) => `Har bir son qarshisidagi sonning ${m} barobari.` },
  { key: "opp-2a+k", level: 3, center: false, ks: [-3, -2, -1, 1, 2, 3, 4, 5], fwd: (a, k) => 2 * a + k, back: (b, k) => intOrNull((b - k) / 2), pick: (r) => r.int(2, 20), text: (k) => `Har bir son: qarshisidagi son × 2 ${k > 0 ? "+" : "−"} ${Math.abs(k)}.` },
  { key: "opp-sq+k", level: 3, center: false, ks: [-2, -1, 0, 1, 2, 3], fwd: (a, k) => a * a + k, back: (b, k) => { const r = Math.sqrt(b - k); return Number.isInteger(r) ? r : null; }, pick: (r) => r.int(2, 9), text: (k) => `Har bir son: qarshisidagi sonning kvadrati${k ? ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}` : ""}.` },
];

/** Predicts the missing spoke under every relation that fits all complete pairs, in either direction. */
function predictions(spokes: (number | null)[], center: number | null): Set<number> {
  const pairs = [0, 1, 2, 3].map((i) => [spokes[i], spokes[i + 4]] as [number | null, number | null]);
  const full = pairs.filter(([a, b]) => a !== null && b !== null) as [number, number][];
  const partial = pairs.find(([a, b]) => a === null || b === null)!;
  const preds = new Set<number>();
  for (const rel of RELS) {
    const ks = rel.center ? (center === null ? [] : [center]) : rel.ks;
    for (const k of ks) {
      for (const dir of [0, 1]) {
        const f = dir === 0 ? rel.fwd : rel.back;
        const g = dir === 0 ? rel.back : rel.fwd;
        if (!full.every(([a, b]) => f(a, k) === b)) continue;
        const [pa, pb] = partial;
        const v = pa === null ? g(pb!, k) : f(pa, k);
        if (v !== null && v > 0) preds.add(v);
      }
    }
  }
  return preds;
}

function build(rng: Rng, _level: Level, ruleKey: string): Built | null {
  const rel = RELS.find((r) => r.key === ruleKey)!;
  let k: number;
  const tops: number[] = [], bottoms: number[] = [];
  if (rel.key === "opp-prod") {
    const C = rng.pick([24, 36, 48, 60, 72, 84, 90, 96, 120]);
    const divs = [...Array(C).keys()].slice(1).filter((d) => C % d === 0 && d > 1 && d * d < C);
    const chosen = rng.shuffle(divs).slice(0, 4);
    if (chosen.length < 4) return null;
    k = C;
    for (const d of chosen) { tops.push(d); bottoms.push(C / d); }
  } else {
    k = rel.center ? rng.int(15, 40) : rng.pick(rel.ks);
    const seen = new Set<number>();
    for (let t = 0; t < 60 && tops.length < 4; t++) {
      const a = rel.pick(rng, k);
      const b = rel.fwd(a, k);
      if (b === null || b <= 0 || seen.has(a) || a === b) continue;
      seen.add(a);
      tops.push(a); bottoms.push(b);
    }
    if (tops.length < 4) return null;
  }
  const spokes: (number | null)[] = [...tops, ...bottoms];
  const miss = rng.int(0, 7);
  const ans = spokes[miss]!;
  spokes[miss] = null;
  const center = rel.center ? k : null;
  const preds = predictions(spokes, center);
  if (preds.size !== 1 || !preds.has(ans)) return null;
  const opp = spokes[(miss + 4) % 8]!;
  const opts = numericOptions(rng, ans, rng.shuffle([ans + 1, ans - 1, ans + 2, ans - 2, opp, ans + 3, ans * 2, ans + opp, Math.abs(ans - 4)]));
  if (!opts) return null;
  const pairText = [0, 1, 2, 3].filter((i) => i !== miss % 4).slice(0, 2).map((i) => `${tops[i]} ↔ ${bottoms[i]}`).join(", ");
  return {
    prompt: "Doiradagi sonlar bir qoida asosida joylashgan. ? o‘rniga qaysi son keladi?",
    diagram: { kind: "wheel", spokes, center },
    options: opts.options,
    answer: opts.answer,
    explanation: [`Qoida: ${rel.text(k)}`, `Masalan: ${pairText}.`, `Demak, ? = ${ans} (qarshisida ${opp}).`],
    params: `${ruleKey}:${k}:${spokes.join(",")}`,
  };
}

function verify(b: Built): number | null {
  if (b.diagram.kind !== "wheel") return null;
  const preds = predictions(b.diagram.spokes, b.diagram.center);
  if (preds.size !== 1) return null;
  const p = [...preds][0];
  const hits = b.options.map((o, i) => (Number(o.text) === p ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

export const wheel: Generator = {
  family: "doira",
  name: "Son doirasi",
  rules: (level) => RELS.filter((r) => r.level === level).map((r) => r.key),
  build,
  verify,
  targetSec: (level) => [0, 35, 55, 80][level],
};
