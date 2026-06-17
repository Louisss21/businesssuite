import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supplierService } from "@/modules/inventory/supplier.service";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await supplierService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await supplierService.remove(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
