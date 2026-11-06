import type { Level, Sym } from "../types";
import type { Rng } from "../rng";
import { type Built, type Generator, placeOptions } from "./common";
import { nullspace1 } from "./frac";

const SYMS: Sym[] = ["sq", "tri", "cir", "star"];
export const GLYPH: Record<Sym, string> = { sq: "■", tri: "▲", cir: "●", star: "★", dia: "◆", plus: "✚", hex: "⬢" };

type Multi = number[]; // counts per symbol index

const weightOf = (m: Multi, w: number[]) => m.reduce((s, c, i) => s + c * w[i], 0);
const size = (m: Multi) => m.reduce((a, b) => a + b, 0);
const key = (m: Multi) => m.join(",");
const toSyms = (m: Multi): Sym[] => m.flatMap((c, i) => Array<Sym>(c).fill(SYMS[i]));
const fromSyms = (s: Sym[], n: number): Multi => {
  const m = Array(n).fill(0);
  for (const x of s) m[SYMS.indexOf(x)]++;
  return m;
};
export const fmt = (m: Multi) =>
  m.map((c, i) => (c ? (c === 1 ? GLYPH[SYMS[i]] : `${c}${GLYPH[SYMS[i]]}`) : "")).filter(Boolean).join(" + ");

function allMultis(n: number, maxSize: number, allowed: number[]): Multi[] {
  const out: Multi[] = [];
  const rec = (i: number, cur: Multi, left: number) => {
    if (i === allowed.length) {
      if (size(cur) > 0) out.push(cur.slice());
      return;
    }
    for (let c = 0; c <= left; c++) {
      cur[allowed[i]] = c;
      rec(i + 1, cur, left - c);
    }
    cur[allowed[i]] = 0;
  };
  rec(0, Array(n).fill(0), maxSize);
  return out;
}

function makeEquation(rng: Rng, w: number[], n: number, direct: boolean): [Multi, Multi] | null {
  const idx = rng.shuffle([...Array(n).keys()]);
  const split = direct ? 1 : rng.int(1, n - 1);
  const leftSyms = idx.slice(0, split);
  const rightSyms = idx.slice(split);
  const lefts = allMultis(n, direct ? 1 : 3, leftSyms);
  const rights = allMultis(n, 4, rightSyms);
  for (const L of rng.shuffle(lefts)) {
    const wl = weightOf(L, w);
    const matches = rights.filter((R) => weightOf(R, w) === wl && (direct ? R.filter((c) => c > 0).length === 1 : true));
    if (matches.length) return [L, rng.pick(matches)];
  }
  return null;
}

function build(rng: Rng, level: Level, rule: string): Built | null {
  const n = rule === "mixed4" ? 4 : 3;
  const w = rng.shuffle([1, 2, 3, 4, 5, 6]).slice(0, n);
  const eqCount = n - 1;
  const eqs: [Multi, Multi][] = [];
  for (let k = 0; k < eqCount; k++) {
    const e = makeEquation(rng, w, n, rule === "direct3" && k === 0);
    if (!e) return null;
    eqs.push(e);
  }
  const rows = eqs.map(([L, R]) => L.map((c, i) => c - R[i]));
  if (!nullspace1(rows, n)) return null;

  const all = allMultis(n, 4, [...Array(n).keys()]);
  const asks = all.filter((m) => size(m) >= 1 && size(m) <= 3);
  const sides = new Set(eqs.flatMap(([L, R]) => [key(L), key(R)]));
  for (const ask of rng.shuffle(asks)) {
    const target = weightOf(ask, w);
    const corrects = all.filter((m) => {
      if (weightOf(m, w) !== target || key(m) === key(ask)) return false;
      if (m.some((c, i) => c > 0 && ask[i] > 0)) return false;
      if (level >= 2 && sides.has(key(m))) return false;
      return true;
    });
    if (!corrects.length) continue;
    const correct = rng.pick(corrects);
    const near = all
      .filter((m) => weightOf(m, w) !== target && key(m) !== key(ask))
      .sort((a, b) => Math.abs(weightOf(a, w) - target) - Math.abs(weightOf(b, w) - target));
    const placed = placeOptions(rng, correct, rng.shuffle(near.slice(0, 14)), key);
    if (!placed) return null;

    const ints = nullspace1(rows, n)!;
    const weightsLine = ints.map((v, i) => `${GLYPH[SYMS[i]]} = ${v}`).join(", ");
    const explanation = [
      `Tarozilar: ${eqs.map(([L, R]) => `${fmt(L)} = ${fmt(R)}`).join("; ")}.`,
      `Ularga mos eng kichik butun og‘irliklar: ${weightsLine}.`,
      `Tekshiruv: ${eqs.map(([L, R]) => `${weightOf(L, ints)} = ${weightOf(R, ints)}`).join("; ")}.`,
      `So‘ralgan tomon: ${fmt(ask)} = ${weightOf(ask, ints)}. Faqat ${fmt(correct)} = ${weightOf(correct, ints)} mos keladi.`,
    ];
    return {
      prompt: "Yuqoridagi tarozilar muvozanatda. Oxirgi tarozida ? o‘rniga qaysi javob qo‘yilsa, u ham muvozanatda bo‘ladi?",
      diagram: { kind: "scales", pans: eqs.map(([L, R]) => ({ left: toSyms(L), right: toSyms(R) })), ask: toSyms(ask) },
      options: placed.options.map((m) => ({ syms: toSyms(m) })),
      answer: placed.answer,
      explanation,
      params: `${w.join("")}:${eqs.map(([L, R]) => key(L) + "=" + key(R)).join("|")}:${key(ask)}`,
    };
  }
  return null;
}

function verify(b: Built): number | null {
  if (b.diagram.kind !== "scales") return null;
  const used = new Set<Sym>([...b.diagram.pans.flatMap((p) => [...p.left, ...p.right]), ...b.diagram.ask]);
  const n = Math.max(...[...used].map((s) => SYMS.indexOf(s))) + 1;
  const rows = b.diagram.pans.map((p) => {
    const L = fromSyms(p.left, n), R = fromSyms(p.right, n);
    return L.map((c, i) => c - R[i]);
  });
  const v = nullspace1(rows, n);
  if (!v || v.some((x) => x <= 0)) return null;
  const target = weightOf(fromSyms(b.diagram.ask, n), v);
  const hits = b.options.map((o, i) => (weightOf(fromSyms(o.syms ?? [], n), v) === target ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

export const scales: Generator = {
  family: "tarozi",
  name: "Tarozilar",
  rules: (level) => (level === 1 ? ["direct3"] : level === 2 ? ["mixed3", "direct3"] : ["mixed4", "mixed3"]),
  build,
  verify,
  targetSec: (level) => [0, 45, 70, 100][level],
};
