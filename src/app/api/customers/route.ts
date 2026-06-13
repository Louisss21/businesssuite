import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { customerService } from "@/modules/crm/customer.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const data = await customerService.list({
      type: (sp.get("type") as never) || undefined,
      search: sp.get("search") || undefined,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const data = await customerService.create(await req.json());
    return ok(data, 201);
  } catch (e) {
    return fail(e);
  }
}
