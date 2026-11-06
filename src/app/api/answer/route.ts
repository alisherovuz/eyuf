import { getQuestion } from "@/lib/questions";
import { reviewKeyFor } from "@/lib/select";
import { recordAnswer } from "@/lib/store";
import { q } from "@/lib/db";
import { body, fail, json } from "../_util";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await body(req);
    const question = typeof b.questionId === "string" ? getQuestion(b.questionId) : null;
    if (!question) return json({ error: "Savol topilmadi." }, 400);
    const chosen = Number(b.chosen);
    if (!Number.isInteger(chosen) || chosen < 0 || chosen >= question.options.length) return json({ error: "Javob noto‘g‘ri yuborildi." }, 400);
    const reviewKey = typeof b.reviewKey === "string" && b.reviewKey === reviewKeyFor(question) ? b.reviewKey : null;
    const done = await q<{ correct: boolean }>("SELECT correct FROM attempts WHERE question_id = $1 AND mode = 'practice' LIMIT 1", [question.id]);
    if (done.length && question.source === "generator") {
      return json({ correct: done[0].correct, answer: question.answer, explanation: question.explanation, repeated: true });
    }
    const r = await recordAnswer({ question, chosen, timeMs: Number(b.timeMs) || 0, mode: "practice", reviewKey });
    return json(r);
  } catch (e) {
    return fail(e);
  }
}
