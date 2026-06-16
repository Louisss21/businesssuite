import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productService } from "@/modules/products/product.service";

const schema = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { ids } = schema.parse(await req.json());
    return ok(await productService.bulkDelete(ids));
  } catch (e) {
    return fail(e);
  }
}
