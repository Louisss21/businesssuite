import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

export const dynamic = "force-dynamic";

/** Punkt 4: Arbeitsschritt inkl. Bauteile duplizieren. */
export async function POST(_req: NextRequest, { params }: { params: { stepId: string } }) {
  try {
    await requireUser();
    await tableModelService.duplicateStep(params.stepId);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
