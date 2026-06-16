import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productService } from "@/modules/products/product.service";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  changes: z.object({ active: z.string().optional(), categoryId: z.string().optional() }),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { ids, changes } = schema.parse(await req.json());
    return ok(await productService.bulkUpdate(ids, changes));
  } catch (e) {
    return fail(e);
  }
}
