import { finishExam } from "@/lib/store";
import { body, fail, json } from "../../_util";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await body(req);
    const r = await finishExam(Number(b.examId));
    return r ? json({ result: r }) : json({ error: "Imtihon topilmadi." }, 404);
  } catch (e) {
    return fail(e);
  }
}
