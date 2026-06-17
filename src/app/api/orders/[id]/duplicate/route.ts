import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { orderService } from "@/modules/orders/order.service";

export const dynamic = "force-dynamic";

/** Punkt 4: Bestellung duplizieren -> neue ID für Sprung in die Bearbeitung. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const copy = await orderService.duplicate(params.id);
    return ok({ id: copy.id });
  } catch (e) {
    return fail(e);
  }
}
