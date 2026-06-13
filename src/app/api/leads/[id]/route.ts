import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { leadService } from "@/modules/crm/lead.service";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await leadService.getById(params.id));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await leadService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await leadService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await leadService.delete(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
