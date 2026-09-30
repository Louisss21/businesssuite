import { OAuth2Client } from "google-auth-library";

/**
 * Google-SSO (Workspace-Login): beschränkt den Zugang zur BusinessSuite auf
 * Mitglieder der eigenen Google-Workspace-Organisation.
 *
 * Zwei Schutzebenen, bewusst redundant:
 *  1. Im Google-Cloud-Projekt wird der OAuth-Consent-Screen als "Intern"
 *     eingestellt – dann lässt Google selbst nur Konten der eigenen
 *     Workspace-Domain überhaupt den Login-Vorgang abschließen.
 *  2. Serverseitig wird zusätzlich der "hd"-Claim (hosted domain) im
 *     verifizierten ID-Token gegen GOOGLE_WORKSPACE_DOMAIN geprüft – falls
 *     der Consent-Screen versehentlich falsch konfiguriert ist, greift diese
 *     Prüfung trotzdem.
 *
 * Es werden NIE neue Konten automatisch angelegt: Google bestätigt nur die
 * Identität, ein bereits existierendes aktives User-Konto mit derselben
 * E-Mail bleibt Voraussetzung (siehe /api/auth/google/callback).
 *
 * Env-Variablen:
 *   GOOGLE_CLIENT_ID       OAuth-Client-ID aus der Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   zugehöriges Secret
 *   GOOGLE_WORKSPACE_DOMAIN  eigene Firmendomäne, z. B. "sustable.eu"
 *   APP_BASE_URL           Basis-URL der App ohne Slash am Ende,
 *                          z. B. "https://businesssuite.vercel.app"
 */

export function googleSsoEnabled(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_WORKSPACE_DOMAIN &&
    process.env.APP_BASE_URL
  );
}

function requireConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN;
  const baseUrl = process.env.APP_BASE_URL;
  if (!clientId || !clientSecret || !domain || !baseUrl) {
    throw new Error("Google SSO ist nicht vollständig konfiguriert.");
  }
  return { clientId, clientSecret, domain, baseUrl };
}

export function redirectUri(): string {
  return `${requireConfig().baseUrl}/api/auth/google/callback`;
}

export function workspaceDomain(): string {
  return requireConfig().domain.toLowerCase();
}

/** Baut die Google-OAuth-Consent-URL; `state` dient als CSRF-Schutz. */
export function buildGoogleAuthUrl(state: string): string {
  const { clientId, domain } = requireConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Vorauswahl/Hinweis für Google – ersetzt NICHT die serverseitige
    // hd-Prüfung nach dem Rücksprung (siehe verifyGoogleIdToken-Aufrufer).
    hd: domain,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  hostedDomain: string | null;
  name: string | null;
}

/**
 * Tauscht den Autorisierungscode gegen Tokens und verifiziert das ID-Token
 * (Signatur, Aussteller, Zielgruppe, Ablauf) über die offizielle
 * Google-Bibliothek. Wirft bei jedem Problem – Aufrufer fängt das ab.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleIdentity> {
  const { clientId, clientSecret } = requireConfig();
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri: redirectUri() });

  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new Error("Kein ID-Token von Google erhalten.");

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Google-Antwort enthält keine E-Mail-Adresse.");

  return {
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    hostedDomain: payload.hd ?? null,
    name: payload.name ?? null,
  };
}
