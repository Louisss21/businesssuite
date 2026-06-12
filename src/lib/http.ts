import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Einheitliche API-Antwortformate + zentrales Fehler-Mapping.
 * Hält die API-Routen schlank: nur Auth-Check, Parsen, Service-Aufruf.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (msg = "Nicht gefunden") => new AppError(msg, 404);
export const unauthorized = (msg = "Nicht autorisiert") => new AppError(msg, 401);

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validierungsfehler", issues: error.flatten() },
      { status: 422 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[API] Unerwarteter Fehler:", error);
  return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
}
