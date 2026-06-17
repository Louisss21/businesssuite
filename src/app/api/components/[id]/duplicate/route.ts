import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

export const dynamic = "force-dynamic";

/** Punkt 2: Bauteil duplizieren -> neue ID (für Sprung in die Bearbeitung). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const copy = await componentService.duplicate(params.id);
    return ok({ id: copy.id });
  } catch (e) {
    return fail(e);
  }
}
