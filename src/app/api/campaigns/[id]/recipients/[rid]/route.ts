import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { campaignService } from "@/modules/campaigns/campaign.service";

type Ctx = { params: { id: string; rid: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await campaignService.recordResponse(params.rid, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await campaignService.removeRecipient(params.rid);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
