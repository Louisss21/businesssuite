import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { invoiceService } from "@/modules/invoices/invoice.service";

const num = (v: string | null) => (v ? Number(v) : undefined);

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    return ok(
      await invoiceService.list({
        status: sp.get("status") || undefined,
        customerId: sp.get("customerId") || undefined,
        year: num(sp.get("year")),
        month: num(sp.get("month")),
        quarter: num(sp.get("quarter")),
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

/** Erzeugt eine Rechnung aus einer Bestellung (Body: { orderId, issueDate?, dueDate? }). */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await invoiceService.createFromOrder(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
