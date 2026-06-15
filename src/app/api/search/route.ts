import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { globalSearch } from "@/modules/search/search.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const q = req.nextUrl.searchParams.get("q") ?? "";
    return ok(await globalSearch(q));
  } catch (e) {
    return fail(e);
  }
}
