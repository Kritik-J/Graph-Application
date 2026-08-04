import { NextResponse } from "next/server";
import { handleDbErrors, NOT_FOUND, type CanvasResponse } from "@/lib/api-utils";
import { productDetail, supplierRegions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "missing_product_id" }, { status: 400 });
  }

  return handleDbErrors(async (): Promise<CanvasResponse | typeof NOT_FOUND> => {
    const [detail, regions] = await Promise.all([
      productDetail(productId),
      supplierRegions(productId),
    ]);
    if (!detail) return NOT_FOUND;

    // One region per supplier is enough for a tag; the query returns them
    // in risk-agnostic order, so keep the first and drop duplicates.
    const bySupplier: CanvasResponse["regions"] = {};
    for (const r of regions) {
      if (!bySupplier[r.supplierId]) {
        bySupplier[r.supplierId] = {
          regionId: r.regionId,
          regionName: r.regionName,
          riskLevel: r.riskLevel,
        };
      }
    }

    return {
      product: {
        id: detail.id,
        name: detail.name,
        category: detail.category,
        unitsPerYear: detail.unitsPerYear,
      },
      graph: detail.graph,
      regions: bySupplier,
    };
  });
}
