import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

type Ctx = { params: { bomId: string } };

// Punkt 1.1: Menge einer Stücklisten-Position ändern.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { quantity } = z.object({ quantity: z.coerce.number().int().min(1) }).parse(await req.json());
    return ok(await tableModelService.updateBom(params.bomId, quantity));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await tableModelService.deleteBom(params.bomId);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
