import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

const schema = z.object({ ids: z.array(z.string()).min(1) });

/** Punkt 2.5: mehrere Bauteile löschen (in Stückliste referenzierte werden übersprungen). */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { ids } = schema.parse(await req.json());
    return ok(await componentService.bulkDelete(ids));
  } catch (e) {
    return fail(e);
  }
}
