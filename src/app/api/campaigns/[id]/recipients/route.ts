import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { campaignService } from "@/modules/campaigns/campaign.service";

type Ctx = { params: { id: string } };

/** POST mit ?preview=1 -> nur Anzahl; sonst Empfänger anhand Filter hinzufügen. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const body = await req.json();
    if (req.nextUrl.searchParams.get("preview")) {
      return ok({ count: await campaignService.previewCount(body) });
    }
    return ok(await campaignService.addRecipients(params.id, body), 201);
  } catch (e) {
    return fail(e);
  }
}
