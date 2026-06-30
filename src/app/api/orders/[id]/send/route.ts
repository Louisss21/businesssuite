import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { sendDocument } from "@/modules/documents/send.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  to: z.string().email("Gültige E-Mail erforderlich"),
  type: z.enum(["confirmation", "deliverynote", "quote"]).default("confirmation"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { to, type } = schema.parse(await req.json());
    return ok(await sendDocument({ kind: "order", id: params.id, to, type, role: user.role }));
  } catch (e) {
    return fail(e);
  }
}
