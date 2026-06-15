import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { campaignService } from "@/modules/campaigns/campaign.service";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    return ok(await campaignService.markAllSent(params.id));
  } catch (e) {
    return fail(e);
  }
}
