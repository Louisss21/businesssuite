import { cookies, headers } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { unauthorized } from "./http";
import {
  apiAccessEnabled,
  apiTokenFromHeaders,
  apiTokenRole,
  isValidApiToken,
} from "./api-token";

/**
 * Bewusst minimale, aber produktionsnah strukturierte Auth:
 *  - Passwort-Hash via bcrypt
 *  - Signiertes, HttpOnly Session-Cookie (userId + HMAC)
 *  - getCurrentUser() / requireUser() als zentrale Zugriffe
 *
 * Später leicht austauschbar gegen NextAuth/Lucia/JWT, ohne Aufruferänderung.
 */

const COOKIE = "bs_session";
const SECRET = process.env.AUTH_SECRET ?? "dev-insecure-secret";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 Tage

export type Role =
  | "ADMIN"
  | "SALES"
  | "MARKETING"
  | "WAREHOUSE"
  | "ACCOUNTING"
  | "MEMBER";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${mac}`;
}

function unsign(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const value = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  // timing-safe compare
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export function createSession(userId: string, role: Role) {
  // Rolle wird mitsigniert, damit die (Edge-)Middleware sie ohne DB-Zugriff
  // auswerten kann. Maßgeblich für Datenzugriffe bleibt die frische DB-Rolle
  // aus getCurrentUser() (Node) – die Middleware ist nur die Vorab-Schranke.
  cookies().set(COOKIE, sign(`${userId}|${role}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

const ALL_ROLES: Role[] = ["ADMIN", "SALES", "MARKETING", "WAREHOUSE", "ACCOUNTING", "MEMBER"];

/**
 * Identität für Zugriffe per API-Schlüssel (externe Systeme, siehe
 * lib/api-token.ts). Die Rolle kommt aus BS_API_ROLE – derselben Quelle, die
 * auch die Middleware prüft, damit beide Schranken nicht auseinanderlaufen.
 * Das Konto dient der Nachvollziehbarkeit (wer hat was geändert):
 * BS_API_USER_EMAIL, sonst der erste aktive Admin.
 */
async function apiTokenUser(): Promise<SessionUser | null> {
  if (!apiAccessEnabled()) return null;

  let provided: string | null = null;
  try {
    provided = apiTokenFromHeaders(headers());
  } catch {
    return null; // ausserhalb eines Requests (z. B. beim Build) nicht verfügbar
  }
  if (!isValidApiToken(provided)) return null;

  const select = { id: true, email: true, name: true, active: true } as const;
  const email = process.env.BS_API_USER_EMAIL?.trim();
  const account = email
    ? await prisma.user.findUnique({ where: { email }, select })
    : await prisma.user.findFirst({
        where: { active: true, role: "ADMIN" },
        orderBy: { createdAt: "asc" },
        select,
      });
  if (!account || !account.active) return null;

  const configured = apiTokenRole() as Role;
  const role: Role = ALL_ROLES.includes(configured) ? configured : "ADMIN";
  return { id: account.id, email: account.email, name: account.name, role };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return apiTokenUser();
  const value = unsign(token);
  if (!value) return null;
  // value = "userId" (Legacy) oder "userId|ROLE"
  const userId = value.split("|")[0];
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  // Inaktive Nutzer erhalten keine gültige Session (serverseitig erzwungen).
  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** In Services/API: wirft 401, wenn kein eingeloggter User vorhanden ist. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
