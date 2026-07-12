import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { executeConfirmed } from "@/modules/assistant/assistant.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  tool: z.string().min(1),
  args: z.record(z.unknown()),
});

/** Bestätigte riskante Assistent-Aktion ausführen (RBAC erneut serverseitig geprüft). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { tool, args } = schema.parse(await req.json());
    const result = await executeConfirmed(tool, args, { userId: user.id, role: user.role });
    return ok({ result });
  } catch (e) {
    return fail(e);
  }
}
