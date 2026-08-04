import { NextResponse } from "next/server";
import type { AlternateSupplier, BlastRadius, Graph, SupplierRegion } from "./queries";
import { DbUnreachableError } from "./errors";

/** Return this from a handler body when the requested entity does not exist. */
export const NOT_FOUND = Symbol("not_found");

/**
 * Wraps a route handler body so every API surface reports database trouble
 * the same way: 503 when the graph is unreachable (the UI shows a retry
 * state for this), 500 for anything else.
 */
export async function handleDbErrors<T>(
  fn: () => Promise<T | typeof NOT_FOUND>
): Promise<NextResponse> {
  try {
    const value = await fn();
    if (value === NOT_FOUND) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(value);
  } catch (err) {
    if (err instanceof DbUnreachableError) {
      return NextResponse.json({ error: "db_unreachable" }, { status: 503 });
    }
    console.error("[ripple] api error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export interface Mitigation {
  componentId: string;
  componentName: string;
  alternates: AlternateSupplier[];
}

/** Shape returned by GET /api/simulate. */
export type SimulateResponse = BlastRadius & { mitigations: Mitigation[] };

/**
 * Shape returned by GET /api/canvas — one product's dependency graph plus the
 * region each supplier in it operates from, which the canvas renders as tags.
 */
export interface CanvasResponse {
  product: { id: string; name: string; category: string; unitsPerYear: number };
  graph: Graph;
  regions: Record<string, Omit<SupplierRegion, "supplierId">>;
}
