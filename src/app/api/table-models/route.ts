import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

export async function GET() {
  try {
    await requireUser();
    return ok(await tableModelService.list());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await tableModelService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
