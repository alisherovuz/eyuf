import type { Level, Sym } from "../types";
import type { Rng } from "../rng";
import { type Built, type Generator, placeOptions } from "./common";
import { GLYPH } from "./scales";

const POOL: Sym[] = ["sq", "cir", "tri", "star", "dia", "plus", "hex"];

/** All symbol→digit mappings consistent with some one-to-one pairing of rows and codes. Capped to keep it cheap. */
export function solveCipher(rows: Sym[][], codes: string[], cap = 50): Map<Sym, string>[] {
  const out: Map<Sym, string>[] = [];
  const usedCode = Array(codes.length).fill(false);
  const rec = (i: number, map: Map<Sym, string>, rev: Map<string, Sym>) => {
    if (out.length >= cap) return;
    if (i === rows.length) { out.push(new Map(map)); return; }
    for (let c = 0; c < codes.length; c++) {
      if (usedCode[c] || codes[c].length !== rows[i].length) continue;
      const added: Sym[] = [];
      let ok = true;
      for (let p = 0; p < rows[i].length && ok; p++) {
        const s = rows[i][p], d = codes[c][p];
        const cur = map.get(s);
        if (cur === undefined) {
          if (rev.has(d)) ok = false;
          else { map.set(s, d); rev.set(d, s); added.push(s); }
        } else if (cur !== d) ok = false;
      }
      if (ok) { usedCode[c] = true; rec(i + 1, map, rev); usedCode[c] = false; }
      for (const s of added) { rev.delete(map.get(s)!); map.delete(s); }
    }
  };
  rec(0, new Map(), new Map());
  return out;
}

const decode = (m: Map<Sym, string>, q: Sym[]) => (q.every((s) => m.has(s)) ? q.map((s) => m.get(s)).join("") : null);

function build(rng: Rng, level: Level, rule: string): Built | null {
  const k = level === 1 ? 5 : 6;
  const len = level === 1 ? 3 : level === 2 ? 3 : 4;
  const syms = rng.shuffle(POOL).slice(0, k);
  const digits = rng.shuffle(["1", "2", "3", "4", "5", "6", "7", "8", "9"]).slice(0, k);
  const map = new Map(syms.map((s, i) => [s, digits[i]] as [Sym, string]));
  const rows: Sym[][] = [];
  const seen = new Set<string>();
  for (let t = 0; t < 200 && rows.length < 5; t++) {
    const row = level === 3
      ? Array.from({ length: len }, () => rng.pick(syms))
      : rng.shuffle(syms).slice(0, len);
    const kk = row.join(",");
    if (seen.has(kk)) continue;
    seen.add(kk);
    rows.push(row);
  }
  if (rows.length < 5) return null;
  const covered = new Set(rows.flat());
  if (covered.size < k) return null;
  const codes = rows.map((r) => decode(map, r)!);
  const shownCodes = rng.shuffle(codes);
  let ask: Sym[];
  if (rule === "known-row") ask = rng.pick(rows);
  else {
    let t = 0;
    do { ask = Array.from({ length: len }, () => rng.pick(syms)); t++; } while (seen.has(ask.join(",")) && t < 50);
    if (seen.has(ask.join(","))) return null;
  }
  const answer = decode(map, ask)!;

  const sols = solveCipher(rows, shownCodes);
  if (sols.length === 0) return null;
  const preds = new Set(sols.map((m) => decode(m, ask)));
  if (preds.size !== 1 || preds.has(null)) return null;

  const swaps: string[] = [];
  for (let i = 0; i < len; i++) for (let j = i + 1; j < len; j++) {
    const a = answer.split("");
    [a[i], a[j]] = [a[j], a[i]];
    swaps.push(a.join(""));
  }
  const wrongDigit = answer.split("").map((d, i) => answer.slice(0, i) + rng.pick(digits.filter((x) => x !== d)) + answer.slice(i + 1));
  const distract = rng.shuffle([...shownCodes, ...swaps, ...wrongDigit]);
  const placed = placeOptions(rng, answer, distract, (s) => s);
  if (!placed) return null;
  const mapping = [...map.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([s, d]) => `${GLYPH[s]} = ${d}`).join(", ");
  return {
    prompt: "Har bir belgi bitta raqamni bildiradi. Kodlar aralash tartibda berilgan. So‘ralgan qator qaysi kodga teng?",
    diagram: { kind: "cipher", rows, codes: shownCodes, ask },
    options: placed.options.map((t) => ({ text: t })),
    answer: placed.answer,
    explanation: [
      "Kodlar qatorlar bilan bir xil tartibda emas. Har bir belgi nechta qatorda uchrashini va har bir raqam nechta kodda uchrashini solishtiring; takrorlanuvchi belgilar naqshi ham yordam beradi.",
      `Shunda yagona moslik chiqadi: ${mapping}.`,
      `Demak, ${ask.map((s) => GLYPH[s]).join("")} = ${answer}.`,
    ],
    params: `${rule}:${rows.map((r) => r.join("")).join("|")}:${[...map.values()].join("")}:${ask.join("")}`,
  };
}

function verify(b: Built): number | null {
  if (b.diagram.kind !== "cipher") return null;
  const { rows, codes, ask } = b.diagram;
  const sols = solveCipher(rows, codes);
  if (!sols.length) return null;
  const preds = new Set(sols.map((m) => decode(m, ask)));
  if (preds.size !== 1 || preds.has(null)) return null;
  const pred = [...preds][0];
  const hits = b.options.map((o, i) => (o.text === pred ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

export const cipher: Generator = {
  family: "shifr",
  name: "Shifrlar",
  rules: (level) => (level === 1 ? ["known-row"] : ["new-row", "known-row"]),
  build,
  verify,
  targetSec: (level) => [0, 60, 90, 120][level],
};
