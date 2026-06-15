import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { activityService } from "@/modules/activities/activity.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    return ok(
      await activityService.list({
        customerId: sp.get("customerId") || undefined,
        leadId: sp.get("leadId") || undefined,
        type: sp.get("type") || undefined,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await activityService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
