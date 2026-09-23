import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { accessFor, ALL_MODULES } from "@/lib/permissions";
import { apiTokenReadOnly } from "@/lib/api-token";

/**
 * Selbstauskunft: bestätigt einem externen System (z. B. einem Claude-Cowork-
 * Chat), dass sein API-Schlüssel gültig ist, und zeigt, mit welcher Rolle und
 * welchen Modulrechten es arbeitet. Liest keine Geschäftsdaten.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const modules = Object.fromEntries(
      ALL_MODULES.map((m) => [m, accessFor(user.role, m)]),
    );
    return ok({
      name: user.name,
      email: user.email,
      role: user.role,
      readOnly: apiTokenReadOnly(),
      modules,
    });
  } catch (e) {
    return fail(e);
  }
}
