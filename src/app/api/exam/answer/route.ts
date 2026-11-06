import { saveExamAnswer } from "@/lib/store";
import { body, fail, json } from "../../_util";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await body(req);
    const chosen = b.chosen === null ? null : Number(b.chosen);
    if (chosen !== null && !Number.isInteger(chosen)) return json({ error: "Javob noto‘g‘ri yuborildi." }, 400);
    const r = await saveExamAnswer(Number(b.examId), Number(b.index), chosen, Number(b.timeMs) || 0);
    return json(r, r.ok ? 200 : 409);
  } catch (e) {
    return fail(e);
  }
}
