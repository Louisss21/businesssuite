import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { orderService } from "@/modules/orders/order.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    return ok(
      await orderService.list({
        status: sp.get("status") || undefined,
        customerId: sp.get("customerId") || undefined,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await orderService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
