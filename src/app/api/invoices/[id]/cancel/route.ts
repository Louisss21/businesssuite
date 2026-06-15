import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { invoiceService } from "@/modules/invoices/invoice.service";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    return ok(await invoiceService.cancel(params.id), 201);
  } catch (e) {
    return fail(e);
  }
}
