/**
 * Idempotent seed script for Ripple.
 *
 *   npm run seed          # merge the dataset into whatever is already there
 *   npm run seed:reset    # wipe the graph first, then seed
 *
 * Creates constraints/indexes, then MERGEs all nodes and relationships, so
 * re-running never duplicates data. Also generates ~18 months of monthly
 * shipment history per component–supplier pair with a seeded PRNG, so every
 * run produces the identical dataset.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { getDriver, toNumber } from "../lib/db";
import { components, products, regions, suppliers } from "./seed-data";

// Deterministic PRNG (mulberry32) so shipment history is reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHIPMENT_MONTHS = 18;
const BASE_YEAR = 2026;
const BASE_MONTH = 7; // July 2026 = most recent shipment month

interface ShipmentRow {
  id: string;
  supplierId: string;
  componentId: string;
  date: string; // ISO yyyy-mm-dd
  quantity: number;
  onTime: boolean;
}

function buildShipments(): ShipmentRow[] {
  const rand = mulberry32(42);
  const reliabilityBySupplier = new Map(suppliers.map((s) => [s.id, s.reliability]));
  const rows: ShipmentRow[] = [];
  for (const c of components) {
    for (const link of c.suppliedBy) {
      const reliability = reliabilityBySupplier.get(link.supplierId) ?? 0.9;
      for (let i = 0; i < SHIPMENT_MONTHS; i++) {
        const monthsBack = SHIPMENT_MONTHS - 1 - i;
        const totalMonths = BASE_YEAR * 12 + (BASE_MONTH - 1) - monthsBack;
        const year = Math.floor(totalMonths / 12);
        const month = (totalMonths % 12) + 1;
        const day = 1 + Math.floor(rand() * 27);
        rows.push({
          id: `sh-${c.id}-${link.supplierId}-${i}`,
          supplierId: link.supplierId,
          componentId: c.id,
          date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          quantity: 1_000 + Math.floor(rand() * 9_000),
          onTime: rand() < reliability,
        });
      }
    }
  }
  return rows;
}

async function run(cypher: string, params: Record<string, unknown> = {}) {
  const session = getDriver().session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

async function runBatched(cypher: string, rows: unknown[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    await run(cypher, { rows: rows.slice(i, i + batchSize) });
  }
}

/**
 * Wipe every node (and its relationships) in capped batches. CognoDB rejects
 * an unbounded `MATCH (n) DETACH DELETE n` on a graph this size, so we delete
 * a slice at a time and re-count until nothing is left.
 */
async function resetGraph(batchSize = 5_000) {
  const countRemaining = async () => {
    const res = await run(`MATCH (n) RETURN count(n) AS count`);
    return toNumber(res.records[0].get("count"));
  };

  let remaining = await countRemaining();
  console.log(`Reset → ${remaining} existing nodes to delete`);
  while (remaining > 0) {
    await run(`MATCH (n) WITH n LIMIT $batchSize DETACH DELETE n`, { batchSize });
    const before = remaining;
    remaining = await countRemaining();
    if (remaining >= before) {
      throw new Error(`Reset stalled with ${remaining} nodes remaining`);
    }
    console.log(`  deleted ${before - remaining}, ${remaining} remaining`);
  }
  console.log("Reset → graph is empty");
}

async function main() {
  const started = Date.now();
  const reset = process.argv.includes("--reset");
  console.log(`Ripple seed${reset ? " (--reset)" : ""} → connecting…`);
  await getDriver().verifyConnectivity();

  if (reset) await resetGraph();

  console.log("Creating constraints & indexes…");
  for (const label of ["Product", "Component", "Supplier", "Facility", "Region", "Shipment"]) {
    await run(`CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`);
  }
  await run(`CREATE INDEX IF NOT EXISTS FOR (s:Supplier) ON (s.tier)`);
  await run(`CREATE INDEX IF NOT EXISTS FOR (c:Component) ON (c.name)`);

  console.log("Merging nodes…");
  await runBatched(
    `UNWIND $rows AS row
     MERGE (n:Region {id: row.id})
     SET n.name = row.name, n.riskLevel = row.riskLevel, n.riskScore = row.riskScore`,
    regions
  );
  await runBatched(
    `UNWIND $rows AS row
     MERGE (n:Supplier {id: row.id})
     SET n.name = row.name, n.tier = row.tier, n.reliability = row.reliability`,
    suppliers.map(({ id, name, tier, reliability }) => ({ id, name, tier, reliability }))
  );
  await runBatched(
    `UNWIND $rows AS row
     MERGE (n:Facility {id: row.id})
     SET n.name = row.name, n.type = row.type`,
    suppliers.flatMap((s) => s.facilities.map(({ id, name, type }) => ({ id, name, type })))
  );
  await runBatched(
    `UNWIND $rows AS row
     MERGE (n:Component {id: row.id})
     SET n.name = row.name, n.category = row.category, n.criticality = row.criticality`,
    components.map(({ id, name, category, criticality }) => ({ id, name, category, criticality }))
  );
  await runBatched(
    `UNWIND $rows AS row
     MERGE (n:Product {id: row.id})
     SET n.name = row.name, n.category = row.category, n.unitsPerYear = row.unitsPerYear`,
    products.map(({ id, name, category, unitsPerYear }) => ({ id, name, category, unitsPerYear }))
  );

  console.log("Merging relationships…");
  await runBatched(
    `UNWIND $rows AS row
     MATCH (s:Supplier {id: row.supplierId}), (f:Facility {id: row.facilityId})
     MERGE (s)-[:OPERATES]->(f)`,
    suppliers.flatMap((s) => s.facilities.map((f) => ({ supplierId: s.id, facilityId: f.id })))
  );
  await runBatched(
    `UNWIND $rows AS row
     MATCH (f:Facility {id: row.facilityId}), (r:Region {id: row.regionId})
     MERGE (f)-[:LOCATED_IN]->(r)`,
    suppliers.flatMap((s) => s.facilities.map((f) => ({ facilityId: f.id, regionId: f.regionId })))
  );
  await runBatched(
    `UNWIND $rows AS row
     MATCH (a:Supplier {id: row.fromId}), (b:Supplier {id: row.toId})
     MERGE (a)-[:SOURCES_FROM]->(b)`,
    suppliers.flatMap((s) => s.sourcesFrom.map((toId) => ({ fromId: s.id, toId })))
  );
  await runBatched(
    `UNWIND $rows AS row
     MATCH (c:Component {id: row.componentId}), (s:Supplier {id: row.supplierId})
     MERGE (c)-[rel:SUPPLIED_BY]->(s)
     SET rel.leadTimeDays = row.leadTimeDays, rel.isPrimary = row.isPrimary`,
    components.flatMap((c) => c.suppliedBy.map((l) => ({ componentId: c.id, ...l })))
  );
  await runBatched(
    `UNWIND $rows AS row
     MATCH (child:Component {id: row.childId}), (parent:Component {id: row.parentId})
     MERGE (child)-[:PART_OF]->(parent)`,
    components.flatMap((c) => c.partOf.map((parentId) => ({ childId: c.id, parentId })))
  );
  await runBatched(
    `UNWIND $rows AS row
     MATCH (p:Product {id: row.productId}), (c:Component {id: row.componentId})
     MERGE (p)-[rel:CONTAINS]->(c)
     SET rel.quantity = row.quantity`,
    products.flatMap((p) => p.contains.map((b) => ({ productId: p.id, ...b })))
  );

  const shipments = buildShipments();
  console.log(`Merging ${shipments.length} shipments…`);
  await runBatched(
    `UNWIND $rows AS row
     MATCH (s:Supplier {id: row.supplierId}), (c:Component {id: row.componentId})
     MERGE (sh:Shipment {id: row.id})
     SET sh.date = row.date, sh.quantity = row.quantity, sh.onTime = row.onTime
     MERGE (s)-[:SHIPPED]->(sh)
     MERGE (sh)-[:OF]->(c)`,
    shipments,
    250
  );

  const nodeCounts = await run(
    `MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS count ORDER BY label`
  );
  const relCount = await run(`MATCH ()-[r]->() RETURN count(r) AS count`);
  console.log("\nSeed complete:");
  for (const rec of nodeCounts.records) {
    console.log(`  ${rec.get("label")}: ${rec.get("count")}`);
  }
  console.log(`  relationships: ${relCount.records[0].get("count")}`);
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .then(() => getDriver().close())
  .catch(async (err) => {
    console.error("\nSeed failed:", err instanceof Error ? err.message : err);
    console.error(
      "Check that NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD are set in .env.local and the instance is running."
    );
    process.exitCode = 1;
    await getDriver().close().catch(() => {});
  });
