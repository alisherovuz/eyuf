import { nextPractice } from "@/lib/store";
import { fail, json } from "../_util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const r = await nextPractice(url.searchParams.get("family") ?? undefined, url.searchParams.get("review") === "1");
    return json(r ?? { question: null });
  } catch (e) {
    return fail(e);
  }
}
