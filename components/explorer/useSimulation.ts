"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import type { ArmTarget } from "@/components/RippleCanvas";
import type { SimulateResponse } from "@/lib/api-utils";
import type { ProductSummary } from "@/lib/queries";
import type { EventType, SimTarget } from "./types";

/**
 * The simulation state machine: runs the blast-radius call, snapshots what
 * was simulated (results stay on screen while the user arms something new),
 * and derives the impacted-node set for canvas dimming.
 */
export function useSimulation({
  products,
  onDbDown,
  onArmedNameResolved,
  onJumpToProduct,
}: {
  products: ProductSummary[];
  onDbDown: () => void;
  /** blastRadius() knows the node's real name — better than a deep-link id. */
  onArmedNameResolved: (id: string, name: string) => void;
  onJumpToProduct: (productId: string) => void;
}) {
  const [sim, setSim] = useState<SimulateResponse | null>(null);
  const [simTarget, setSimTarget] = useState<SimTarget | null>(null);
  const [simRunning, startSim] = useTransition();

  const runSimulation = useCallback(
    (target: ArmTarget, eventType: EventType, { jumpToImpacted = false } = {}) => {
      startSim(async () => {
        try {
          const res = await fetch(
            `/api/simulate?type=${target.kind}&id=${encodeURIComponent(target.id)}`,
            { cache: "no-store" }
          );
          if (!res.ok) {
            if (res.status === 503) onDbDown();
            return;
          }
          const data: SimulateResponse = await res.json();
          setSim(data);
          const self = data.graph.nodes.find((n) => n.id === target.id);
          if (self) onArmedNameResolved(target.id, self.name);
          setSimTarget({ id: target.id, name: self?.name ?? target.name, eventType });
          if (jumpToImpacted && data.products.length > 0) {
            const first = data.products.find((p) => products.some((q) => q.id === p.id));
            if (first) onJumpToProduct(first.id);
          }
        } catch {
          onDbDown();
        }
      });
    },
    [products, onDbDown, onArmedNameResolved, onJumpToProduct]
  );

  const clearSimulation = useCallback(() => {
    setSim(null);
    setSimTarget(null);
  }, []);

  const impactedIds = useMemo(
    () => (sim ? new Set(sim.graph.nodes.map((n) => n.id)) : null),
    [sim]
  );

  const unitsAtRisk = sim?.products.reduce((sum, p) => sum + p.unitsPerYear, 0) ?? 0;

  return { sim, simTarget, simRunning, impactedIds, unitsAtRisk, runSimulation, clearSimulation };
}
