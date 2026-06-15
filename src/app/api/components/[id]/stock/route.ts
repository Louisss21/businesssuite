import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

/** Manueller Wareneingang / Bestandskorrektur (Body: { delta, reason }). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    return ok(await componentService.adjustStock(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}
