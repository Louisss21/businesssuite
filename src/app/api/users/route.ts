import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok } from "@/lib/http";
import { userService } from "@/modules/users/user.service";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MEMBER") {
    throw new AppError("Nur Administratoren dürfen Benutzer verwalten.", 403);
  }
  return user;
}

export async function GET() {
  try {
    await requireAdmin();
    return ok(await userService.list());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    return ok(await userService.invite(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
