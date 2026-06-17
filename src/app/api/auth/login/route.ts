import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { AppError, fail, ok } from "@/lib/http";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError("E-Mail oder Passwort falsch.", 401);
    }
    if (!user.active) {
      throw new AppError("Dieses Konto ist deaktiviert. Bitte an einen Administrator wenden.", 403);
    }
    createSession(user.id, user.role);
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return fail(e);
  }
}
