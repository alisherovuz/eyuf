import type { Level } from "../types";
import type { Rng } from "../rng";
import { type Built, type Generator, numericOptions } from "./common";

/** heights[y][x]; larger x and y are closer to the viewer. Every top face is visible when heights never grow toward the viewer. */
export function isStaircase(h: number[][]): boolean {
  for (let y = 0; y < h.length; y++)
    for (let x = 0; x < h[y].length; x++) {
      if (x > 0 && h[y][x] > h[y][x - 1]) return false;
      if (y > 0 && h[y][x] > h[y - 1][x]) return false;
    }
  return true;
}

const total = (h: number[][]) => h.flat().reduce((a, b) => a + b, 0);

function build(rng: Rng, level: Level, rule: string): Built | null {
  const [rows, cols, maxH] = level === 1 ? [3, 3, 3] : level === 2 ? [3, 4, 4] : [4, 5, 5];
  const h: number[][] = [];
  for (let y = 0; y < rows; y++) {
    h.push([]);
    for (let x = 0; x < cols; x++) {
      const cap = Math.min(y > 0 ? h[y - 1][x] : maxH, x > 0 ? h[y][x - 1] : maxH);
      const lo = Math.max(0, cap - 2);
      h[y].push(x === 0 && y === 0 ? maxH : rng.int(lo, cap));
    }
  }
  if (h[rows - 1][0] === 0 || h[0][cols - 1] === 0) return null;
  const n = total(h);
  const distinct = new Set(h.flat()).size;
  if (distinct < Math.min(3, maxH)) return null;
  const box: [number, number, number] = [cols, rows, maxH];
  const full = cols * rows * maxH;
  const ans = rule === "missing" ? full - n : n;
  if (rule === "missing" && ans < 4) return null;
  const opts = numericOptions(rng, ans, rng.shuffle([ans - 1, ans + 1, ans - 2, ans + 2, ans - 3, ans + 3, ans + 4]));
  if (!opts) return null;
  const layers = Array.from({ length: maxH }, (_, z) => h.flat().filter((v) => v > z).length);
  const layerText = layers.map((c, z) => `${z + 1}-qavat: ${c}`).join(", ");
  const explanation = rule === "missing"
    ? [`Kublarni qavatma-qavat sanang: ${layerText}. Jami ${n} ta.`, `To‘liq ${cols}×${rows}×${maxH} quti ${full} ta kubdan iborat.`, `Yetishmaydi: ${full} − ${n} = ${ans}.`]
    : [`Kublarni qavatma-qavat sanang (pastdan): ${layerText}.`, `Jami: ${layers.join(" + ")} = ${n}.`];
  return {
    prompt: rule === "missing"
      ? `Shakl ${cols}×${rows}×${maxH} o‘lchamli to‘liq qutiga aylanishi uchun yana nechta kub kerak? Ko‘rinmaydigan joylarda bo‘shliq yo‘q.`
      : "Shaklda nechta kub bor? Har bir kub ostida kub bor, ko‘rinmaydigan joylarda bo‘shliq yo‘q.",
    diagram: { kind: "cubes", heights: h, box: rule === "missing" ? box : undefined },
    options: opts.options,
    answer: opts.answer,
    explanation,
    params: `${rule}:${h.map((r) => r.join("")).join("|")}`,
  };
}

function verify(b: Built): number | null {
  if (b.diagram.kind !== "cubes") return null;
  const { heights, box } = b.diagram;
  if (!isStaircase(heights)) return null;
  const n = total(heights);
  const want = box ? box[0] * box[1] * box[2] - n : n;
  if (box && heights.flat().some((v) => v > box[2])) return null;
  const hits = b.options.map((o, i) => (Number(o.text) === want ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

export const cubes: Generator = {
  family: "kub",
  name: "Kublar",
  rules: (level) => (level === 1 ? ["count"] : ["count", "missing"]),
  build,
  verify,
  targetSec: (level) => [0, 45, 70, 100][level],
};
