import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <header className="rp-in mb-8">
      <div className="rp-micro-accent">{kicker}</div>
      <h1 className="mt-2 text-[34px] leading-[1.05] font-extrabold tracking-[-0.02em] lg:text-[40px]">
        {title}
      </h1>
      {sub ? <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-n-600">{sub}</p> : null}
    </header>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-divider bg-white p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-extrabold tracking-[0.02em] uppercase">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "hazard" | "critical" | "ok";
}) {
  const toneClass =
    tone === "critical" || tone === "hazard" ? "text-accent" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="bg-white px-4 py-3.5">
      <div className="rp-micro">{label}</div>
      <div className={`mt-1.5 text-[30px] leading-none font-extrabold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: "border-accent text-accent",
    medium: "border-[#b45309] text-[#b45309]",
    low: "border-n-300 text-n-500",
  };
  return (
    <span
      className={`inline-block border px-1.5 py-px text-[9px] tracking-[0.1em] uppercase ${
        styles[level] ?? "border-n-300 text-n-500"
      }`}
    >
      {level}
    </span>
  );
}

export function Criticality({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-[3px] align-middle"
      title={`Criticality ${value}/5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-[9px] w-[3px] ${
            i < value ? (value >= 4 ? "bg-accent" : "bg-ink") : "bg-n-200"
          }`}
        />
      ))}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-n-300 px-6 py-12 text-center">
      <p className="text-[13px] font-extrabold uppercase">{title}</p>
      {hint ? (
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-n-500">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * The one DB-failure surface: a full-width accent band. `onRetry` re-runs a
 * client fetch; without it the Retry link reloads the page, which is what a
 * server-rendered view needs.
 */
export function DbBanner({ onRetry, note }: { onRetry?: () => void; note?: string }) {
  const copy =
    note ??
    "Ripple can't reach the CognoDB instance. It may be waking up, paused, or the network is down — nothing is lost.";
  const retryClass =
    "shrink-0 border border-divider bg-white px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors hover:bg-surface";
  return (
    <div className="w-full border-2 border-accent bg-accent-100 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold tracking-[0.02em] text-accent uppercase">
            Database unreachable
          </p>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-n-600">{copy}</p>
        </div>
        {onRetry ? (
          <button type="button" onClick={onRetry} className={retryClass}>
            Retry
          </button>
        ) : (
          // plain anchor: a full reload is exactly what a server-side retry needs
          <a href="" className={retryClass}>
            Retry
          </a>
        )}
      </div>
    </div>
  );
}

export function DbDownState() {
  return (
    <div className="p-6 lg:p-10">
      <DbBanner />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rp-pulse bg-surface ${className}`} />;
}

export const fmtCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
export const fmtInt = new Intl.NumberFormat("en-US");
