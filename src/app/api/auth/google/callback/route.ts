import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { exchangeGoogleCode, googleSsoEnabled, workspaceDomain } from "@/lib/google-oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "bs_google_state";

function loginError(req: NextRequest, code: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${code}`;
  return NextResponse.redirect(url);
}

/**
 * Rücksprung von Google. Prüft CSRF-State, tauscht den Code, verifiziert die
 * Identität (Domain + bereits vorhandenes, aktives Konto) und setzt bei
 * Erfolg exakt dieselbe Session wie der Passwort-Login – die komplette
 * Rechteprüfung (Middleware/RBAC) läuft danach unverändert weiter.
 */
export async function GET(req: NextRequest) {
  if (!googleSsoEnabled()) return loginError(req, "google_disabled");

  const expectedState = cookies().get(STATE_COOKIE)?.value;
  cookies().delete(STATE_COOKIE);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || !expectedState || state !== expectedState) {
    return loginError(req, "google_state");
  }

  let identity;
  try {
    identity = await exchangeGoogleCode(code);
  } catch (err) {
    // Temporär geloggt, um die Ursache des Token-Austauschs in den Vercel-
    // Logs sichtbar zu machen (kein Secret im Fehlertext von google-auth-library).
    console.error("Google-Token-Austausch fehlgeschlagen:", err);
    return loginError(req, "google_exchange");
  }

  if (!identity.emailVerified) return loginError(req, "google_unverified");

  const domain = workspaceDomain();
  const emailDomain = identity.email.split("@")[1]?.toLowerCase();
  // Zwei Prüfungen bewusst redundant zur "Intern"-Einstellung im Google-
  // Cloud-Projekt: hd-Claim UND E-Mail-Endung müssen zur Firmendomäne passen.
  if (identity.hostedDomain?.toLowerCase() !== domain || emailDomain !== domain) {
    return loginError(req, "google_domain");
  }

  // Kein Auto-Provisioning: Google bestätigt nur die Identität, das Konto
  // (samt Rolle) muss bereits von einem Admin angelegt worden sein.
  const user = await prisma.user.findFirst({
    where: { email: { equals: identity.email, mode: "insensitive" }, active: true },
  });
  if (!user) return loginError(req, "google_no_account");

  createSession(user.id, user.role);
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
