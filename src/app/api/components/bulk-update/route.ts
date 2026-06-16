import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  changes: z.object({ minStock: z.union([z.string(), z.number()]).optional() }),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { ids, changes } = schema.parse(await req.json());
    return ok(await componentService.bulkUpdate(ids, changes));
  } catch (e) {
    return fail(e);
  }
}
