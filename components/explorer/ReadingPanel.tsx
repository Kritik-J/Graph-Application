import type { CoVulnerablePair, SupplierReliability } from "@/lib/queries";

/** Right-rail resting state: how to read the canvas + network-wide signals. */
export function ReadingPanel({
  pairs,
  slowest,
}: {
  pairs: CoVulnerablePair[];
  slowest: SupplierReliability[];
}) {
  return (
    <>
      <div className="px-4 py-4">
        <div className="rp-micro">Nothing simulated</div>
        <h3 className="mt-2 text-[17px] leading-tight font-extrabold">Reading the canvas</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-n-600">
          The chain reads left to right. <strong className="font-semibold">Origins</strong> are the
          farms and co-ops at the tail of the network;{" "}
          <strong className="font-semibold">processors</strong> are the tier-1 houses that buy from
          them. Their output becomes <strong className="font-semibold">ingredients</strong>, which
          combine into <strong className="font-semibold">recipe bases</strong> and finally the{" "}
          <strong className="font-semibold">product</strong>. Arm any supplier or region tag, then
          simulate to see how far a failure carries.
        </p>
      </div>

      <div className="border-t-2 border-divider px-4 py-4">
        <div className="rp-micro">Co-vulnerable pairs</div>
        {pairs.length === 0 ? (
          <p className="mt-2 text-[11px] text-n-400">No shared suppliers.</p>
        ) : (
          <ul className="mt-2.5">
            {pairs.map((p) => (
              <li
                key={`${p.productA}|${p.productB}`}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span className="min-w-0 text-[12.5px] leading-snug">
                  {p.productA} <span className="text-n-400">×</span> {p.productB}
                </span>
                <span className="shrink-0 text-[12.5px] font-extrabold text-accent">
                  {p.sharedSuppliers}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t-2 border-divider px-4 py-4">
        <div className="rp-micro">Slowest suppliers</div>
        {slowest.length === 0 ? (
          <p className="mt-2 text-[11px] text-n-400">No shipment history.</p>
        ) : (
          <ul className="mt-2.5">
            {slowest.map((s) => {
              const pct = s.onTimeRate * 100;
              return (
                <li key={s.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-[12.5px]">{s.name}</span>
                  <span
                    className={`shrink-0 text-[12.5px] font-extrabold ${
                      pct < 80 ? "text-accent" : "text-n-600"
                    }`}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="rp-micro border-t-2 border-divider px-4 py-4">
        Ambrosia Foods · fictional dataset · CognoDB Cloud
      </p>
    </>
  );
}
