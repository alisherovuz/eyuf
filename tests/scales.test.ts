import { expect, it } from "vitest";
import { generate, GEN_BY_FAMILY } from "@/lib/gen";
import type { Level } from "@/lib/types";

const k = (s: string[]) => [...s].sort().join(",");

it("the last balance never repeats a side of a given balance", () => {
  for (const level of [1, 2, 3] as Level[])
    for (const rule of GEN_BY_FAMILY.tarozi.rules(level))
      for (let s = 1; s <= 300; s++) {
        const q = generate("tarozi", level, rule, s * 7907)!;
        if (q.diagram.kind !== "scales") throw new Error();
        const sides = new Set(q.diagram.pans.flatMap((p) => [k(p.left), k(p.right)]));
        expect(sides.has(k(q.diagram.ask))).toBe(false);
      }
});
