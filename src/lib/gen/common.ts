import type { Diagram, Level, Option } from "../types";
import type { Rng } from "../rng";

export interface Built {
  prompt: string;
  diagram: Diagram;
  options: Option[];
  answer: number;
  explanation: string[];
  params: string;
}

export interface Generator {
  family: string;
  name: string;
  rules(level: Level): string[];
  build(rng: Rng, level: Level, rule: string): Built | null;
  /** Re-derives the answer from the diagram and options alone. Returns the answer index, or null if not exactly one option is defensible. */
  verify(b: Built): number | null;
  targetSec(level: Level): number;
}

/** Places the correct value among distractors in random order. Returns null if there are not enough distinct distractors. */
export function placeOptions<T>(rng: Rng, correct: T, distractors: T[], key: (t: T) => string, count = 5): { options: T[]; answer: number } | null {
  const seen = new Set([key(correct)]);
  const picked: T[] = [];
  for (const d of distractors) {
    const k = key(d);
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(d);
    if (picked.length === count - 1) break;
  }
  if (picked.length < count - 1) return null;
  const all = rng.shuffle([correct, ...picked]);
  return { options: all, answer: all.findIndex((t) => key(t) === key(correct)) };
}

export function numericOptions(rng: Rng, correct: number, candidates: number[]): { options: Option[]; answer: number } | null {
  const pool = candidates.filter((n) => Number.isInteger(n) && n >= 0 && n !== correct);
  const uniq = [...new Set(pool)];
  const chosen = rng.shuffle(uniq).slice(0, 4);
  if (chosen.length < 4) return null;
  const sorted = [correct, ...chosen].sort((a, b) => a - b);
  return { options: sorted.map((n) => ({ text: String(n) })), answer: sorted.indexOf(correct) };
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
