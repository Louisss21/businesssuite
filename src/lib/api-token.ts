/**
 * API-Schlüssel-Zugang für externe Systeme (z. B. ein Claude-Cowork-Chat,
 * Zapier, eigene Skripte). Ergänzt – ersetzt nicht – die Cookie-Session:
 *
 *   Authorization: Bearer <BS_API_TOKEN>      (empfohlen)
 *   x-api-key: <BS_API_TOKEN>                 (Alternative)
 *   ?api_key=<BS_API_TOKEN>                   (Notlösung, siehe unten)
 *
 * Env-Variablen:
 *   BS_API_TOKEN           Schlüssel; nicht gesetzt oder < 24 Zeichen = Zugang AUS
 *   BS_API_ROLE            Rolle, mit der der Zugang arbeitet (Standard: ADMIN)
 *   BS_API_READONLY        "true" = nur lesende Zugriffe (GET/HEAD) erlaubt
 *   BS_API_USER_EMAIL      Konto, dem Änderungen zugeschrieben werden
 *                          (Standard: erster aktiver Admin)
 *   BS_API_ALLOW_QUERY_TOKEN  "true" = Schlüssel zusätzlich als URL-Parameter
 *                          (?api_key=... oder ?token=...) erlauben. Nur für
 *                          Werkzeuge nötig, die keine eigenen Kopfzeilen
 *                          setzen können. SICHERHEITSHINWEIS: URLs landen in
 *                          Server-Logs, Proxys und Browser-Verläufen – ein so
 *                          übergebener Schlüssel ist deshalb IMMER nur lesend,
 *                          unabhängig von BS_API_READONLY (siehe Middleware).
 *                          Standard: aus.
 *
 * Läuft auch im Edge-Runtime der Middleware: kein node:crypto, kein DB-Zugriff.
 */

const MIN_TOKEN_LENGTH = 24;

/** Zeitkonstanter Vergleich – verhindert das Erraten über Antwortzeiten. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Schlüssel aus den Kopfzeilen lesen (Bearer oder x-api-key). */
export function apiTokenFromHeaders(h: { get(name: string): string | null }): string | null {
  const auth = h.get("authorization");
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m) return m[1].trim();
  }
  return h.get("x-api-key")?.trim() || null;
}

/**
 * Schlüssel als URL-Parameter lesen (?api_key=... oder ?token=...). Nur
 * aufrufen, wenn queryTokenAllowed() zuvor geprüft wurde – der Aufrufer muss
 * anschließend zusätzlich erzwingen, dass ein so gefundener Schlüssel nie
 * schreibende Zugriffe erhält (siehe Modul-Kommentar oben).
 */
export function apiTokenFromQuery(search: URLSearchParams): string | null {
  return search.get("api_key")?.trim() || search.get("token")?.trim() || null;
}

/** Ist die URL-Parameter-Variante überhaupt zugelassen? Standard: aus. */
export function queryTokenAllowed(): boolean {
  return process.env.BS_API_ALLOW_QUERY_TOKEN?.trim().toLowerCase() === "true";
}

/** Ist der API-Zugang überhaupt eingeschaltet (gültiger Schlüssel hinterlegt)? */
export function apiAccessEnabled(): boolean {
  const expected = process.env.BS_API_TOKEN;
  return !!expected && expected.length >= MIN_TOKEN_LENGTH;
}

/** Prüft einen mitgeschickten Schlüssel gegen BS_API_TOKEN. */
export function isValidApiToken(token: string | null): boolean {
  const expected = process.env.BS_API_TOKEN;
  if (!token || !expected || expected.length < MIN_TOKEN_LENGTH) return false;
  return safeEqual(token, expected);
}

/** Rolle, mit der ein Schlüssel-Zugriff arbeitet. */
export function apiTokenRole(): string {
  return process.env.BS_API_ROLE?.trim().toUpperCase() || "ADMIN";
}

/** Nur-Lese-Modus aktiv? */
export function apiTokenReadOnly(): boolean {
  return process.env.BS_API_READONLY?.trim().toLowerCase() === "true";
}

/** Schreibende HTTP-Methoden (im Nur-Lese-Modus blockiert). */
export function isWriteMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}
