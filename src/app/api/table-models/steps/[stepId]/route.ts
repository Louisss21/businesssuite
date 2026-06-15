import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

type Ctx = { params: { stepId: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await tableModelService.updateStep(params.stepId, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await tableModelService.deleteStep(params.stepId);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
