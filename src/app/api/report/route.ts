import { getQuestion } from "@/lib/questions";
import { report } from "@/lib/store";
import { body, fail, json } from "../_util";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await body(req);
    if (typeof b.questionId !== "string" || !getQuestion(b.questionId)) return json({ error: "Savol topilmadi." }, 400);
    await report(b.questionId, typeof b.note === "string" ? b.note : "");
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
