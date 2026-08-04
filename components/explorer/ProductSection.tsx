"use client";

import type { CanvasSummary } from "@/components/RippleCanvas";
import type { ProductSummary } from "@/lib/queries";
import { MiniStat, Section } from "./Section";

export function ProductSection({
  products,
  productId,
  volumeShare,
  summary,
  onChange,
}: {
  products: ProductSummary[];
  productId: string;
  volumeShare: number;
  summary: CanvasSummary | null;
  onChange: (productId: string) => void;
}) {
  return (
    <Section number="01" title="Product">
      <select
        value={productId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-divider bg-white px-2.5 py-2 text-[14px] font-extrabold text-ink"
      >
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-2 gap-px bg-divider">
        <MiniStat label="Volume weight" value={`${volumeShare.toFixed(1)}%`} />
        <MiniStat
          label="Upstream nodes"
          value={summary ? String(Math.max(summary.nodeCount - 1, 0)) : "—"}
        />
      </div>

      <p className="mt-2.5 text-[11px] text-n-500">
        {summary
          ? `${summary.edgeCount} dependency edges · deepest chain ${summary.deepestChain} hops`
          : "Loading dependency graph…"}
      </p>
    </Section>
  );
}
