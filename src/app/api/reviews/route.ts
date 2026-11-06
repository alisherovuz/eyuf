import { reviewList } from "@/lib/store";
import { fail, json } from "../_util";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ reviews: await reviewList() });
  } catch (e) {
    return fail(e);
  }
}
