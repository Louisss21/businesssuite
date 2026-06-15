import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok } from "@/lib/http";
import { userService } from "@/modules/users/user.service";

type Ctx = { params: { id: string } };

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MEMBER") {
    throw new AppError("Nur Administratoren dürfen Benutzer verwalten.", 403);
  }
  return user;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    return ok(await userService.update(params.id, await req.json(), admin.id));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    return ok(await userService.delete(params.id, admin.id));
  } catch (e) {
    return fail(e);
  }
}
