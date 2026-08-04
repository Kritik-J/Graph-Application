"use client";

import type { ArmTarget } from "@/components/RippleCanvas";
import type { SpofRow } from "@/lib/queries";
import { Section } from "./Section";

export function SpofSection({
  spof,
  totalProducts,
  armedId,
  onArm,
}: {
  spof: SpofRow[];
  totalProducts: number;
  armedId: string | null;
  onArm: (target: ArmTarget) => void;
}) {
  return (
    <Section number="03" title="Single points of failure" last>
      <p className="-mt-1 mb-3 text-[11px] leading-relaxed text-n-500">
        Suppliers every chocolate path runs through. Ranked across all {totalProducts} products.
      </p>
      {spof.length === 0 ? (
        <p className="text-[11px] text-n-400">No sole-source suppliers found.</p>
      ) : (
        <ul>
          {spof.map((row, i) => (
            <li key={row.componentId}>
              <button
                type="button"
                onClick={() =>
                  onArm({
                    kind: "supplier",
                    id: row.supplierId,
                    name: row.supplierName,
                    meta: `Sole source for ${row.componentName}`,
                  })
                }
                className={`flex w-full items-center gap-2.5 px-1.5 py-2 text-left transition-colors hover:bg-surface ${
                  armedId === row.supplierId ? "bg-surface" : ""
                }`}
              >
                <span className="w-4 shrink-0 text-[11px] font-extrabold text-n-300">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">
                    {row.supplierName}
                  </span>
                  <span className="rp-micro block truncate">{row.componentName}</span>
                </span>
                <span className="w-14 shrink-0 text-right">
                  <span className="block text-[12px] font-extrabold">
                    {row.productsAtRisk.length}
                  </span>
                  <span className="mt-1 block h-[2px] bg-n-200">
                    <span
                      className="block h-[2px] bg-accent"
                      style={{
                        width: `${Math.min(
                          100,
                          (row.productsAtRisk.length / Math.max(totalProducts, 1)) * 100
                        )}%`,
                      }}
                    />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
