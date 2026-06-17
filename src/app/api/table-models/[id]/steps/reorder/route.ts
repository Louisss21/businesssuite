import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

const schema = z.object({ orderedIds: z.array(z.string()).min(1) });

/** Punkt 4: Schritt-Reihenfolge neu setzen. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const { orderedIds } = schema.parse(await req.json());
    return ok(await tableModelService.reorderSteps(params.id, orderedIds));
  } catch (e) {
    return fail(e);
  }
}
