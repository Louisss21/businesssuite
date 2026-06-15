import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productionService } from "@/modules/production/production.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const { expectedStep } = z
      .object({ expectedStep: z.coerce.number().int().optional() })
      .parse(body ?? {});
    return ok(await productionService.completeStep(params.id, expectedStep));
  } catch (e) {
    return fail(e);
  }
}
