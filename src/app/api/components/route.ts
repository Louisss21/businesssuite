import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    return ok(
      await componentService.list({
        underMin: sp.get("underMin") === "true",
        search: sp.get("search") || undefined,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await componentService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
