import type { Level, Question } from "./types";
import { GEN_BY_FAMILY, generate } from "./gen";
import { FAMILIES, getQuestion, IMAGE_FAMILIES, IMAGE_ITEMS } from "./questions";
import { makeRng, type Rng } from "./rng";

export interface AttemptLite {
  questionId: string;
  family: string;
  rule: string;
  level: number;
  fingerprint: string;
  correct: boolean;
  at: number;
  reviewKey?: string | null;
}

export interface ReviewLite {
  key: string;
  family: string;
  rule: string;
  level: number;
  questionId: string;
  dueAt: number;
  step: number;
}

export interface Pick {
  question: Question;
  reviewKey: string | null;
}

const DAY = 86_400_000;
export const FAMILY_CAP_PER_20 = 5;
export const REVIEW_INTERVALS_DAYS = [1, 3, 7];

/** Newest first. */
type History = AttemptLite[];

export function familyAccuracy(h: History, family: string, window = 30) {
  const xs = h.filter((a) => a.family === family).slice(0, window);
  const correct = xs.filter((a) => a.correct).length;
  return { n: xs.length, correct, smoothed: (correct + 1) / (xs.length + 2) };
}

export function nextLevel(h: History, family: string): Level {
  const xs = h.filter((a) => a.family === family).slice(0, 5);
  if (!xs.length) return 2;
  const last = xs[0].level;
  const acc = xs.filter((a) => a.correct).length / xs.length;
  let lvl = last;
  if (xs.length >= 4 && acc >= 0.8) lvl = last + 1;
  else if (xs.length >= 3 && acc < 0.5) lvl = last - 1;
  return Math.min(3, Math.max(1, lvl)) as Level;
}

export function unseenImages(h: History, blocked: Set<string>, family: string): string[] {
  const seen = new Set(h.map((a) => a.questionId));
  return (IMAGE_ITEMS[family] ?? []).map((i) => i.id).filter((id) => !seen.has(id) && !blocked.has(id));
}

export function pickFamily(rng: Rng, h: History, available: Set<string>, only?: string): string {
  if (only) return only;
  const last20 = h.slice(0, 20);
  const weights = FAMILIES.map((f) => {
    if (IMAGE_FAMILIES.includes(f) && !available.has(f)) return 0;
    if (last20.filter((a) => a.family === f).length >= FAMILY_CAP_PER_20) return 0;
    let w = 0.5 + 2 * (1 - familyAccuracy(h, f).smoothed);
    if (h[0]?.family === f) w *= 0.15;
    else if (h[1]?.family === f) w *= 0.5;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return rng.pick(FAMILIES.filter((f) => !IMAGE_FAMILIES.includes(f)));
  let x = rng.next() * total;
  for (let i = 0; i < FAMILIES.length; i++) {
    x -= weights[i];
    if (x < 0 && weights[i] > 0) return FAMILIES[i];
  }
  return FAMILIES[weights.findLastIndex((w) => w > 0)];
}

export function pickRule(rng: Rng, h: History, family: string, level: Level, now: number): string {
  const rules = GEN_BY_FAMILY[family].rules(level);
  const lastUse = (r: string) => h.find((a) => a.family === family && a.rule === r)?.at ?? -Infinity;
  const fresh = rules.filter((r) => now - lastUse(r) > 7 * DAY);
  if (fresh.length) return rng.pick(fresh);
  return rules.slice().sort((a, b) => lastUse(a) - lastUse(b))[0];
}

export function freshVariant(rng: Rng, h: History, family: string, level: Level, rule: string): Question | null {
  const seen = new Set(h.map((a) => a.fingerprint));
  let fallback: Question | null = null;
  for (let t = 0; t < 12; t++) {
    const q = generate(family, level, rule, rng.int(1, 2 ** 31 - 1));
    if (!q) continue;
    if (!seen.has(q.fingerprint)) return q;
    fallback ??= q;
  }
  return fallback;
}

export function pickPractice(opts: {
  history: History;
  dueReviews: ReviewLite[];
  blocked: Set<string>;
  now: number;
  seed: number;
  only?: string;
  reviewsOnly?: boolean;
}): Pick | null {
  const { history: h, blocked, now } = opts;
  const rng = makeRng(opts.seed);
  const due = opts.dueReviews
    .filter((r) => r.dueAt <= now && (!opts.only || r.family === opts.only))
    .sort((a, b) => a.dueAt - b.dueAt);
  const recentReviews = h.slice(0, 4).filter((a) => a.reviewKey).length;
  if (due.length && (opts.reviewsOnly || recentReviews < 2)) {
    const r = due[0];
    if (IMAGE_FAMILIES.includes(r.family)) {
      const q = getQuestion(r.questionId);
      if (q && !blocked.has(q.id)) return { question: q, reviewKey: r.key };
    } else {
      const q = freshVariant(rng, h, r.family, r.level as Level, r.rule);
      if (q) return { question: q, reviewKey: r.key };
    }
  }
  if (opts.reviewsOnly) return null;
  const unseen = Object.fromEntries(IMAGE_FAMILIES.map((f) => [f, unseenImages(h, blocked, f)]));
  const available = new Set(IMAGE_FAMILIES.filter((f) => unseen[f].length > 0));
  const family = pickFamily(rng, h, available, opts.only);
  if (IMAGE_FAMILIES.includes(family)) {
    if (!unseen[family].length) return null;
    return { question: getQuestion(rng.pick(unseen[family]))!, reviewKey: null };
  }
  const level = nextLevel(h, family);
  const rule = pickRule(rng, h, family, level, now);
  const q = freshVariant(rng, h, family, level, rule);
  return q ? { question: q, reviewKey: null } : null;
}

export function reviewKeyFor(q: Pick["question"]): string {
  return q.source === "generator" ? `${q.family}:${q.rule}` : q.id;
}

/** Spaced review: a wrong answer schedules the trick for tomorrow; correct answers on a review push it to 3 then 7 days, then retire it. */
export function nextReviewState(prev: { step: number } | null, correct: boolean, wasReview: boolean, now: number) {
  if (!correct) return { step: 0, dueAt: now + REVIEW_INTERVALS_DAYS[0] * DAY, resolved: false };
  if (!prev || !wasReview) return null;
  const step = prev.step + 1;
  if (step >= REVIEW_INTERVALS_DAYS.length) return { step, dueAt: now, resolved: true };
  return { step, dueAt: now + REVIEW_INTERVALS_DAYS[step] * DAY, resolved: false };
}

export const EXAM_KINDS = {
  full: { n: 30, durationS: 3600, images: { eyuf: 6, kitob: 4 } },
  mini: { n: 10, durationS: 1200, images: { eyuf: 2, kitob: 1 } },
} as const;
export type ExamKind = keyof typeof EXAM_KINDS;

export function composeExam(kind: ExamKind, h: History, blocked: Set<string>, seed: number): Question[] {
  const spec = EXAM_KINDS[kind];
  const rng = makeRng(seed);
  const seenCount = new Map<string, number>();
  for (const a of h) seenCount.set(a.questionId, (seenCount.get(a.questionId) ?? 0) + 1);
  const out: Question[] = [];
  for (const [family, count] of Object.entries(spec.images)) {
    const ids = rng
      .shuffle((IMAGE_ITEMS[family] ?? []).map((i) => i.id).filter((id) => !blocked.has(id)))
      .sort((a, b) => (seenCount.get(a) ?? 0) - (seenCount.get(b) ?? 0))
      .slice(0, count);
    out.push(...ids.map((id) => getQuestion(id)!));
  }
  const fams = FAMILIES.filter((f) => !IMAGE_FAMILIES.includes(f));
  const genCount = spec.n - out.length;
  const order = rng.shuffle(fams);
  let made = 0;
  for (let t = 0; made < genCount && t < genCount * 5; t++) {
    const family = order[made % order.length];
    const level: Level = rng.next() < 0.6 ? 3 : 2;
    const rules = GEN_BY_FAMILY[family].rules(level);
    const q = freshVariant(rng, h, family, level, rng.pick(rules));
    if (q && !out.some((o) => o.fingerprint === q.fingerprint)) { out.push(q); made++; }
  }
  return rng.shuffle(out);
}
