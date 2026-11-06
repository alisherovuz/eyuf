import { currentExam, startExam } from "@/lib/store";
import { body, fail, json } from "../_util";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ exam: await currentExam() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await body(req);
    const kind = b.kind === "mini" ? "mini" : "full";
    return json({ exam: await startExam(kind) });
  } catch (e) {
    return fail(e);
  }
}
