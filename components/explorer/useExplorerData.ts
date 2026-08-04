"use client";

import { useEffect, useState } from "react";
import type { CoVulnerablePair, SpofRow, SupplierReliability } from "@/lib/queries";

/**
 * The three rail feeds (failure points, co-vulnerable pairs, slowest
 * suppliers). Any failure is reported upward as a single DB-down signal —
 * the explorer has one shared banner, not per-panel error states.
 */
export function useExplorerData(reloadToken: number, onDbDown: () => void) {
  const [spof, setSpof] = useState<SpofRow[]>([]);
  const [pairs, setPairs] = useState<CoVulnerablePair[]>([]);
  const [slowest, setSlowest] = useState<SupplierReliability[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const responses = await Promise.all([
          fetch("/api/spof?limit=6", { cache: "no-store" }),
          fetch("/api/covulnerable?limit=4", { cache: "no-store" }),
          fetch("/api/reliability?limit=4", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (responses.some((r) => !r.ok)) {
          onDbDown();
          return;
        }
        const [s, c, r] = await Promise.all(responses.map((res) => res.json()));
        if (cancelled) return;
        setSpof(s);
        setPairs(c);
        setSlowest(r);
      } catch {
        if (!cancelled) onDbDown();
      }
    })();
    return () => {
      cancelled = true;
    };
    // onDbDown is a stable setter-style callback from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken]);

  return { spof, pairs, slowest };
}
