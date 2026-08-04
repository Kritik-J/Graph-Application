"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, RiskBadge, Skeleton } from "@/components/ui";
import type { Graph, RegionExposure } from "@/lib/queries";

const BAR_TONE: Record<string, string> = {
  high: "bg-accent",
  medium: "bg-[#b45309]",
  low: "bg-n-400",
};

type Phase = "idle" | "loading" | "done" | "error";

export function ExposureTrace({
  productId,
  exposure,
}: {
  productId: string;
  exposure: RegionExposure[];
}) {
  const [target, setTarget] = useState<RegionExposure | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [graph, setGraph] = useState<Graph | null>(null);

  const trace = useCallback((region: RegionExposure) => {
    setTarget(region);
    setPhase("loading");
    setGraph(null);
  }, []);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/trace?productId=${encodeURIComponent(productId)}&targetId=${encodeURIComponent(target.regionId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("trace failed");
        const data: { graph: Graph } = await res.json();
        if (cancelled) return;
        setGraph(data.graph);
        setPhase("done");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, target]);

  return (
    <Card
      title="Regional exposure"
      className="border-2"
      action={<span className="rp-micro">Components sourced per region</span>}
    >
      <ul>
        {exposure.map((e) => {
          const pct = e.totalComponents > 0 ? (e.exposedComponents / e.totalComponents) * 100 : 0;
          const active = target?.regionId === e.regionId;
          return (
            <li key={e.regionId} className="border-b border-n-200 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px]" title={e.regionName}>
                    {e.regionName}
                  </span>
                  <span className="shrink-0">
                    <RiskBadge level={e.riskLevel} />
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span className="text-[12px] text-n-500">
                    {e.exposedComponents}/{e.totalComponents}
                  </span>
                  <button
                    type="button"
                    onClick={() => trace(e)}
                    className={`border px-2 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase transition-colors ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-divider bg-white hover:bg-surface"
                    }`}
                  >
                    Trace
                  </button>
                </span>
              </div>
              <div className="mt-2 h-[2px] w-full bg-n-200">
                <div
                  className={`h-[2px] ${BAR_TONE[e.riskLevel] ?? "bg-n-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {target ? (
        <div className="mt-5 border-t-2 border-divider pt-4">
          <div className="rp-micro">Shortest path to {target.regionName}</div>

          {phase === "loading" ? (
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-24" />
              ))}
            </div>
          ) : null}

          {phase === "error" ? (
            <p className="mt-3 text-[12px] text-accent">Could not trace this path. Try again.</p>
          ) : null}

          {phase === "done" && graph ? (
            graph.nodes.length === 0 ? (
              <p className="mt-3 text-[12px] text-n-500">
                No connecting path within the traversal limit.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-y-2">
                {graph.nodes.map((node, i) => (
                  <span key={node.id} className="flex items-center">
                    <span
                      className="border border-divider bg-white px-2 py-1 text-[11.5px]"
                      title={node.meta ? `${node.label} · ${node.meta}` : node.label}
                    >
                      {node.name}
                    </span>
                    {i < graph.nodes.length - 1 && graph.links[i] ? (
                      <span className="flex flex-col items-center px-1.5">
                        <span className="rp-micro">{graph.links[i].type}</span>
                        <span className="text-[11px] text-n-400">→</span>
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
