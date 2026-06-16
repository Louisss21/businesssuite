import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok } from "@/lib/http";
import { settingsService } from "@/modules/settings/settings.service";

export const runtime = "nodejs";

const ALLOWED = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** A3: Logo hochladen (PNG/JPG/SVG, max. 2 MB) → Vercel Blob, URL speichern. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new AppError("Nur Admins", 403);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Keine Datei übermittelt");
    if (!ALLOWED.includes(file.type)) {
      throw new AppError("Nur PNG, JPG oder SVG erlaubt");
    }
    if (file.size > MAX_BYTES) throw new AppError("Datei zu groß (max. 2 MB)");

    const ext = file.type === "image/png" ? "png" : file.type === "image/svg+xml" ? "svg" : "jpg";
    const blob = await put(`company-logo-${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });

    const settings = await settingsService.setLogo(blob.url);
    return ok({ logoUrl: settings.logoUrl });
  } catch (e) {
    return fail(e);
  }
}

/** A3: Logo entfernen. */
export async function DELETE() {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new AppError("Nur Admins", 403);
    await settingsService.setLogo("");
    return ok({ logoUrl: "" });
  } catch (e) {
    return fail(e);
  }
}
