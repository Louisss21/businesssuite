import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { generateInvoicePdf } from "@/modules/documents/pdf-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Headroom gegen Cold-Start-Timeouts (Hobby-Default sind nur 10s).
export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const pdf = await generateInvoicePdf(params.id, user.role);
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
