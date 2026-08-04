/**
 * All Cypher for Ripple lives here. Every query goes through the
 * parameterized runRead helper — values are always $params, never
 * interpolated into the query string. Path lengths are bounded to respect
 * the free-tier instance.
 */
import type { Node as Neo4jNode } from "neo4j-driver";
import { runRead, toNumber } from "./db";

// ── Graph shapes consumed by the layered canvas visualization ─────────

export interface GraphNode {
  id: string;
  name: string;
  label: "Product" | "Component" | "Supplier" | "Facility" | "Region";
  meta?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
}

// CognoDB returns path nodes without labels over Bolt, so we derive the
// node type from our id convention (p-, c-, s-, f-, r-) instead.
const LABEL_BY_PREFIX: Record<string, GraphNode["label"]> = {
  p: "Product",
  c: "Component",
  s: "Supplier",
  f: "Facility",
  r: "Region",
};

/**
 * CognoDB quirk: for a multi-leg pattern, the bound path value only retains
 * the final leg (from the last variable-length group onward). Single-leg
 * paths are complete. So multi-leg traversals bind ONE path variable per
 * leg, project each into plain lists with projectLeg(), and the legs are
 * stitched back together client-side with stitchLegs().
 */
const PATH_PROJECTION = `[n IN nodes(path) | {id: n.id, name: n.name, tier: n.tier, riskLevel: n.riskLevel, category: n.category}] AS pathNodes,
       [r IN relationships(path) | type(r)] AS relTypes`;

function projectLeg(pathVar: string, i: number): string {
  return `[n IN nodes(${pathVar}) | {id: n.id, name: n.name, tier: n.tier, riskLevel: n.riskLevel, category: n.category}] AS ns${i},
          [r IN relationships(${pathVar}) | type(r)] AS ts${i}`;
}

/** Rejoin per-leg projections: leg k's first node equals leg k-1's last. */
function stitchLegs(record: Record<string, unknown>, legCount: number): ProjectedPath {
  const pathNodes: ProjectedPathNode[] = [];
  const relTypes: string[] = [];
  for (let i = 1; i <= legCount; i++) {
    const ns = record[`ns${i}`] as ProjectedPathNode[];
    const ts = record[`ts${i}`] as string[];
    pathNodes.push(...(pathNodes.length === 0 ? ns : ns.slice(1)));
    relTypes.push(...ts);
  }
  return { pathNodes, relTypes };
}

interface ProjectedPathNode {
  id: string;
  name: string;
  tier?: unknown;
  riskLevel?: string | null;
  category?: string | null;
}

export interface ProjectedPath {
  pathNodes: ProjectedPathNode[];
  relTypes: string[];
}

function toGraphNode(n: ProjectedPathNode): GraphNode {
  return {
    id: n.id,
    name: n.name ?? n.id,
    label: LABEL_BY_PREFIX[n.id.split("-")[0]] ?? "Component",
    meta:
      n.tier != null
        ? `Tier ${toNumber(n.tier)}`
        : n.riskLevel
          ? `${n.riskLevel} risk`
          : (n.category ?? undefined),
  };
}

/** Collapse projected paths into a deduplicated {nodes, links} graph. */
export function projectedPathsToGraph(paths: ProjectedPath[]): Graph {
  const nodes = new Map<string, GraphNode>();
  const links = new Map<string, GraphLink>();
  for (const { pathNodes, relTypes } of paths) {
    for (const n of pathNodes) {
      if (!nodes.has(n.id)) nodes.set(n.id, toGraphNode(n));
    }
    for (let i = 0; i < relTypes.length; i++) {
      const source = pathNodes[i]?.id;
      const target = pathNodes[i + 1]?.id;
      if (!source || !target) continue;
      const key = `${source}|${relTypes[i]}|${target}`;
      if (!links.has(key)) links.set(key, { source, target, type: relTypes[i] });
    }
  }
  return { nodes: [...nodes.values()], links: [...links.values()] };
}

// ── Overview / dashboard ───────────────────────────────────────────────

export interface Overview {
  products: number;
  components: number;
  suppliers: number;
  facilities: number;
  regions: number;
  shipments: number;
  relationships: number;
}

export async function getOverview(): Promise<Overview> {
  const rows = await runRead(
    `MATCH (n)
     UNWIND labels(n) AS label
     RETURN label, count(*) AS count`,
    {},
    (r) => ({ label: String(r.label), count: toNumber(r.count) })
  );
  const rels = await runRead(
    `MATCH ()-[r]->() RETURN count(r) AS count`,
    {},
    (r) => toNumber(r.count)
  );
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.count]));
  return {
    products: byLabel.Product ?? 0,
    components: byLabel.Component ?? 0,
    suppliers: byLabel.Supplier ?? 0,
    facilities: byLabel.Facility ?? 0,
    regions: byLabel.Region ?? 0,
    shipments: byLabel.Shipment ?? 0,
    relationships: rels[0] ?? 0,
  };
}

export interface ProductSummary {
  id: string;
  name: string;
  category: string;
  unitsPerYear: number;
  componentCount: number;
  supplierCount: number;
  maxRegionRisk: number;
}

export async function listProducts(): Promise<ProductSummary[]> {
  return runRead(
    `MATCH (p:Product)
     OPTIONAL MATCH (p)-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(c:Component)
     WITH p, count(DISTINCT c) AS componentCount
     OPTIONAL MATCH (p)-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(:Component)-[:SUPPLIED_BY]->(s:Supplier)
     WITH p, componentCount, count(DISTINCT s) AS supplierCount
     OPTIONAL MATCH (p)-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(:Component)-[:SUPPLIED_BY]->(:Supplier)-[:SOURCES_FROM*0..4]->(:Supplier)-[:OPERATES]->(:Facility)-[:LOCATED_IN]->(r:Region)
     RETURN p.id AS id, p.name AS name, p.category AS category, p.unitsPerYear AS unitsPerYear,
            componentCount, supplierCount,
            max(r.riskScore) AS maxRegionRisk
     ORDER BY p.unitsPerYear DESC`,
    {},
    (r) => ({
      id: String(r.id),
      name: String(r.name),
      category: String(r.category),
      unitsPerYear: toNumber(r.unitsPerYear),
      componentCount: toNumber(r.componentCount),
      supplierCount: toNumber(r.supplierCount),
      maxRegionRisk: r.maxRegionRisk == null ? 0 : toNumber(r.maxRegionRisk),
    })
  );
}

export interface SupplierReliability {
  id: string;
  name: string;
  tier: number;
  shipments: number;
  onTimeRate: number;
}

export async function worstSuppliersByOnTime(limit = 8): Promise<SupplierReliability[]> {
  return runRead(
    `MATCH (s:Supplier)-[:SHIPPED]->(sh:Shipment)
     WITH s, count(sh) AS total, sum(CASE WHEN sh.onTime THEN 1 ELSE 0 END) AS onTime
     RETURN s.id AS id, s.name AS name, s.tier AS tier, total AS shipments,
            toFloat(onTime) / total AS onTimeRate
     ORDER BY onTimeRate ASC
     LIMIT $limit`,
    { limit: Math.trunc(limit) },
    (r) => ({
      id: String(r.id),
      name: String(r.name),
      tier: toNumber(r.tier),
      shipments: toNumber(r.shipments),
      onTimeRate: Number(r.onTimeRate),
    })
  );
}

// ── Disruption simulator ───────────────────────────────────────────────

export type DisruptionType = "supplier" | "facility" | "region";

export interface DisruptionTarget {
  id: string;
  name: string;
  type: DisruptionType;
  detail: string;
}

export async function listDisruptionTargets(): Promise<DisruptionTarget[]> {
  const suppliers = await runRead(
    `MATCH (s:Supplier) RETURN s.id AS id, s.name AS name, s.tier AS tier ORDER BY s.tier, s.name`,
    {},
    (r) => ({
      id: String(r.id),
      name: String(r.name),
      type: "supplier" as const,
      detail: `Tier ${toNumber(r.tier)} supplier`,
    })
  );
  const facilities = await runRead(
    `MATCH (s:Supplier)-[:OPERATES]->(f:Facility)-[:LOCATED_IN]->(r:Region)
     RETURN f.id AS id, f.name AS name, r.name AS region ORDER BY f.name`,
    {},
    (r) => ({
      id: String(r.id),
      name: String(r.name),
      type: "facility" as const,
      detail: String(r.region),
    })
  );
  const regions = await runRead(
    `MATCH (r:Region) RETURN r.id AS id, r.name AS name, r.riskLevel AS risk ORDER BY r.riskScore DESC`,
    {},
    (r) => ({
      id: String(r.id),
      name: String(r.name),
      type: "region" as const,
      detail: `${r.risk} risk region`,
    })
  );
  return [...regions, ...suppliers, ...facilities];
}

export interface ImpactedProduct {
  id: string;
  name: string;
  category: string;
  unitsPerYear: number;
  minHops: number;
  affectedComponents: string[];
}

export interface BlastRadius {
  products: ImpactedProduct[];
  /** Components whose supply chain touches the disrupted node. */
  components: { id: string; name: string }[];
  componentCount: number;
  supplierCount: number;
  graph: Graph;
}

// The traversal spine is identical for all three cases; only the anchor
// legs differ. Labels cannot be parameterized in Cypher, so we keep one
// vetted string per type — values still arrive via $id. Each leg binds its
// own path variable (see the CognoDB multi-leg path quirk above).
const BLAST_SPINE = (firstLeg: string, legOffset: number) => `
  ${firstLeg}
  MATCH lg${legOffset + 1} = (s1)<-[:SUPPLIED_BY]-(c:Component)
  MATCH lg${legOffset + 2} = (c)-[:PART_OF*0..3]->(t:Component)
  MATCH lg${legOffset + 3} = (t)<-[:CONTAINS]-(p:Product)
  RETURN p, c,
    ${Array.from({ length: legOffset + 3 }, (_, i) => projectLeg(`lg${i + 1}`, i + 1)).join(",\n    ")}
  LIMIT 2000`;

const BLAST_QUERIES: Record<DisruptionType, { cypher: string; legs: number }> = {
  supplier: {
    cypher: `MATCH (d:Supplier {id: $id})
             ${BLAST_SPINE(`MATCH lg1 = (d)<-[:SOURCES_FROM*0..4]-(s1:Supplier)`, 1)}`,
    legs: 4,
  },
  facility: {
    cypher: `MATCH (d:Facility {id: $id})
             ${BLAST_SPINE(
               `MATCH lg1 = (d)<-[:OPERATES]-(s0:Supplier)
                MATCH lg2 = (s0)<-[:SOURCES_FROM*0..4]-(s1:Supplier)`,
               2
             )}`,
    legs: 5,
  },
  region: {
    cypher: `MATCH (d:Region {id: $id})
             ${BLAST_SPINE(
               `MATCH lg1 = (d)<-[:LOCATED_IN]-(f:Facility)
                MATCH lg2 = (f)<-[:OPERATES]-(s0:Supplier)
                MATCH lg3 = (s0)<-[:SOURCES_FROM*0..4]-(s1:Supplier)`,
               3
             )}`,
    legs: 6,
  },
};

export async function blastRadius(type: DisruptionType, id: string): Promise<BlastRadius> {
  const { cypher, legs } = BLAST_QUERIES[type];
  const rows = await runRead(cypher, { id }, (r) => {
    const path = stitchLegs(r, legs);
    return {
      path,
      product: r.p as Neo4jNode,
      component: r.c as Neo4jNode,
      hops: path.relTypes.length,
    };
  });

  const byProduct = new Map<string, ImpactedProduct>();
  const componentsById = new Map<string, { id: string; name: string }>();
  for (const row of rows) {
    const pid = String(row.product.properties.id);
    const cName = String(row.component.properties.name);
    const cId = String(row.component.properties.id);
    if (!componentsById.has(cId)) componentsById.set(cId, { id: cId, name: cName });
    const existing = byProduct.get(pid);
    if (existing) {
      existing.minHops = Math.min(existing.minHops, row.hops);
      if (!existing.affectedComponents.includes(cName)) existing.affectedComponents.push(cName);
    } else {
      byProduct.set(pid, {
        id: pid,
        name: String(row.product.properties.name),
        category: String(row.product.properties.category),
        unitsPerYear: toNumber(row.product.properties.unitsPerYear),
        minHops: row.hops,
        affectedComponents: [cName],
      });
    }
  }

  const graph = projectedPathsToGraph(rows.map((r) => r.path));
  const components = [...componentsById.values()];
  return {
    products: [...byProduct.values()].sort((a, b) => b.unitsPerYear - a.unitsPerYear),
    components,
    componentCount: components.length,
    supplierCount: graph.nodes.filter((n) => n.label === "Supplier").length,
    graph,
  };
}

// ── Single points of failure ───────────────────────────────────────────
// "Awkward in SQL": single-sourced components found by aggregating over the
// full supplier set per component, then walking the variable-depth
// sub-assembly hierarchy up to every affected product.

export interface SpofRow {
  componentId: string;
  componentName: string;
  criticality: number;
  supplierId: string;
  supplierName: string;
  regions: string[];
  regionRisk: string[];
  productsAtRisk: string[];
}

export async function spofReport(): Promise<SpofRow[]> {
  return runRead(
    `MATCH (c:Component)-[:SUPPLIED_BY]->(s:Supplier)
     WITH c, collect(DISTINCT s) AS sups
     WHERE size(sups) = 1
     WITH c, sups[0] AS sole
     OPTIONAL MATCH (c)-[:PART_OF*0..3]->(:Component)<-[:CONTAINS]-(p:Product)
     WITH c, sole, collect(DISTINCT p.name) AS products, count(DISTINCT p) AS productCount
     OPTIONAL MATCH (sole)-[:OPERATES]->(:Facility)-[:LOCATED_IN]->(r:Region)
     RETURN c.id AS componentId, c.name AS componentName, c.criticality AS criticality,
            sole.id AS supplierId, sole.name AS supplierName,
            collect(DISTINCT r.name) AS regions,
            collect(DISTINCT r.riskLevel) AS regionRisk,
            products AS productsAtRisk, productCount
     ORDER BY productCount DESC, criticality DESC`,
    {},
    (r) => ({
      componentId: String(r.componentId),
      componentName: String(r.componentName),
      criticality: toNumber(r.criticality),
      supplierId: String(r.supplierId),
      supplierName: String(r.supplierName),
      regions: (r.regions as string[]) ?? [],
      regionRisk: (r.regionRisk as string[]) ?? [],
      productsAtRisk: (r.productsAtRisk as string[]) ?? [],
    })
  );
}

// ── Alternate sourcing ─────────────────────────────────────────────────

export interface AlternateSupplier {
  supplierId: string;
  supplierName: string;
  tier: number;
  leadTimeDays: number;
  isPrimary: boolean;
}

export async function alternateSuppliers(
  componentId: string,
  excludeSupplierId: string
): Promise<AlternateSupplier[]> {
  return runRead(
    `MATCH (c:Component {id: $componentId})-[sb:SUPPLIED_BY]->(alt:Supplier)
     WHERE alt.id <> $excludeSupplierId
     RETURN alt.id AS supplierId, alt.name AS supplierName, alt.tier AS tier,
            sb.leadTimeDays AS leadTimeDays, sb.isPrimary AS isPrimary
     ORDER BY sb.leadTimeDays`,
    { componentId, excludeSupplierId },
    (r) => ({
      supplierId: String(r.supplierId),
      supplierName: String(r.supplierName),
      tier: toNumber(r.tier),
      leadTimeDays: toNumber(r.leadTimeDays),
      isPrimary: Boolean(r.isPrimary),
    })
  );
}

/**
 * "Why is product X exposed to Y?" — shortest connection between a product
 * and any node in the supply network (supplier, facility or region).
 */
export async function exposurePath(productId: string, targetId: string): Promise<Graph> {
  const rows = await runRead(
    `MATCH (p:Product {id: $productId}), (t {id: $targetId})
     MATCH path = shortestPath(
       (p)-[:CONTAINS|PART_OF|SUPPLIED_BY|SOURCES_FROM|OPERATES|LOCATED_IN*..12]-(t)
     )
     RETURN ${PATH_PROJECTION}`,
    { productId, targetId },
    (r) => ({ pathNodes: r.pathNodes, relTypes: r.relTypes }) as ProjectedPath
  );
  return projectedPathsToGraph(rows);
}

// ── Co-vulnerability ───────────────────────────────────────────────────

export interface CoVulnerablePair {
  productA: string;
  productB: string;
  sharedSuppliers: number;
  examples: string[];
}

export async function coVulnerablePairs(limit = 10): Promise<CoVulnerablePair[]> {
  return runRead(
    `MATCH (p1:Product)-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(:Component)-[:SUPPLIED_BY]->(s:Supplier),
           (p2:Product)-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(:Component)-[:SUPPLIED_BY]->(s)
     WHERE p1.id < p2.id
     WITH p1, p2, count(DISTINCT s) AS sharedSuppliers, collect(DISTINCT s.name) AS names
     RETURN p1.name AS productA, p2.name AS productB, sharedSuppliers,
            names[0..4] AS examples
     ORDER BY sharedSuppliers DESC
     LIMIT $limit`,
    { limit: Math.trunc(limit) },
    (r) => ({
      productA: String(r.productA),
      productB: String(r.productB),
      sharedSuppliers: toNumber(r.sharedSuppliers),
      examples: (r.examples as string[]) ?? [],
    })
  );
}

// ── Product detail ─────────────────────────────────────────────────────

export interface RegionExposure {
  regionId: string;
  regionName: string;
  riskLevel: string;
  riskScore: number;
  exposedComponents: number;
  totalComponents: number;
}

export async function regionExposure(productId: string): Promise<RegionExposure[]> {
  return runRead(
    `MATCH (p:Product {id: $productId})-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(c:Component)
     WITH p, collect(DISTINCT c) AS comps
     UNWIND comps AS c
     MATCH (c)-[:SUPPLIED_BY]->(:Supplier)-[:SOURCES_FROM*0..4]->(s:Supplier),
           (s)-[:OPERATES]->(:Facility)-[:LOCATED_IN]->(r:Region)
     RETURN r.id AS regionId, r.name AS regionName, r.riskLevel AS riskLevel,
            r.riskScore AS riskScore,
            count(DISTINCT c) AS exposedComponents,
            size(comps) AS totalComponents
     ORDER BY r.riskScore DESC, exposedComponents DESC`,
    { productId },
    (r) => ({
      regionId: String(r.regionId),
      regionName: String(r.regionName),
      riskLevel: String(r.riskLevel),
      riskScore: toNumber(r.riskScore),
      exposedComponents: toNumber(r.exposedComponents),
      totalComponents: toNumber(r.totalComponents),
    })
  );
}

export interface SupplierRegion {
  supplierId: string;
  regionId: string;
  regionName: string;
  riskLevel: string;
}

/**
 * Which region each supplier in a product's chain operates out of — the
 * *0..4 hop covers both the directly-contracted supplier (*0) and every
 * upstream origin it sources from.
 */
export async function supplierRegions(productId: string): Promise<SupplierRegion[]> {
  return runRead(
    `MATCH (p:Product {id: $productId})-[:CONTAINS]->(:Component)<-[:PART_OF*0..3]-(:Component)-[:SUPPLIED_BY]->(:Supplier)-[:SOURCES_FROM*0..4]->(s:Supplier),
           (s)-[:OPERATES]->(:Facility)-[:LOCATED_IN]->(r:Region)
     RETURN DISTINCT s.id AS supplierId, r.id AS regionId, r.name AS regionName,
            r.riskLevel AS riskLevel
     LIMIT 600`,
    { productId },
    (r) => ({
      supplierId: String(r.supplierId),
      regionId: String(r.regionId),
      regionName: String(r.regionName),
      riskLevel: String(r.riskLevel),
    })
  );
}

export interface ProductDetail {
  id: string;
  name: string;
  category: string;
  unitsPerYear: number;
  graph: Graph;
  exposure: RegionExposure[];
}

export async function productDetail(productId: string): Promise<ProductDetail | null> {
  const header = await runRead(
    `MATCH (p:Product {id: $productId})
     RETURN p.id AS id, p.name AS name, p.category AS category, p.unitsPerYear AS unitsPerYear`,
    { productId },
    (r) => ({
      id: String(r.id),
      name: String(r.name),
      category: String(r.category),
      unitsPerYear: toNumber(r.unitsPerYear),
    })
  );
  if (header.length === 0) return null;

  const paths = await runRead(
    `MATCH (p:Product {id: $productId})
     MATCH lg1 = (p)-[:CONTAINS]->(top:Component)
     MATCH lg2 = (top)<-[:PART_OF*0..3]-(c:Component)
     MATCH lg3 = (c)-[:SUPPLIED_BY]->(s:Supplier)
     MATCH lg4 = (s)-[:SOURCES_FROM*0..4]->(:Supplier)
     RETURN ${[1, 2, 3, 4].map((i) => projectLeg(`lg${i}`, i)).join(", ")}
     LIMIT 800`,
    { productId },
    (r) => stitchLegs(r, 4)
  );
  const exposure = await regionExposure(productId);
  return { ...header[0], graph: projectedPathsToGraph(paths), exposure };
}
