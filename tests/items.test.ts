import { existsSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { getQuestion, IMAGE_ITEMS } from "@/lib/questions";

it("every image item has its picture, unique id and an answer among its printed options", () => {
  const ids = new Set<string>();
  for (const [family, items] of Object.entries(IMAGE_ITEMS)) {
    for (const it of items) {
      expect(ids.has(it.id), it.id).toBe(false);
      ids.add(it.id);
      expect(it.id.startsWith(family === "eyuf" ? "eyuf-" : "kitob-"), it.id).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", it.file)), it.file).toBe(true);
      expect(it.optionLetters).toContain(it.answer);
      expect(new Set(it.optionLetters).size).toBe(it.optionLetters.length);
      expect(it.explanation.trim().length).toBeGreaterThan(10);
      const q = getQuestion(it.id)!;
      expect(q.family).toBe(family);
      expect(q.options[q.answer].text).toBe(it.answer);
    }
  }
});
