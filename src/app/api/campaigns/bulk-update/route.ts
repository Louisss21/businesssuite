import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { campaignService } from "@/modules/campaigns/campaign.service";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  changes: z.object({ status: z.string().optional() }),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { ids, changes } = schema.parse(await req.json());
    return ok(await campaignService.bulkUpdate(ids, changes));
  } catch (e) {
    return fail(e);
  }
}
