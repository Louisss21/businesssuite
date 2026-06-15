import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { activityService } from "@/modules/activities/activity.service";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    await activityService.delete(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
