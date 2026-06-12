import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { leadService } from "@/modules/crm/lead.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    return ok(await leadService.list({ status: req.nextUrl.searchParams.get("status") || undefined }));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await leadService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
