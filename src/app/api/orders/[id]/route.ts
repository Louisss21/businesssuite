import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { orderService } from "@/modules/orders/order.service";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await orderService.getById(params.id));
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await orderService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

// A5.1: vollständiges Speichern (Felder + Positionen) via PUT
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await orderService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await orderService.delete(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
