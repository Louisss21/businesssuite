import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { generateOrderPdf } from "@/modules/documents/pdf-render";
import type { OrderPdfType } from "@/modules/orders/order-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Headroom gegen Cold-Start-Timeouts (Hobby-Default sind nur 10s).
export const maxDuration = 60;

const VALID: OrderPdfType[] = ["confirmation", "deliverynote", "quote"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const q = req.nextUrl.searchParams.get("type") ?? "confirmation";
    const type: OrderPdfType = (VALID as string[]).includes(q) ? (q as OrderPdfType) : "confirmation";
    const pdf = await generateOrderPdf(params.id, type);
    return new Response(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.filename}"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
