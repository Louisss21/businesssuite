import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleSsoEnabled } from "@/lib/google-oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "bs_google_state";

/** Leitet zum Google-Login weiter; merkt sich ein CSRF-Zufallstoken im Cookie. */
export async function GET() {
  if (!googleSsoEnabled()) {
    return NextResponse.json({ error: "Google SSO ist nicht konfiguriert." }, { status: 503 });
  }
  const state = crypto.randomBytes(24).toString("hex");
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300, // 5 Minuten reichen für den Consent-Vorgang
  });
  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
