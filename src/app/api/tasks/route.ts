import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { taskService } from "@/modules/tasks/task.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    return ok(
      await taskService.list({
        status: sp.get("status") || undefined,
        priority: sp.get("priority") || undefined,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await taskService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
