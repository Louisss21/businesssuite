import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok } from "@/lib/http";
import { settingsService } from "@/modules/settings/settings.service";

const schema = z.object({ footers: z.record(z.string()) });

/** Abteilungs-/Rollen-spezifische PDF-Fußzeilen speichern (nur Admin). */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new AppError("Nur Admins", 403);
    const { footers } = schema.parse(await req.json());
    const s = await settingsService.setRoleFooters(footers);
    return ok({ roleFooters: s.roleFooters });
  } catch (e) {
    return fail(e);
  }
}
