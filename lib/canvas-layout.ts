/**
 * Turns a product's dependency graph into the layered "Ripple" canvas:
 * five left-to-right bands (origins → processors → ingredients → recipe
 * bases → product), each split into as many sub-columns as its own internal
 * edges require, so every edge points rightward.
 *
 * Pure geometry — no React, no DB. The SVG in components/RippleCanvas.tsx
 * just paints what comes out of layoutCanvas().
 */
import type { Graph, GraphNode } from "./queries";

export type BandId = "origins" | "processors" | "ingredients" | "recipes" | "product";

export const BAND_LABELS: Record<BandId, string> = {
  origins: "Origins",
  processors: "Processors",
  ingredients: "Ingredients",
  recipes: "Recipe bases",
  product: "Product",
};

const BAND_ORDER: BandId[] = ["origins", "processors", "ingredients", "recipes", "product"];

export interface RegionTag {
  regionId: string;
  regionName: string;
  riskLevel: string;
}

export interface LaidOutNode {
  id: string;
  name: string;
  label: GraphNode["label"];
  band: BandId;
  typeLabel: string;
  meta?: string;
  /** Present on supplier cards that sit in the origins band. */
  region?: RegionTag;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaidOutEdge {
  key: string;
  source: string;
  target: string;
  type: string;
  d: string;
}

export interface BandBox {
  id: BandId;
  label: string;
  x: number;
  width: number;
  count: number;
}

export interface CanvasLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  bands: BandBox[];
  width: number;
  height: number;
  /** Longest dependency chain, in hops, ending at the product. */
  deepestChain: number;
}

const CARD_W = 150;
const CARD_H = 46;
const CARD_H_TAGGED = 66;
const COL_GAP = 190;
const ROW_GAP = 14;
const HEADER_H = 34;
const PAD_X = 26;
const PAD_Y = 22;
const LOOP_BULGE = 64;

/** Supplier meta arrives as "Tier 2"; anything unparseable is treated as tier 1. */
function tierOf(node: GraphNode): number {
  const m = /tier\s+(\d+)/i.exec(node.meta ?? "");
  return m ? Number(m[1]) : 1;
}

/**
 * Projected graph links run in path-traversal order, which is downstream →
 * upstream for every relationship we draw. Flipping each one makes the whole
 * canvas read left to right: raw material first, finished product last.
 */
function drawnEdges(graph: Graph) {
  const seen = new Set<string>();
  const out: { source: string; target: string; type: string; key: string }[] = [];
  for (const l of graph.links) {
    if (l.source === l.target) continue;
    const key = `${l.target}|${l.type}|${l.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ source: l.target, target: l.source, type: l.type, key });
  }
  return out;
}

function bandOf(node: GraphNode, recipeBases: Set<string>): BandId {
  switch (node.label) {
    case "Product":
      return "product";
    case "Supplier":
      return tierOf(node) >= 2 ? "origins" : "processors";
    case "Facility":
      return "processors";
    case "Region":
      return "origins";
    default:
      return recipeBases.has(node.id) ? "recipes" : "ingredients";
  }
}

const TYPE_LABEL: Record<BandId, string> = {
  origins: "Supplier",
  processors: "Supplier",
  ingredients: "Component",
  recipes: "Component",
  product: "Product",
};

/**
 * Longest-path depth over a set of edges, relaxed at most `rounds` times so a
 * cyclic subgraph (tier-1 suppliers can source from each other) still ends.
 */
function longestPathDepth(
  ids: string[],
  edges: { source: string; target: string }[],
  rounds: number
): Map<string, number> {
  const depth = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < rounds; pass++) {
    let changed = false;
    for (const e of edges) {
      const from = depth.get(e.source);
      const to = depth.get(e.target);
      if (from === undefined || to === undefined) continue;
      if (from + 1 > to) {
        depth.set(e.target, from + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return depth;
}

export function layoutCanvas(
  graph: Graph,
  regions: Record<string, RegionTag> = {}
): CanvasLayout {
  const edges = drawnEdges(graph);

  // A component with children (it is the target of a drawn PART_OF edge) is a
  // recipe base; leaves are raw ingredients and packaging stock.
  const recipeBases = new Set(
    edges.filter((e) => e.type === "PART_OF").map((e) => e.target)
  );

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const band = new Map<string, BandId>();
  for (const n of graph.nodes) band.set(n.id, bandOf(n, recipeBases));

  // Sub-columns: within a band, an edge between two of its own members pushes
  // the target one column right, so no edge ever points backwards.
  const subCol = new Map<string, number>();
  const bandMembers = new Map<BandId, string[]>();
  for (const b of BAND_ORDER) {
    const ids = graph.nodes.filter((n) => band.get(n.id) === b).map((n) => n.id);
    bandMembers.set(b, ids);
    const inside = new Set(ids);
    const internal = edges.filter((e) => inside.has(e.source) && inside.has(e.target));
    const depth = longestPathDepth(ids, internal, ids.length);
    for (const id of ids) subCol.set(id, depth.get(id) ?? 0);
  }

  // Band x offsets, cumulative over each band's sub-column count.
  const bands: BandBox[] = [];
  let cursorX = PAD_X;
  const bandX = new Map<BandId, number>();
  for (const b of BAND_ORDER) {
    const ids = bandMembers.get(b) ?? [];
    if (ids.length === 0) {
      bands.push({ id: b, label: BAND_LABELS[b], x: cursorX, width: 0, count: 0 });
      bandX.set(b, cursorX);
      continue;
    }
    const cols = Math.max(...ids.map((id) => subCol.get(id) ?? 0)) + 1;
    bandX.set(b, cursorX);
    bands.push({
      id: b,
      label: BAND_LABELS[b],
      x: cursorX,
      width: (cols - 1) * COL_GAP + CARD_W,
      count: ids.length,
    });
    cursorX += cols * COL_GAP;
  }

  // Every node's x is fixed now; group them by column so rows can be ordered.
  const columnKey = (id: string) => `${band.get(id)}:${subCol.get(id)}`;
  const columns = new Map<string, string[]>();
  for (const n of graph.nodes) {
    const k = columnKey(n.id);
    if (!columns.has(k)) columns.set(k, []);
    columns.get(k)!.push(n.id);
  }
  const orderedKeys = [...columns.keys()].sort((a, b) => {
    const [ba, sa] = a.split(":");
    const [bb, sb] = b.split(":");
    const xa = (bandX.get(ba as BandId) ?? 0) + Number(sa) * COL_GAP;
    const xb = (bandX.get(bb as BandId) ?? 0) + Number(sb) * COL_GAP;
    return xa - xb;
  });

  const heightOf = (id: string) => {
    const n = byId.get(id)!;
    return n.label === "Supplier" && band.get(id) === "origins" && regions[id]
      ? CARD_H_TAGGED
      : CARD_H;
  };

  const centerY = new Map<string, number>();
  const restack = () => {
    let tallest = 0;
    for (const k of orderedKeys) {
      const ids = columns.get(k)!;
      const total = ids.reduce((sum, id) => sum + heightOf(id), 0) + (ids.length - 1) * ROW_GAP;
      tallest = Math.max(tallest, total);
    }
    for (const k of orderedKeys) {
      const ids = columns.get(k)!;
      const total = ids.reduce((sum, id) => sum + heightOf(id), 0) + (ids.length - 1) * ROW_GAP;
      let y = HEADER_H + PAD_Y + (tallest - total) / 2;
      for (const id of ids) {
        centerY.set(id, y + heightOf(id) / 2);
        y += heightOf(id) + ROW_GAP;
      }
    }
    return tallest;
  };

  // Two barycentre sweeps: order each column by the mean height of whatever it
  // connects to in the column before it, then again from the right. Cheap, and
  // it removes most of the crossings on a graph this size.
  const neighbours = new Map<string, { in: string[]; out: string[] }>();
  for (const n of graph.nodes) neighbours.set(n.id, { in: [], out: [] });
  for (const e of edges) {
    neighbours.get(e.source)?.out.push(e.target);
    neighbours.get(e.target)?.in.push(e.source);
  }

  const sweep = (keys: string[], side: "in" | "out") => {
    for (const k of keys) {
      const ids = columns.get(k)!;
      const score = new Map<string, number>();
      ids.forEach((id, i) => {
        const refs = (neighbours.get(id)?.[side] ?? [])
          .map((other) => centerY.get(other))
          .filter((v): v is number => v !== undefined);
        score.set(id, refs.length ? refs.reduce((a, b) => a + b, 0) / refs.length : i * 1e3);
      });
      ids.sort((a, b) => score.get(a)! - score.get(b)!);
    }
    restack();
  };

  restack();
  sweep(orderedKeys, "in");
  sweep([...orderedKeys].reverse(), "out");
  const tallest = restack();

  const nodes: LaidOutNode[] = graph.nodes.map((n) => {
    const b = band.get(n.id)!;
    const h = heightOf(n.id);
    return {
      id: n.id,
      name: n.name,
      label: n.label,
      band: b,
      typeLabel: TYPE_LABEL[b],
      meta: n.meta,
      region: b === "origins" ? regions[n.id] : undefined,
      x: (bandX.get(b) ?? PAD_X) + (subCol.get(n.id) ?? 0) * COL_GAP,
      y: (centerY.get(n.id) ?? 0) - h / 2,
      w: CARD_W,
      h,
    };
  });

  const pos = new Map(nodes.map((n) => [n.id, n]));
  const laidOutEdges: LaidOutEdge[] = [];
  for (const e of edges) {
    const a = pos.get(e.source);
    const z = pos.get(e.target);
    if (!a || !z) continue;
    const y1 = a.y + a.h / 2;
    const y2 = z.y + z.h / 2;
    const x1 = a.x + a.w;
    let d: string;
    if (z.x - x1 < 24) {
      // Same or backward column: bow out to the right of both cards.
      const x2 = z.x + z.w;
      d = `M ${x1} ${y1} C ${x1 + LOOP_BULGE} ${y1}, ${x2 + LOOP_BULGE} ${y2}, ${x2} ${y2}`;
    } else {
      const dx = (z.x - x1) * 0.5;
      d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${z.x - dx} ${y2}, ${z.x} ${y2}`;
    }
    laidOutEdges.push({ key: e.key, source: e.source, target: e.target, type: e.type, d });
  }

  const productId = graph.nodes.find((n) => n.label === "Product")?.id;
  const chainDepth = longestPathDepth(
    graph.nodes.map((n) => n.id),
    edges,
    graph.nodes.length
  );
  const deepestChain = productId ? (chainDepth.get(productId) ?? 0) : 0;

  return {
    nodes,
    edges: laidOutEdges,
    bands,
    width: cursorX - COL_GAP + CARD_W + PAD_X,
    height: HEADER_H + PAD_Y * 2 + tallest,
    deepestChain,
  };
}
