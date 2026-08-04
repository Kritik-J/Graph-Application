import Link from "next/link";
import { fmtCompact, fmtInt } from "@/components/ui";
import type { SimulateResponse } from "@/lib/api-utils";
import type { SimTarget } from "./types";

/** Right-rail results: who dies, how much volume, and any second sources. */
export function BlastRadiusPanel({
  sim,
  target,
  totalProducts,
  unitsAtRisk,
  activeProductId,
  onSelectProduct,
}: {
  sim: SimulateResponse;
  target: SimTarget;
  totalProducts: number;
  unitsAtRisk: number;
  /** Currently shown canvas product — its row is marked in the list. */
  activeProductId?: string;
  /** Clicking a row switches the canvas to that product, in context. */
  onSelectProduct?: (productId: string) => void;
}) {
  const peak = Math.max(1, ...sim.products.map((p) => p.unitsPerYear));
  const totalRisk = Math.max(1, unitsAtRisk);

  return (
    <div className="rp-in">
      <div className="px-4 py-4">
        <div className="rp-micro-accent">Blast radius</div>
        <h3 className="mt-2 text-[16px] leading-tight font-extrabold">
          {target.eventType} at {target.name}
        </h3>

        <div className="mt-4 flex items-end gap-5">
          <div>
            <div className="text-[44px] leading-none font-extrabold text-accent">
              {sim.products.length}
            </div>
            <div className="rp-micro mt-1.5">of {totalProducts} products</div>
          </div>
          <div>
            <div className="text-[22px] leading-none font-extrabold">
              {fmtCompact.format(unitsAtRisk)}
            </div>
            <div className="rp-micro mt-1.5">units/yr at risk</div>
          </div>
        </div>

        <p className="mt-3.5 text-[11px] leading-relaxed text-n-500">
          Traversed {fmtInt.format(sim.graph.links.length)} relationships · {sim.componentCount}{" "}
          components touched · {sim.supplierCount} suppliers in chain.
        </p>
      </div>

      <div className="border-t-2 border-divider px-4 py-4">
        <div className="rp-micro">Affected products</div>
        {sim.products.length === 0 ? (
          <p className="mt-2 text-[11px] text-n-400">Nothing downstream depends on this node.</p>
        ) : (
          <ul className="mt-2.5">
            {sim.products.map((p) => (
              <li key={p.id}>
                <div
                  role={onSelectProduct ? "button" : undefined}
                  tabIndex={onSelectProduct ? 0 : undefined}
                  onClick={() => onSelectProduct?.(p.id)}
                  onKeyDown={(e) => {
                    if (onSelectProduct && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSelectProduct(p.id);
                    }
                  }}
                  className={`block py-1.5 pl-1.5 -ml-1.5 ${
                    onSelectProduct ? "cursor-pointer hover:bg-surface" : ""
                  } ${activeProductId === p.id ? "bg-surface" : ""}`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12.5px] font-semibold">{p.name}</span>
                    <span className="rp-micro flex shrink-0 items-baseline gap-2">
                      {((p.unitsPerYear / totalRisk) * 100).toFixed(0)}% vol · {p.minHops} hops
                      <Link
                        href={`/product/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Open product detail"
                        className="text-n-400 transition-colors hover:text-accent"
                      >
                        ↗
                      </Link>
                    </span>
                  </span>
                  <span className="mt-1 block h-[2px] bg-n-200">
                    <span
                      className="block h-[2px] bg-accent"
                      style={{ width: `${(p.unitsPerYear / peak) * 100}%` }}
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sim.mitigations.length > 0 ? (
        <div className="border-t-2 border-divider px-4 py-4">
          <div className="rp-micro">Second sources available</div>
          <ul className="mt-2.5">
            {sim.mitigations.map((m) => (
              <li key={m.componentId} className="py-1.5">
                <p className="truncate text-[12px] font-semibold">{m.componentName}</p>
                {m.alternates.slice(0, 2).map((a) => (
                  <p key={a.supplierId} className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="truncate text-[11.5px] text-ok">{a.supplierName}</span>
                    <span className="rp-micro shrink-0">
                      Tier {a.tier} · {a.leadTimeDays}d lead
                    </span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
