import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { campaignService } from "@/modules/campaigns/campaign.service";

export async function GET() {
  try {
    await requireUser();
    return ok(await campaignService.list());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await campaignService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
