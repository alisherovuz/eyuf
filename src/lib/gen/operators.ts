import type { Level } from "../types";
import type { Rng } from "../rng";
import { type Built, type Generator, numericOptions } from "./common";

type Pair = [number, number];

interface OpRule {
  key: string;
  level: Level;
  ks: number[];
  f: (a: number, b: number, k: number) => number | null;
  text: (k: number) => string;
  inputs: (rng: Rng) => Pair;
}

const isSq = (x: number) => Number.isInteger(Math.sqrt(x));
const sqPair = (rng: Rng, lo: number, hi: number): Pair => [rng.int(lo, hi) ** 2, rng.int(lo, hi) ** 2];
const ds = (x: number) => String(x).split("").reduce((s, d) => s + Number(d), 0);
const concat = (x: number, y: number) => Number(`${x}${y}`);

export const OP_RULES: OpRule[] = [
  { key: "sum+k", level: 1, ks: [1, 2, 3, 4, 5], f: (a, b, k) => a + b + k, text: (k) => `a ✱ b = a + b + ${k}`, inputs: (r) => [r.int(2, 19), r.int(2, 19)] },
  { key: "prod-k", level: 1, ks: [1, 2, 3, 4, 5], f: (a, b, k) => a * b - k, text: (k) => `a ✱ b = a · b − ${k}`, inputs: (r) => [r.int(2, 9), r.int(2, 9)] },
  { key: "diff*k", level: 1, ks: [2, 3, 4, 5], f: (a, b, k) => Math.abs(a - b) * k, text: (k) => `a ✱ b = |a − b| · ${k}`, inputs: (r) => [r.int(2, 20), r.int(2, 20)] },
  { key: "sum*k", level: 1, ks: [2, 3, 4], f: (a, b, k) => (a + b) * k, text: (k) => `a ✱ b = (a + b) · ${k}`, inputs: (r) => [r.int(1, 12), r.int(1, 12)] },
  { key: "sq-diff", level: 2, ks: [0], f: (a, b) => (a > b ? a * a - b * b : null), text: () => "a ✱ b = a² − b²", inputs: (r) => { const b = r.int(2, 8); return [b + r.int(1, 5), b]; } },
  { key: "ab+a", level: 2, ks: [0], f: (a, b) => a * b + a, text: () => "a ✱ b = a · b + a", inputs: (r) => [r.int(2, 9), r.int(2, 9)] },
  { key: "sqrt-sum", level: 2, ks: [0], f: (a, b) => (isSq(a) && isSq(b) ? Math.sqrt(a) + Math.sqrt(b) : null), text: () => "a ✱ b = √a + √b", inputs: (r) => sqPair(r, 1, 12) },
  { key: "concat-diff-sum", level: 2, ks: [0], f: (a, b) => concat(Math.abs(a - b), a + b), text: () => "a ✱ b = |a − b| va a + b yonma-yon yoziladi", inputs: (r) => [r.int(2, 9), r.int(2, 9)] },
  { key: "sqrt-prod*k", level: 3, ks: [1, 2, 3], f: (a, b, k) => (isSq(a) && isSq(b) ? Math.sqrt(a) * Math.sqrt(b) * k : null), text: (k) => (k === 1 ? "a ✱ b = √a · √b" : `a ✱ b = √a · √b · ${k}`), inputs: (r) => sqPair(r, 1, 9) },
  { key: "a2+b", level: 3, ks: [0], f: (a, b) => a * a + b, text: () => "a ✱ b = a² + b", inputs: (r) => [r.int(2, 9), r.int(1, 20)] },
  { key: "digitsum-prod", level: 3, ks: [0], f: (a, b) => ds(a) * ds(b), text: () => "a ✱ b = (a raqamlari yig‘indisi) · (b raqamlari yig‘indisi)", inputs: (r) => [r.int(11, 99), r.int(11, 99)] },
  { key: "ab-(a+b)", level: 3, ks: [0], f: (a, b) => a * b - (a + b), text: () => "a ✱ b = a · b − (a + b)", inputs: (r) => [r.int(3, 12), r.int(3, 12)] },
];

function rulesFitting(examples: [number, number, number][]): { key: string; k: number }[] {
  const out: { key: string; k: number }[] = [];
  for (const r of OP_RULES) {
    for (const k of r.ks) if (examples.every(([a, b, c]) => r.f(a, b, k) === c)) out.push({ key: r.key, k });
  }
  return out;
}

const parse = (line: string) => line.split(/[✱=]/).map((s) => Number(s.trim())) as [number, number, number];

function build(rng: Rng, level: Level, ruleKey: string): Built | null {
  const rule = OP_RULES.find((r) => r.key === ruleKey)!;
  const k = rng.pick(rule.ks);
  const pairs: Pair[] = [];
  const seen = new Set<string>();
  for (let t = 0; t < 60 && pairs.length < 4; t++) {
    const p = rule.inputs(rng);
    const v = rule.f(p[0], p[1], k);
    if (v === null || v < 0 || !Number.isInteger(v) || seen.has(p.join(","))) continue;
    seen.add(p.join(","));
    pairs.push(p);
  }
  if (pairs.length < 4) return null;
  const ex = pairs.slice(0, 3).map(([a, b]) => [a, b, rule.f(a, b, k)!] as [number, number, number]);
  const [qa, qb] = pairs[3];
  const ans = rule.f(qa, qb, k)!;
  const other = OP_RULES.flatMap((r) => r.ks.map((kk) => r.f(qa, qb, kk))).filter((v): v is number => v !== null);
  const near = [ans + 1, ans - 1, ans + 2, ans - 2, ans + k + 1, ans * 2, Math.round(ans / 2)];
  const opts = numericOptions(rng, ans, rng.shuffle([...other.filter((v) => Math.abs(v - ans) <= Math.max(6, Math.round(ans * 0.4))), ...near]));
  if (!opts) return null;
  const b: Built = {
    prompt: "✱ belgisi har bir qatorda bir xil amalni bildiradi. ? o‘rniga qaysi son keladi?",
    diagram: { kind: "equations", lines: ex.map(([a, bb, c]) => `${a} ✱ ${bb} = ${c}`), ask: `${qa} ✱ ${qb} = ?` },
    options: opts.options,
    answer: opts.answer,
    explanation: [
      `Qoida: ${rule.text(k)}.`,
      `Tekshiruv: ${ex.map(([a, bb, c]) => `${a} ✱ ${bb} = ${c}`).join(", ")} — hammasi shu qoidaga mos.`,
      `Demak, ${qa} ✱ ${qb} = ${ans}.`,
    ],
    params: `${ruleKey}:${k}:${pairs.map((p) => p.join("x")).join("|")}`,
  };
  return b;
}

function verify(b: Built): number | null {
  if (b.diagram.kind !== "equations") return null;
  const ex = b.diagram.lines.map(parse);
  const [qa, qb] = b.diagram.ask.split(/[✱=]/).map((s) => Number(s.trim()));
  const fits = rulesFitting(ex);
  if (!fits.length) return null;
  const preds = new Set(fits.map(({ key, k }) => OP_RULES.find((r) => r.key === key)!.f(qa, qb, k)));
  if (preds.size !== 1) return null;
  const pred = [...preds][0];
  const hits = b.options.map((o, i) => (Number(o.text) === pred ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

export const operators: Generator = {
  family: "amal",
  name: "Amallar",
  rules: (level) => OP_RULES.filter((r) => r.level === level).map((r) => r.key),
  build,
  verify,
  targetSec: (level) => [0, 40, 60, 90][level],
};
