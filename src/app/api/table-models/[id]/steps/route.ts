import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { tableModelService } from "@/modules/production/tablemodel.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    return ok(await tableModelService.addStep(params.id, await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
