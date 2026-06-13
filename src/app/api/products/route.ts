import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productService } from "@/modules/products/product.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const active = sp.get("active");
    return ok(
      await productService.list({
        search: sp.get("search") || undefined,
        active: active === null ? undefined : active === "true",
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await productService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
