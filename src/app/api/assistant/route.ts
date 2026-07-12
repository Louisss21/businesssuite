import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { chat } from "@/modules/assistant/assistant.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

/** System-Assistent: Chat-Nachricht verarbeiten (Werkzeuge RBAC-geprüft). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { messages } = schema.parse(await req.json());
    const result = await chat(messages, { userId: user.id, role: user.role });
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
