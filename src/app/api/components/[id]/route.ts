import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await componentService.getById(params.id));
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await componentService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}
