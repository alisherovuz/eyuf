import { q } from "./db";
import type { Question } from "./types";
import { toPublic } from "./types";
import { FAMILIES, FAMILY_NAMES, getQuestion, ruleName } from "./questions";
import { composeExam, EXAM_KINDS, type AttemptLite, type ExamKind, nextReviewState, pickPractice, reviewKeyFor, type ReviewLite } from "./select";
import { randomSeed } from "./rng";

type Mode = "practice" | "exam";

export async function loadHistory(limit = 500): Promise<AttemptLite[]> {
  const rows = await q<{ question_id: string; family: string; rule: string; level: number; fingerprint: string; correct: boolean; created_at: Date; review_key: string | null }>(
    "SELECT question_id, family, rule, level, fingerprint, correct, created_at, review_key FROM attempts ORDER BY created_at DESC, id DESC LIMIT $1",
    [limit],
  );
  return rows.map((r) => ({ questionId: r.question_id, family: r.family, rule: r.rule, level: r.level, fingerprint: r.fingerprint, correct: r.correct, at: r.created_at.getTime(), reviewKey: r.review_key }));
}

export async function loadReviews(): Promise<(ReviewLite & { wrongCount: number })[]> {
  const rows = await q<{ key: string; family: string; rule: string; level: number; question_id: string; due_at: Date; step: number; wrong_count: number }>(
    "SELECT key, family, rule, level, question_id, due_at, step, wrong_count FROM reviews WHERE NOT resolved ORDER BY due_at",
  );
  return rows.map((r) => ({ key: r.key, family: r.family, rule: r.rule, level: r.level, questionId: r.question_id, dueAt: r.due_at.getTime(), step: r.step, wrongCount: r.wrong_count }));
}

export async function blockedIds(): Promise<Set<string>> {
  const rows = await q<{ question_id: string }>("SELECT DISTINCT question_id FROM reports");
  return new Set(rows.map((r) => r.question_id));
}

export async function nextPractice(only?: string, reviewsOnly = false) {
  const [history, dueReviews, blocked] = await Promise.all([loadHistory(), loadReviews(), blockedIds()]);
  const pick = pickPractice({ history, dueReviews, blocked, now: Date.now(), seed: randomSeed(), only: only && FAMILIES.includes(only) ? only : undefined, reviewsOnly });
  if (!pick) return null;
  return { question: toPublic(pick.question), reviewKey: pick.reviewKey, familyName: FAMILY_NAMES[pick.question.family] };
}

async function applyReview(question: Question, correct: boolean, reviewKey: string | null) {
  const key = reviewKey ?? reviewKeyFor(question);
  const prev = (await q<{ step: number }>("SELECT step FROM reviews WHERE key = $1 AND NOT resolved", [key]))[0] ?? null;
  const next = nextReviewState(prev, correct, reviewKey !== null, Date.now());
  if (!next) return null;
  await q(
    `INSERT INTO reviews (key, family, rule, level, question_id, step, due_at, resolved, wrong_count, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (key) DO UPDATE SET level = EXCLUDED.level, question_id = EXCLUDED.question_id, step = EXCLUDED.step,
       due_at = EXCLUDED.due_at, resolved = EXCLUDED.resolved, wrong_count = reviews.wrong_count + $9, updated_at = now()`,
    [key, question.family, question.rule, question.level, question.id, next.step, new Date(next.dueAt), next.resolved, correct ? 0 : 1],
  );
  return next;
}

export async function recordAnswer(opts: { question: Question; chosen: number | null; timeMs: number; mode: Mode; reviewKey: string | null; examId?: number }) {
  const { question, chosen, mode, reviewKey } = opts;
  const correct = chosen === question.answer;
  const timeMs = Math.max(0, Math.min(Math.round(opts.timeMs), 60 * 60 * 1000));
  await q(
    `INSERT INTO attempts (question_id, family, rule, level, fingerprint, source, mode, correct, chosen, time_ms, review_key, exam_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [question.id, question.family, question.rule, question.level, question.fingerprint, question.source, mode, correct, chosen, timeMs, reviewKey, opts.examId ?? null],
  );
  const review = await applyReview(question, correct, reviewKey);
  return { correct, answer: question.answer, explanation: question.explanation, review };
}

export async function report(questionId: string, note: string) {
  await q("INSERT INTO reports (question_id, note) VALUES ($1, $2)", [questionId, note.slice(0, 1000)]);
}

const EXAM_DATE = process.env.EXAM_DATE ?? "2026-11-18";
const DAILY_GOAL = Number(process.env.DAILY_GOAL ?? 25);
const TZ_OFFSET_MS = 5 * 3600_000; // Tashkent, UTC+5, no DST

function tashkentDay(ms: number) {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export async function stats() {
  const now = Date.now();
  const today = tashkentDay(now);
  const daysLeft = Math.max(0, Math.round((Date.parse(EXAM_DATE) - Date.parse(today)) / 86_400_000));
  const blocked = await blockedIds();
  const rows = await q<{ family: string; correct: boolean; time_ms: number; level: number; review_key: string | null; question_id: string; created_at: Date; mode: string }>(
    "SELECT family, correct, time_ms, level, review_key, question_id, created_at, mode FROM attempts ORDER BY created_at DESC LIMIT 2000",
  );
  const valid = rows.filter((r) => !blocked.has(r.question_id));
  const todayRows = valid.filter((r) => tashkentDay(r.created_at.getTime()) === today);
  const families = FAMILIES.map((f) => {
    const xs = valid.filter((r) => r.family === f);
    const recent = xs.slice(0, 30);
    const fresh = xs.filter((r) => !r.review_key);
    return {
      family: f,
      name: FAMILY_NAMES[f],
      attempts: xs.length,
      accuracy: recent.length ? recent.filter((r) => r.correct).length / recent.length : null,
      avgSec: recent.length ? Math.round(recent.reduce((s, r) => s + r.time_ms, 0) / recent.length / 1000) : null,
      freshAccuracy: fresh.length ? fresh.filter((r) => r.correct).length / fresh.length : null,
      level: xs[0]?.level ?? null,
    };
  });
  const reviews = await loadReviews();
  const dueNow = reviews.filter((r) => r.dueAt <= now).length;
  const exams = await q<{ id: number; kind: string; score: number | null; finished_at: Date | null; started_at: Date; question_ids: string[] }>(
    "SELECT id, kind, score, finished_at, started_at, question_ids FROM exams WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 5",
  );
  const examToday = exams.some((e) => e.finished_at && tashkentDay(e.finished_at.getTime()) === today);
  const fresh = valid.filter((r) => !r.review_key);
  return {
    today,
    examDate: EXAM_DATE,
    daysLeft,
    goal: DAILY_GOAL,
    doneToday: todayRows.length,
    correctToday: todayRows.filter((r) => r.correct).length,
    dueReviews: dueNow,
    openReviews: reviews.length,
    examToday,
    total: valid.length,
    freshAccuracy: fresh.length ? fresh.filter((r) => r.correct).length / fresh.length : null,
    families,
    exams: exams.map((e) => ({ id: e.id, kind: e.kind, score: e.score, n: e.question_ids.length, finishedAt: e.finished_at?.toISOString() })),
  };
}

export async function reviewList() {
  const reviews = await loadReviews();
  return reviews.map((r) => ({ ...r, name: FAMILY_NAMES[r.family], ruleName: ruleName(r.family, r.rule), due: r.dueAt <= Date.now() }));
}

/* ---------- exams ---------- */

const GRACE_S = 15;

interface ExamRow { id: number; kind: string; duration_s: number; question_ids: string[]; answers: Record<string, { chosen: number | null; timeMs: number }>; started_at: Date; finished_at: Date | null; score: number | null }

async function getExam(id: number) {
  return (await q<ExamRow>("SELECT * FROM exams WHERE id = $1", [id]))[0] ?? null;
}

function publicExam(e: ExamRow) {
  return {
    id: e.id,
    kind: e.kind,
    durationS: e.duration_s,
    startedAt: e.started_at.toISOString(),
    serverNow: new Date().toISOString(),
    answers: e.answers,
    questions: e.question_ids.map((id) => {
      const qq = getQuestion(id)!;
      return { ...toPublic(qq), familyName: FAMILY_NAMES[qq.family] };
    }),
  };
}

const expired = (e: ExamRow) => Date.now() > e.started_at.getTime() + (e.duration_s + GRACE_S) * 1000;

export async function currentExam() {
  const e = (await q<ExamRow>("SELECT * FROM exams WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1"))[0];
  if (!e) return null;
  if (expired(e)) {
    await finishExam(e.id);
    return null;
  }
  return publicExam(e);
}

export async function startExam(kind: ExamKind) {
  const open = await q<ExamRow>("SELECT * FROM exams WHERE finished_at IS NULL");
  for (const e of open) await finishExam(e.id);
  const [history, blocked] = await Promise.all([loadHistory(), blockedIds()]);
  const qs = composeExam(kind, history, blocked, randomSeed());
  const row = (await q<ExamRow>("INSERT INTO exams (kind, duration_s, question_ids) VALUES ($1, $2, $3) RETURNING *", [kind, EXAM_KINDS[kind].durationS, JSON.stringify(qs.map((x) => x.id))]))[0];
  return publicExam(row);
}

export async function saveExamAnswer(id: number, index: number, chosen: number | null, timeMs: number) {
  const e = await getExam(id);
  if (!e || e.finished_at || expired(e)) return { ok: false as const };
  if (!Number.isInteger(index) || index < 0 || index >= e.question_ids.length) return { ok: false as const };
  await q("UPDATE exams SET answers = jsonb_set(answers, $2, $3::jsonb, true) WHERE id = $1 AND finished_at IS NULL", [id, `{${index}}`, JSON.stringify({ chosen, timeMs: Math.max(0, Math.round(timeMs)) })]);
  return { ok: true as const };
}

export async function finishExam(id: number) {
  // Claiming finished_at first means only one caller records the attempts.
  const claimed = (await q<ExamRow>("UPDATE exams SET finished_at = now() WHERE id = $1 AND finished_at IS NULL RETURNING *", [id]))[0];
  if (claimed) {
    let score = 0;
    for (let i = 0; i < claimed.question_ids.length; i++) {
      const question = getQuestion(claimed.question_ids[i])!;
      const a = claimed.answers[String(i)];
      const r = await recordAnswer({ question, chosen: a?.chosen ?? null, timeMs: a?.timeMs ?? 0, mode: "exam", reviewKey: null, examId: claimed.id });
      if (r.correct) score++;
    }
    await q("UPDATE exams SET score = $2 WHERE id = $1", [id, score]);
  }
  return examResult(id);
}

export async function examResult(id: number) {
  const e = await getExam(id);
  if (!e || !e.finished_at) return null;
  const items = e.question_ids.map((qid, i) => {
    const qq = getQuestion(qid)!;
    const a = e.answers[String(i)];
    return { index: i, question: toPublic(qq), familyName: FAMILY_NAMES[qq.family], chosen: a?.chosen ?? null, answer: qq.answer, correct: a?.chosen === qq.answer, timeSec: Math.round((a?.timeMs ?? 0) / 1000), explanation: qq.explanation };
  });
  const byFamily = FAMILIES.map((f) => {
    const xs = items.filter((x) => x.question.family === f);
    return { family: f, name: FAMILY_NAMES[f], n: xs.length, correct: xs.filter((x) => x.correct).length, avgSec: xs.length ? Math.round(xs.reduce((s, x) => s + x.timeSec, 0) / xs.length) : 0 };
  }).filter((x) => x.n > 0);
  const usedS = Math.min(e.duration_s, Math.round((e.finished_at.getTime() - e.started_at.getTime()) / 1000));
  return { id: e.id, kind: e.kind, score: e.score ?? 0, n: items.length, durationS: e.duration_s, usedS, byFamily, items };
}
