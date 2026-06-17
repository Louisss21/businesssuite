import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supplierService } from "@/modules/inventory/supplier.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    return ok(await supplierService.list());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await supplierService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
