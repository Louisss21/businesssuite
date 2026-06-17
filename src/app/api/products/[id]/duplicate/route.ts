import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productService } from "@/modules/products/product.service";

export const dynamic = "force-dynamic";

/** Punkt 1: Produkt duplizieren -> liefert die neue ID (für Sprung in die Bearbeitung). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const copy = await productService.duplicate(params.id);
    return ok({ id: copy.id });
  } catch (e) {
    return fail(e);
  }
}
