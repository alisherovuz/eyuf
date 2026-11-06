import { describe, expect, it } from "vitest";
import { GENERATORS, generate, parseGenId } from "@/lib/gen";
import type { Level } from "@/lib/types";

const SEEDS = 300;
// Rules whose whole parameter space is small (geometric and cube series grow too fast); they still get exact-repeat protection from the selector.
const SMALL_SPACE = new Set(["geom", "cubes+k"]);

describe.each(GENERATORS.map((g) => [g.family, g] as const))("%s generator", (family, g) => {
  for (const level of [1, 2, 3] as Level[]) {
    for (const rule of g.rules(level)) {
      it(`level ${level} / ${rule}: every question has exactly one defensible answer`, () => {
        const fingerprints = new Set<string>();
        let made = 0;
        for (let s = 1; s <= SEEDS; s++) {
          const q = generate(family, level, rule, s * 104729);
          expect(q, `seed ${s}`).not.toBeNull();
          if (!q) continue;
          made++;
          expect(q.options).toHaveLength(5);
          const keys = q.options.map((o) => o.text ?? (o.syms ?? []).join(","));
          expect(new Set(keys).size).toBe(5);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(5);
          expect(g.verify({ ...q, params: "" })).toBe(q.answer);
          expect(q.explanation.length).toBeGreaterThan(0);
          expect(q.explanation.join(" ")).not.toMatch(/undefined|NaN|null/);
          fingerprints.add(q.fingerprint);
          const again = generate(family, level, rule, s * 104729);
          expect(again?.fingerprint).toBe(q.fingerprint);
        }
        expect(made).toBe(SEEDS);
        expect(fingerprints.size).toBeGreaterThan(SMALL_SPACE.has(rule) ? 60 : SEEDS * 0.55);
      });
    }
  }
});

it("ids round-trip", () => {
  const q = generate("tarozi", 2, "mixed3", 12345)!;
  expect(parseGenId(q.id)).toEqual({ family: "tarozi", level: 2, rule: "mixed3", seed: 12345 });
});
