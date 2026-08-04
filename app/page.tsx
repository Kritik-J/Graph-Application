import { Suspense } from "react";
import { ExplorerClient } from "@/components/ExplorerClient";
import { DbDownState, Skeleton } from "@/components/ui";
import { DbUnreachableError } from "@/lib/errors";
import { listProducts, type ProductSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ExplorerPage() {
  let products: ProductSummary[];
  try {
    products = await listProducts();
  } catch (err) {
    if (err instanceof DbUnreachableError) return <DbDownState />;
    throw err;
  }

  const totalUnits = products.reduce((sum, p) => sum + p.unitsPerYear, 0);

  return (
    // The ?arm= deep link is read with useSearchParams, which needs a boundary.
    <Suspense fallback={<ExplorerFallback />}>
      <ExplorerClient
        products={products}
        totalUnits={totalUnits}
        totalProducts={products.length}
      />
    </Suspense>
  );
}

function ExplorerFallback() {
  return (
    <div className="flex min-h-[calc(100vh-54px)] flex-col lg:flex-row">
      <div className="w-full shrink-0 space-y-3 border-b-2 border-divider p-4 lg:w-[302px] lg:border-r-2 lg:border-b-0">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="rp-grid flex-1" />
      <div className="w-full shrink-0 space-y-3 border-t-2 border-divider p-4 lg:w-[300px] lg:border-t-0 lg:border-l-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
