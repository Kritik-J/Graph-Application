import { NextResponse } from "next/server";
import { handleDbErrors } from "@/lib/api-utils";
import { exposurePath } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const productId = params.get("productId");
  const targetId = params.get("targetId");

  if (!productId || !targetId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  return handleDbErrors(async () => ({ graph: await exposurePath(productId, targetId) }));
}
