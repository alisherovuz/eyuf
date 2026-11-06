import { stats } from "@/lib/store";
import { fail, json } from "../_util";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await stats());
  } catch (e) {
    return fail(e);
  }
}
