import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { invoiceService } from "@/modules/invoices/invoice.service";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await invoiceService.getById(params.id));
  } catch (e) {
    return fail(e);
  }
}

/** Status/Fälligkeit ändern (Body: { status?, dueDate? }). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await invoiceService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await invoiceService.delete(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
