"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasResponse } from "@/lib/api-utils";
import { layoutCanvas, type CanvasLayout, type LaidOutNode } from "@/lib/canvas-layout";
import { DbBanner } from "@/components/ui";

export type ArmKind = "supplier" | "region";

export interface ArmTarget {
  kind: ArmKind;
  id: string;
  name: string;
  meta?: string;
}

export interface CanvasSummary {
  product: CanvasResponse["product"];
  nodeCount: number;
  edgeCount: number;
  deepestChain: number;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 0.25;
const MAX_K = 2.4;
const RISK_TAG: Record<string, string> = {
  high: "text-accent",
  medium: "text-[#b45309]",
  low: "text-n-500",
};

type Phase = "loading" | "ready" | "down" | "error";

type FetchResult =
  | { key: string; status: "ready"; data: CanvasResponse }
  | { key: string; status: "down" | "error" };

export function RippleCanvas({
  productId,
  readOnly = false,
  armed = null,
  impactedIds = null,
  onArm,
  onLoad,
  onDbError,
  reloadToken = 0,
}: {
  productId: string;
  readOnly?: boolean;
  armed?: ArmTarget | null;
  impactedIds?: Set<string> | null;
  onArm?: (target: ArmTarget) => void;
  onLoad?: (summary: CanvasSummary) => void;
  onDbError?: (down: boolean) => void;
  reloadToken?: number;
}) {
  const [result, setResult] = useState<FetchResult | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(!readOnly);
  const [localReload, setLocalReload] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const onLoadRef = useRef(onLoad);
  const onDbErrorRef = useRef(onDbError);
  useEffect(() => {
    onLoadRef.current = onLoad;
    onDbErrorRef.current = onDbError;
  });

  // A result is only current if it belongs to the request we would issue now,
  // which makes "loading" a derived state rather than one more setState.
  const fetchKey = `${productId}|${reloadToken}|${localReload}`;
  const current = result?.key === fetchKey ? result : null;
  const phase: Phase = current ? current.status : "loading";
  const data = current?.status === "ready" ? current.data : null;

  const layout: CanvasLayout | null = useMemo(
    () => (data ? layoutCanvas(data.graph, data.regions) : null),
    [data]
  );

  const fit = useCallback((l: CanvasLayout) => {
    const box = boxRef.current;
    if (!box) return;
    const cw = box.clientWidth - 48;
    const ch = box.clientHeight - 48;
    if (cw <= 0 || ch <= 0) return;
    const k = Math.max(MIN_K, Math.min(1, cw / l.width, ch / l.height));
    setView({
      x: (box.clientWidth - l.width * k) / 2,
      y: (box.clientHeight - l.height * k) / 2,
      k,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/canvas?productId=${encodeURIComponent(productId)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 503) throw new Error("db_unreachable");
        if (!res.ok) throw new Error("canvas_failed");
        const json: CanvasResponse = await res.json();
        if (cancelled) return;
        setResult({ key: fetchKey, status: "ready", data: json });
        onDbErrorRef.current?.(false);
        const l = layoutCanvas(json.graph, json.regions);
        onLoadRef.current?.({
          product: json.product,
          nodeCount: l.nodes.length,
          edgeCount: l.edges.length,
          deepestChain: l.deepestChain,
        });
      } catch (err) {
        if (cancelled) return;
        const down = err instanceof Error && err.message === "db_unreachable";
        setResult({ key: fetchKey, status: down ? "down" : "error" });
        onDbErrorRef.current?.(down);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, fetchKey]);

  // Frame the graph once it is painted, and again whenever the rails resize
  // underneath it.
  useEffect(() => {
    const box = boxRef.current;
    if (!layout || !box) return;
    const frame = requestAnimationFrame(() => fit(layout));
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => fit(layout));
    ro?.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
    };
  }, [layout, fit]);

  // Wheel zoom has to be a non-passive native listener to keep the page still.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = box.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setView((v) => {
        const k = Math.max(MIN_K, Math.min(MAX_K, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const ratio = k / v.k;
        return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
      });
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) =>
    setView((v) => {
      const box = boxRef.current;
      const px = (box?.clientWidth ?? 0) / 2;
      const py = (box?.clientHeight ?? 0) / 2;
      const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
      const ratio = k / v.k;
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });

  // Capturing on pointerdown would retarget pointerup to the <svg>, which
  // makes the browser compose the click there instead of on the card — card
  // clicks would never fire. So the pointer is only captured once movement
  // crosses the drag threshold; plain clicks compose normally.
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX - view.x, y: e.clientY - view.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = e.clientX - d.x;
    const ny = e.clientY - d.y;
    if (!d.moved && (Math.abs(nx - view.x) > 3 || Math.abs(ny - view.y) > 3)) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (d.moved) setView((v) => ({ ...v, x: nx, y: ny }));
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // Keep `moved` readable through the click that follows this pointerup.
    setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  const arm = (target: ArmTarget) => {
    if (readOnly || dragRef.current?.moved) return;
    onArm?.(target);
  };

  // Adjacency for hover/armed edge highlighting — one pass per layout.
  const adj = useMemo(() => {
    const edgesByNode = new Map<string, Set<string>>();
    const neighbors = new Map<string, Set<string>>();
    if (layout) {
      for (const e of layout.edges) {
        for (const [a, b] of [
          [e.source, e.target],
          [e.target, e.source],
        ] as const) {
          if (!edgesByNode.has(a)) edgesByNode.set(a, new Set());
          edgesByNode.get(a)!.add(e.key);
          if (!neighbors.has(a)) neighbors.set(a, new Set());
          neighbors.get(a)!.add(b);
        }
      }
    }
    return { edgesByNode, neighbors };
  }, [layout]);

  // Which cards the armed selection lights up. A region is not a node on the
  // canvas, so arming one anchors on every supplier operating out of it.
  const armedEdgeKeys = useMemo(() => {
    if (!layout || !armed) return null;
    const anchors =
      armed.kind === "region"
        ? layout.nodes.filter((n) => n.region?.regionId === armed.id).map((n) => n.id)
        : [armed.id];
    const keys = new Set<string>();
    for (const id of anchors) {
      for (const key of adj.edgesByNode.get(id) ?? []) keys.add(key);
    }
    return keys;
  }, [layout, armed, adj]);

  if (phase === "down" || phase === "error") {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <DbBanner
          onRetry={() => setLocalReload((n) => n + 1)}
          note={
            phase === "down"
              ? undefined
              : "The canvas query did not come back. Retry in a moment."
          }
        />
      </div>
    );
  }

  const dimmed = (id: string) => impactedIds != null && !impactedIds.has(id);

  return (
    <div
      ref={boxRef}
      className="rp-grid relative min-h-[440px] flex-1 touch-none overflow-hidden bg-paper"
    >
      {phase === "loading" || !layout ? (
        <CanvasSkeleton />
      ) : (
        <svg
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {layout.bands
              .filter((b) => b.count > 0)
              .map((b) => (
                <text
                  key={b.id}
                  x={b.x}
                  y={16}
                  fill="var(--color-ink)"
                  fillOpacity={0.5}
                  fontSize={9.5}
                  letterSpacing="0.1em"
                  style={{ textTransform: "uppercase" }}
                >
                  {b.label.toUpperCase()}
                </text>
              ))}

            {layout.edges.map((e) => {
              const simOn = impactedIds != null;
              const hot = simOn && impactedIds.has(e.source) && impactedIds.has(e.target);
              const off = simOn && !hot;
              // Hover/armed emphasis: incident edges light up. After a
              // simulation only the impacted (hot) edges respond to hover.
              const hoverEdge = hover != null && adj.edgesByNode.get(hover)?.has(e.key) === true;
              const armedEdge = !simOn && armedEdgeKeys?.has(e.key) === true;
              // Armed selection is accent; hover is ink. Simulated impact
              // paths are also accent but marching-dashed, so the two never
              // read alike — and they never coexist (arming clears the sim).
              // Ink for selection emphasis — accent red is reserved for
              // simulated impact paths so the two states never read alike.
              const stroke = hot
                ? "var(--color-accent)"
                : armedEdge || (!simOn && hoverEdge)
                  ? "var(--color-ink)"
                  : "var(--color-divider)";
              const width = hot
                ? hoverEdge
                  ? 2.25
                  : 1.75
                : armedEdge || (!simOn && hoverEdge)
                  ? 1.75
                  : 1;
              return (
                <path
                  key={e.key}
                  d={e.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  opacity={off ? 0.18 : 1}
                  style={
                    hot
                      ? {
                          strokeDasharray: "7 7",
                          animation: "rp-dash .6s linear infinite",
                          transition: "stroke-width .12s ease",
                        }
                      : {
                          transition:
                            "opacity .3s ease, stroke .12s ease, stroke-width .12s ease",
                        }
                  }
                />
              );
            })}

            {layout.nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                readOnly={readOnly}
                armed={armed?.id === n.id}
                armedRegion={armed?.kind === "region" && armed.id === n.region?.regionId}
                impacted={impactedIds?.has(n.id) ?? false}
                dimmed={dimmed(n.id)}
                hovered={hover === n.id}
                neighborHovered={
                  hover != null && hover !== n.id && (adj.neighbors.get(hover)?.has(n.id) ?? false)
                }
                onHover={setHover}
                onArm={arm}
              />
            ))}
          </g>
        </svg>
      )}

      <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5">
        <span className="rp-micro border border-divider bg-white px-2 py-1.5">MAX 6 HOPS</span>
        <div className="pointer-events-auto flex">
          <ZoomChip label="−" onClick={() => zoomBy(1 / 1.2)} />
          <ZoomChip label="+" onClick={() => zoomBy(1.2)} />
          <ZoomChip label="FIT" onClick={() => layout && fit(layout)} wide />
        </div>
      </div>

      {!readOnly && hintOpen && !armed && phase === "ready" ? (
        <div className="rp-in absolute top-3 left-3 flex max-w-[19rem] items-start gap-3 bg-ink px-3 py-2.5 text-white">
          <p className="text-[11.5px] leading-snug">
            Click any origin or processor and press Simulate.
          </p>
          <button
            type="button"
            aria-label="Dismiss hint"
            onClick={() => setHintOpen(false)}
            className="-mt-0.5 shrink-0 text-[15px] leading-none text-white/70 transition-colors hover:text-white"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ZoomChip({
  label,
  onClick,
  wide = false,
}: {
  label: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-px border border-divider bg-white py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-surface ${
        wide ? "px-2.5 tracking-[0.1em]" : "w-7"
      }`}
    >
      {label}
    </button>
  );
}

function NodeCard({
  node,
  readOnly,
  armed,
  armedRegion,
  impacted,
  dimmed,
  hovered,
  neighborHovered,
  onHover,
  onArm,
}: {
  node: LaidOutNode;
  readOnly: boolean;
  armed: boolean;
  armedRegion: boolean;
  impacted: boolean;
  dimmed: boolean;
  hovered: boolean;
  neighborHovered: boolean;
  onHover: (id: string | null) => void;
  onArm: (t: ArmTarget) => void;
}) {
  const armable = !readOnly && node.label === "Supplier";
  const isHotProduct = node.label === "Product" && impacted;

  // Hover feedback is not gated on `armable`: the read-only canvas on the
  // product page highlights the same way, it just cannot arm anything.
  const ring = armed
    ? "inset 0 0 0 2px var(--color-accent)"
    : hovered && !dimmed
      ? "inset 0 0 0 2px var(--color-ink)"
      : neighborHovered && !dimmed
        ? "inset 0 0 0 1px color-mix(in srgb, var(--color-ink) 60%, transparent)"
        : "inset 0 0 0 1px color-mix(in srgb, var(--color-ink) 30%, transparent)";

  return (
    <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}>
      <div
        // Armable cards are real controls: exposed to assistive tech and
        // reachable by keyboard. They cannot be <button>s because the region
        // chip is itself a button and buttons may not nest.
        role={armable ? "button" : undefined}
        tabIndex={armable ? 0 : undefined}
        aria-pressed={armable ? armed : undefined}
        aria-label={armable ? `Arm disruption at ${node.name}` : undefined}
        // A press that starts on a card must not engage the canvas pan —
        // otherwise pointer capture retargets the click and arming breaks.
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={() => (dimmed ? undefined : onHover(node.id))}
        onMouseLeave={() => onHover(null)}
        onFocus={() => (dimmed ? undefined : onHover(node.id))}
        onBlur={() => onHover(null)}
        onKeyDown={(e) => {
          if (!armable || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          onArm({ kind: "supplier", id: node.id, name: node.name, meta: node.meta });
        }}
        onClick={() =>
          armable && onArm({ kind: "supplier", id: node.id, name: node.name, meta: node.meta })
        }
        style={{
          boxShadow: ring,
          // The armed card stays fully visible even inside a dimmed
          // simulation so the user can always see what they've selected.
          opacity: armed ? 1 : dimmed ? 0.18 : 1,
          transition: "opacity .3s ease, box-shadow .15s ease",
          background: isHotProduct ? "var(--color-accent)" : "#ffffff",
          color: isHotProduct ? "#ffffff" : "var(--color-ink)",
        }}
        className={`flex h-full w-full flex-col justify-center gap-1 px-2.5 py-2 ${
          armable ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <span
          className="self-start px-1 py-px text-[9px] leading-none tracking-[0.1em] uppercase"
          style={{
            background: armed ? "var(--color-accent-100)" : "transparent",
            color: armed
              ? "var(--color-accent)"
              : isHotProduct
                ? "rgba(255,255,255,.75)"
                : "var(--color-n-400)",
            marginLeft: armed ? "-4px" : 0,
          }}
        >
          {node.typeLabel}
        </span>
        <span className="truncate text-[12.5px] leading-tight font-semibold" title={node.name}>
          {node.name}
        </span>
        {node.region ? (
          <button
            type="button"
            title={`${node.region.regionName} · ${node.region.riskLevel} risk`}
            onClick={(e) => {
              e.stopPropagation();
              if (readOnly || !node.region) return;
              onArm({
                kind: "region",
                id: node.region.regionId,
                name: node.region.regionName,
                meta: `${node.region.riskLevel} risk region`,
              });
            }}
            className={`self-start truncate border px-1 py-px text-[9px] tracking-[0.06em] uppercase transition-colors ${
              RISK_TAG[node.region.riskLevel] ?? "text-n-500"
            } ${
              armedRegion ? "border-accent bg-accent-100" : "border-n-200 hover:border-divider"
            } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            style={{ maxWidth: "100%" }}
          >
            {node.region.regionName}
          </button>
        ) : null}
      </div>
    </foreignObject>
  );
}

function CanvasSkeleton() {
  const columns = [3, 4, 5, 4, 1];
  return (
    <div className="flex h-full items-center gap-10 px-10">
      {columns.map((rows, c) => (
        <div key={c} className="flex flex-col gap-3.5">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="rp-pulse h-[46px] w-[150px] bg-surface" />
          ))}
        </div>
      ))}
    </div>
  );
}
