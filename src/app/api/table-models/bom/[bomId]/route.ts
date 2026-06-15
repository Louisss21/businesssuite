import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

export async function DELETE(_req: NextRequest, { params }: { params: { bomId: string } }) {
  try {
    await requireUser();
    await tableModelService.deleteBom(params.bomId);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
