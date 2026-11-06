import { examResult } from "@/lib/store";
import { fail, json } from "../../_util";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const r = await examResult(Number(id));
    return r ? json({ result: r }) : json({ error: "Natija topilmadi." }, 404);
  } catch (e) {
    return fail(e);
  }
}
