import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productionService } from "@/modules/production/production.service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    return ok(await productionService.getById(params.id));
  } catch (e) {
    return fail(e);
  }
}
