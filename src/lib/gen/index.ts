import type { Level, Question } from "../types";
import { makeRng } from "../rng";
import type { Generator } from "./common";
import { scales } from "./scales";
import { operators } from "./operators";
import { cipher } from "./cipher";
import { series } from "./series";
import { wheel } from "./wheel";
import { cubes } from "./cubes";

export const GENERATORS: Generator[] = [scales, operators, cipher, series, wheel, cubes];
export const GEN_BY_FAMILY = Object.fromEntries(GENERATORS.map((g) => [g.family, g])) as Record<string, Generator>;

const MAX_TRIES = 400;

export function genId(family: string, level: Level, rule: string, seed: number) {
  return `g:${family}:${level}:${rule}:${seed}`;
}

/** Deterministic: the same id always produces the same question. Returns null only if no valid seed was found. */
export function generate(family: string, level: Level, rule: string, seed: number): Question | null {
  const g = GEN_BY_FAMILY[family];
  if (!g || !g.rules(level).includes(rule)) return null;
  for (let t = 0; t < MAX_TRIES; t++) {
    const rng = makeRng((seed + t * 7919) >>> 0);
    const b = g.build(rng, level, rule);
    if (!b) continue;
    if (g.verify(b) !== b.answer) continue;
    return {
      id: genId(family, level, rule, seed),
      source: "generator",
      family,
      rule,
      fingerprint: `${family}|${rule}|${b.params}`,
      level,
      prompt: b.prompt,
      diagram: b.diagram,
      options: b.options,
      answer: b.answer,
      explanation: b.explanation,
      targetSec: g.targetSec(level),
    };
  }
  return null;
}

export function parseGenId(id: string): { family: string; level: Level; rule: string; seed: number } | null {
  const m = /^g:([a-z]+):([123]):([^:]+):(\d+)$/.exec(id);
  if (!m) return null;
  return { family: m[1], level: Number(m[2]) as Level, rule: m[3], seed: Number(m[4]) };
}
