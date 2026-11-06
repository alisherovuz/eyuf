import { describe, expect, it } from "vitest";
import { composeExam, nextLevel, nextReviewState, pickPractice, type AttemptLite, FAMILY_CAP_PER_20 } from "@/lib/select";
import { getQuestion, IMAGE_ITEMS } from "@/lib/questions";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 8, 10);

function simulate(n: number, correctFn: (family: string) => boolean) {
  const history: AttemptLite[] = [];
  for (let i = 0; i < n; i++) {
    const p = pickPractice({ history, dueReviews: [], blocked: new Set(), now: NOW + i * 60_000, seed: 1000 + i });
    expect(p).not.toBeNull();
    const q = p!.question;
    history.unshift({ questionId: q.id, family: q.family, rule: q.rule, level: q.level, fingerprint: q.fingerprint, correct: correctFn(q.family), at: NOW + i * 60_000 });
  }
  return history;
}

describe("practice selection", () => {
  it("never repeats a question and never shows the same family three times in a row", () => {
    const h = simulate(200, () => true);
    expect(new Set(h.map((a) => a.fingerprint)).size).toBe(h.length);
    for (let i = 2; i < h.length; i++) expect(h[i].family === h[i - 1].family && h[i].family === h[i - 2].family).toBe(false);
  });

  it(`caps any family at ${FAMILY_CAP_PER_20} in any 20 questions`, () => {
    const h = simulate(150, (f) => f !== "kub");
    for (let i = 0; i + 20 <= h.length; i++) {
      const win = h.slice(i, i + 20);
      for (const f of new Set(win.map((a) => a.family))) expect(win.filter((a) => a.family === f).length).toBeLessThanOrEqual(FAMILY_CAP_PER_20);
    }
  });

  it("serves weak families more often", () => {
    const h = simulate(200, (f) => f !== "kub");
    const count = (f: string) => h.filter((a) => a.family === f).length;
    expect(count("kub")).toBeGreaterThan(count("tarozi"));
  });

  it("uses each EYUF and book item once outside of review", () => {
    const h = simulate(250, () => true);
    for (const f of ["eyuf", "kitob"]) {
      const ids = h.filter((a) => a.family === f).map((a) => a.questionId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("brings a due mistake back as a new variant of the same rule", () => {
    const q = getQuestion("g:tarozi:2:mixed3:4242")!;
    const history: AttemptLite[] = [{ questionId: q.id, family: q.family, rule: q.rule, level: q.level, fingerprint: q.fingerprint, correct: false, at: NOW - DAY }];
    const p = pickPractice({ history, blocked: new Set(), now: NOW, seed: 9, dueReviews: [{ key: "tarozi:mixed3", family: "tarozi", rule: "mixed3", level: 2, questionId: q.id, dueAt: NOW - 1000, step: 0 }] });
    expect(p!.reviewKey).toBe("tarozi:mixed3");
    expect(p!.question.rule).toBe("mixed3");
    expect(p!.question.fingerprint).not.toBe(q.fingerprint);
  });
});

describe("difficulty", () => {
  const mk = (correct: boolean, level: number): AttemptLite => ({ questionId: "x", family: "amal", rule: "r", level, fingerprint: Math.random().toString(), correct, at: 0 });
  it("starts at 2, goes up after a strong run and down after a weak one", () => {
    expect(nextLevel([], "amal")).toBe(2);
    expect(nextLevel([mk(true, 2), mk(true, 2), mk(true, 2), mk(true, 2)], "amal")).toBe(3);
    expect(nextLevel([mk(false, 2), mk(false, 2), mk(true, 2)], "amal")).toBe(1);
  });
});

describe("spaced review", () => {
  it("schedules 1 → 3 → 7 days and retires after three correct reviews", () => {
    const s0 = nextReviewState(null, false, false, NOW)!;
    expect(s0).toEqual({ step: 0, dueAt: NOW + DAY, resolved: false });
    const s1 = nextReviewState(s0, true, true, NOW)!;
    expect(s1.dueAt).toBe(NOW + 3 * DAY);
    const s2 = nextReviewState(s1, true, true, NOW)!;
    expect(s2.dueAt).toBe(NOW + 7 * DAY);
    expect(nextReviewState(s2, true, true, NOW)!.resolved).toBe(true);
    expect(nextReviewState(s2, false, true, NOW)).toEqual({ step: 0, dueAt: NOW + DAY, resolved: false });
    expect(nextReviewState(null, true, false, NOW)).toBeNull();
  });
});

describe("exam", () => {
  it("builds 30 distinct questions with 6 EYUF and up to 4 book items", () => {
    const qs = composeExam("full", [], new Set(), 5);
    expect(qs).toHaveLength(30);
    expect(new Set(qs.map((q) => q.fingerprint)).size).toBe(30);
    expect(qs.filter((q) => q.source === "eyuf")).toHaveLength(6);
    expect(qs.filter((q) => q.source === "book").length).toBe(Math.min(4, IMAGE_ITEMS.kitob.length));
    expect(qs.filter((q) => q.source === "generator").every((q) => q.level >= 2)).toBe(true);
  });
});
