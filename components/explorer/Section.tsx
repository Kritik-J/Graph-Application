import type { ReactNode } from "react";

/** Numbered left-rail section — "01 Product", "02 Simulate disruption", … */
export function Section({
  number,
  title,
  children,
  last = false,
}: {
  number: string;
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section className={`px-4 py-4 ${last ? "" : "border-b-2 border-divider"}`}>
      <h6 className="mb-3 flex items-baseline gap-2 text-[13px] font-extrabold tracking-[0.02em] uppercase">
        <span className="text-accent">{number}</span>
        {title}
      </h6>
      {children}
    </section>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper px-2.5 py-2">
      <div className="rp-micro">{label}</div>
      <div className="mt-1 text-[20px] leading-none font-extrabold">{value}</div>
    </div>
  );
}
