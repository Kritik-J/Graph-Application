import Link from "next/link";
import { Criticality, DbDownState, EmptyState, RiskBadge } from "@/components/ui";
import { DbUnreachableError } from "@/lib/errors";
import { spofReport, type SpofRow } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SpofPage() {
  let rows: SpofRow[];
  try {
    rows = await spofReport();
  } catch (err) {
    if (err instanceof DbUnreachableError) return <DbDownState />;
    throw err;
  }

  const highCriticality = rows.filter((r) => r.criticality >= 4).length;
  const soleSuppliers = new Set(rows.map((r) => r.supplierId)).size;
  const productsThreatened = new Set(rows.flatMap((r) => r.productsAtRisk)).size;

  const stats = [
    { label: "Single-sourced components", value: rows.length, hot: false },
    { label: "Criticality 4+", value: highCriticality, hot: highCriticality > 0 },
    { label: "Sole suppliers", value: soleSuppliers, hot: false },
    { label: "Products threatened", value: productsThreatened, hot: productsThreatened > 0 },
  ];

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <header className="rp-in mb-8 max-w-3xl">
        <div className="rp-micro-accent">03 · Sole-source register</div>
        <h1 className="mt-2 text-[34px] leading-[1.05] font-extrabold tracking-[-0.02em] lg:text-[40px]">
          Single points of failure
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-n-600">
          Components with exactly one qualified supplier. Found by aggregating every supply path in
          the graph, then walking the variable-depth sub-assembly hierarchy up to each finished
          product — one Cypher query, and a pile of recursive CTEs in SQL.
        </p>
      </header>

      <div className="rp-in grid grid-cols-2 gap-px border border-divider bg-divider lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-4 py-3.5">
            <div className="rp-micro">{s.label}</div>
            <div
              className={`mt-1.5 text-[30px] leading-none font-extrabold ${
                s.hot ? "text-accent" : ""
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6 border-2 border-divider bg-white">
        <div className="flex items-baseline justify-between gap-3 border-b-2 border-divider px-4 py-3">
          <h2 className="text-[13px] font-extrabold tracking-[0.02em] uppercase">
            Sole-source register
          </h2>
          <span className="rp-micro">Ordered by products at risk</span>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No single points of failure"
              hint="Every component in the graph has at least two qualified suppliers."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-divider">
                  <th className="rp-micro px-4 py-2.5 font-normal">Component</th>
                  <th className="rp-micro px-3 py-2.5 font-normal">Sole supplier</th>
                  <th className="rp-micro px-3 py-2.5 font-normal">Region(s)</th>
                  <th className="rp-micro px-3 py-2.5 font-normal">Products at risk</th>
                  <th className="rp-micro px-4 py-2.5 text-right font-normal">Drill</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const drill = `/?arm=supplier:${encodeURIComponent(r.supplierId)}`;
                  const risks = [...new Set(r.regionRisk)];
                  return (
                    <tr
                      key={r.componentId}
                      className="border-b border-n-200 transition-colors last:border-b-0 hover:bg-surface"
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold">{r.componentName}</div>
                        <div className="mt-1.5">
                          <Criticality value={r.criticality} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={drill}
                          className="text-[13px] text-ink underline decoration-n-300 underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {r.supplierName}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[12px] text-n-600">
                            {r.regions.length > 0 ? r.regions.join(", ") : "—"}
                          </span>
                          {risks.map((level) => (
                            <RiskBadge key={level} level={level} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[13px] font-extrabold">
                          {r.productsAtRisk.length}
                        </span>
                        {r.productsAtRisk.length > 0 ? (
                          <span className="ml-2 text-[11.5px] text-n-500">
                            {r.productsAtRisk.slice(0, 2).join(", ")}
                            {r.productsAtRisk.length > 2 ? ` +${r.productsAtRisk.length - 2}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={drill}
                          className="inline-block border border-divider bg-white px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase transition-colors hover:bg-accent hover:text-white"
                        >
                          Simulate
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="rp-micro mt-6">Ambrosia Foods · fictional dataset · CognoDB Cloud</p>
    </div>
  );
}
