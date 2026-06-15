import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { leadService } from "@/modules/crm/lead.service";

const schema = z.object({
  leads: z.array(z.record(z.string())).max(5000),
  mode: z.enum(["skip", "update"]).default("skip"),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { leads, mode, dryRun } = schema.parse(await req.json());
    return ok(await leadService.bulkImport(leads, mode, dryRun));
  } catch (e) {
    return fail(e);
  }
}
