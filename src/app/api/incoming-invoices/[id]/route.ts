import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { incomingInvoiceService } from "@/modules/billing-archive/incoming-invoice.service";

type Ctx = { params: { id: string } };

const patchSchema = z.object({ status: z.enum(["OPEN", "PAID"]) });

/** A6.1: Status setzen (OPEN/PAID). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { status } = patchSchema.parse(await req.json());
    return ok(await incomingInvoiceService.setStatus(params.id, status));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await incomingInvoiceService.remove(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
