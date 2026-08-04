"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RippleCanvas, type ArmTarget, type CanvasSummary } from "@/components/RippleCanvas";
import { DbBanner } from "@/components/ui";
import type { ProductSummary } from "@/lib/queries";
import { BlastRadiusPanel } from "./explorer/BlastRadiusPanel";
import { ProductSection } from "./explorer/ProductSection";
import { ReadingPanel } from "./explorer/ReadingPanel";
import { SimulateSection } from "./explorer/SimulateSection";
import { SpofSection } from "./explorer/SpofSection";
import { parseArm, type EventType } from "./explorer/types";
import { useExplorerData } from "./explorer/useExplorerData";
import { useSimulation } from "./explorer/useSimulation";

/**
 * The explorer screen: orchestrates product selection, the layered canvas,
 * arming, and the simulation lifecycle. All markup lives in the rail
 * sections and panels under components/explorer/.
 */
export function ExplorerClient({
  products,
  totalUnits,
  totalProducts,
}: {
  products: ProductSummary[];
  totalUnits: number;
  totalProducts: number;
}) {
  const searchParams = useSearchParams();
  const deepLink = useMemo(() => parseArm(searchParams.get("arm")), [searchParams]);
  const deepLinkDone = useRef(false);

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [armed, setArmed] = useState<ArmTarget | null>(deepLink);
  const [eventType, setEventType] = useState<EventType>("Fire");
  const [summary, setSummary] = useState<CanvasSummary | null>(null);
  const [dbDown, setDbDown] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const onDbDown = useCallback(() => setDbDown(true), []);
  const onArmedNameResolved = useCallback(
    (id: string, name: string) => setArmed((a) => (a && a.id === id ? { ...a, name } : a)),
    []
  );

  const { spof, pairs, slowest } = useExplorerData(reloadToken, onDbDown);
  const {
    sim,
    simTarget,
    simRunning,
    impactedIds,
    unitsAtRisk,
    runSimulation,
    clearSimulation,
  } = useSimulation({
    products,
    onDbDown,
    onArmedNameResolved,
    onJumpToProduct: setProductId,
  });

  // Deep link from /spof: ?arm=supplier:s-grindwell fires on arrival.
  useEffect(() => {
    if (!deepLink || deepLinkDone.current) return;
    deepLinkDone.current = true;
    runSimulation(deepLink, "Fire", { jumpToImpacted: true });
  }, [deepLink, runSimulation]);

  // A deep link only carries an id, but the failure-point rail usually knows
  // the supplier's real name and role before the simulation comes back.
  const armedRow = armed ? spof.find((r) => r.supplierId === armed.id) : undefined;
  const armedName = armedRow?.supplierName ?? armed?.name ?? "";
  const armedMeta = armed?.meta ?? (armedRow ? `Sole source for ${armedRow.componentName}` : null);

  // Arming keeps current results on screen; only Simulate/Reset change them.
  const arm = useCallback((target: ArmTarget) => setArmed(target), []);

  const reset = () => {
    setArmed(null);
    clearSimulation();
  };

  // Switching product keeps the simulation: the blast radius is
  // portfolio-wide, and inspecting each affected product's canvas against
  // the same disruption is the whole point. A fully dimmed canvas on an
  // unaffected product is the answer, not a bug.
  const changeProduct = (id: string) => setProductId(id);

  const retry = () => {
    setDbDown(false);
    setReloadToken((n) => n + 1);
  };

  const product = products.find((p) => p.id === productId) ?? products[0];
  const volumeShare = product && totalUnits > 0 ? (product.unitsPerYear / totalUnits) * 100 : 0;

  return (
    <div className="min-h-[calc(100vh-54px)]">
      {dbDown ? (
        <div className="border-b-2 border-divider">
          <DbBanner onRetry={retry} />
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-54px)] flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b-2 border-divider lg:h-[calc(100vh-54px)] lg:w-[302px] lg:overflow-y-auto lg:border-r-2 lg:border-b-0">
          <ProductSection
            products={products}
            productId={productId}
            volumeShare={volumeShare}
            summary={summary}
            onChange={changeProduct}
          />
          <SimulateSection
            armedKind={armed?.kind ?? null}
            armedName={armedName}
            armedMeta={armedMeta}
            eventType={eventType}
            simRunning={simRunning}
            onEventType={setEventType}
            onSimulate={() => armed && runSimulation(armed, eventType)}
            onReset={reset}
          />
          <SpofSection
            spof={spof}
            totalProducts={totalProducts}
            armedId={armed?.id ?? null}
            onArm={arm}
          />
        </aside>

        {productId ? (
          <RippleCanvas
            productId={productId}
            armed={armed}
            impactedIds={impactedIds}
            onArm={arm}
            onLoad={setSummary}
            onDbError={setDbDown}
            reloadToken={reloadToken}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-[12px] text-n-500">
            No products in the graph.
          </div>
        )}

        <aside className="w-full shrink-0 border-t-2 border-divider lg:h-[calc(100vh-54px)] lg:w-[300px] lg:overflow-y-auto lg:border-t-0 lg:border-l-2">
          {sim && simTarget ? (
            <>
              <BlastRadiusPanel
                sim={sim}
                target={simTarget}
                totalProducts={totalProducts}
                unitsAtRisk={unitsAtRisk}
                activeProductId={productId}
                onSelectProduct={changeProduct}
              />
              {armed && armed.id !== simTarget.id ? (
                <div className="border-t-2 border-divider px-5 py-3">
                  <p className="text-[11.5px] leading-snug text-n-600">
                    <span className="font-semibold text-ink">{armedName}</span> is armed — press
                    Simulate to replace these results.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <ReadingPanel pairs={pairs} slowest={slowest} />
          )}
        </aside>
      </div>
    </div>
  );
}
