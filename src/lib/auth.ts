import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { unauthorized } from "./http";

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

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
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

export function createSession(userId: string) {
  cookies().set(COOKIE, sign(userId), {
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

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const userId = unsign(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
}

/** In Services/API: wirft 401, wenn kein eingeloggter User vorhanden ist. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
