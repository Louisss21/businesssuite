import { destroySession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  destroySession();
  return ok({ success: true });
}
