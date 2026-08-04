"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HealthDot } from "@/components/HealthDot";
import { NavLinks } from "@/components/NavLinks";
import { fmtInt } from "@/components/ui";
import type { Overview } from "@/lib/queries";

/** Dataset scale line on the right of the bar; silent if the graph is down. */
function DatasetScale() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/overview", { cache: "no-store" });
        if (!res.ok) return;
        const data: Overview = await res.json();
        if (!cancelled) setOverview(data);
      } catch {
        /* the health chip already reports an unreachable graph */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!overview) return null;
  const nodes =
    overview.products +
    overview.components +
    overview.suppliers +
    overview.facilities +
    overview.regions +
    overview.shipments;

  return (
    <span className="rp-micro hidden xl:inline">
      {fmtInt.format(nodes)} nodes · {fmtInt.format(overview.relationships)} rels ·{" "}
      {overview.products} products · {overview.suppliers} suppliers
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center gap-4 border-b-2 border-divider bg-paper px-4 lg:px-5">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="block h-[11px] w-[11px] bg-accent" />
        <span className="text-[15px] leading-none font-extrabold tracking-[0.02em]">RIPPLE</span>
      </Link>

      <span className="h-6 w-px shrink-0 bg-divider" />

      <span className="hidden shrink-0 text-[12px] text-n-500 md:inline">
        Supply-chain risk explorer
      </span>

      <nav className="flex shrink-0 items-center gap-4 md:ml-2">
        <NavLinks />
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DatasetScale />
        <HealthDot />
      </div>
    </header>
  );
}
