import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { settingsService } from "@/modules/settings/settings.service";

export async function GET() {
  try {
    await requireUser();
    return ok(await settingsService.get());
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") return fail(new Error("Nur Admins"));
    return ok(await settingsService.update(await req.json()));
  } catch (e) {
    return fail(e);
  }
}
