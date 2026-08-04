import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { getDriver } from "../lib/db";
import {
  blastRadius,
  spofReport,
  alternateSuppliers,
  exposurePath,
  coVulnerablePairs,
  regionExposure,
  productDetail,
  listProducts,
  worstSuppliersByOnTime,
  listDisruptionTargets,
  getOverview,
} from "../lib/queries";

async function main() {
  console.log("— overview —");
  console.log(await getOverview());

  console.log("\n— blastRadius(supplier, s-grindwell) [sole cocoa processor] —");
  const br = await blastRadius("supplier", "s-grindwell");
  console.log(`products impacted: ${br.products.length}, components: ${br.componentCount}, suppliers in graph: ${br.supplierCount}, graph nodes/links: ${br.graph.nodes.length}/${br.graph.links.length}`);
  console.log(br.products.map((p) => `${p.name} (minHops ${p.minHops})`).join("; "));

  console.log("\n— blastRadius(region, r-mg) [Madagascar vanilla] —");
  const br2 = await blastRadius("region", "r-mg");
  console.log(`products impacted: ${br2.products.length}`);
  console.log(br2.products.map((p) => p.name).join("; "));

  console.log("\n— blastRadius(facility, f-blacksea-odesa) [Ukraine sunseed crusher] —");
  const br3 = await blastRadius("facility", "f-blacksea-odesa");
  console.log(`products impacted: ${br3.products.length}: ${br3.products.map((p) => p.name).join("; ")}`);

  console.log("\n— spofReport (top 5) —");
  const spof = await spofReport();
  for (const row of spof.slice(0, 5)) {
    console.log(`${row.componentName} ← ${row.supplierName} [${row.regions.join(",")}] → ${row.productsAtRisk.length} products`);
  }
  console.log(`total SPOF components: ${spof.length}`);

  console.log("\n— alternateSuppliers(c-sugar, excluding s-dolcezucar) —");
  console.log(await alternateSuppliers("c-sugar", "s-dolcezucar"));

  console.log("\n— exposurePath(p-bar-dark70 → r-ci) [why is the Midnight Dark Bar exposed to Côte d'Ivoire?] —");
  const ep = await exposurePath("p-bar-dark70", "r-ci");
  console.log(`path nodes: ${ep.nodes.map((n) => `${n.label}:${n.name}`).join(" → ")}`);

  console.log("\n— coVulnerablePairs (top 5) —");
  for (const p of (await coVulnerablePairs(5))) {
    console.log(`${p.productA} × ${p.productB}: ${p.sharedSuppliers} shared (${p.examples.join(", ")})`);
  }

  console.log("\n— regionExposure(p-bar-dark70) —");
  for (const r of await regionExposure("p-bar-dark70")) {
    console.log(`${r.regionName} [${r.riskLevel}]: ${r.exposedComponents}/${r.totalComponents}`);
  }

  console.log("\n— productDetail(p-bar-dark70) graph size —");
  const pd = await productDetail("p-bar-dark70");
  console.log(`nodes: ${pd?.graph.nodes.length}, links: ${pd?.graph.links.length}, exposure rows: ${pd?.exposure.length}`);

  console.log("\n— listProducts (first 3) —");
  console.log((await listProducts()).slice(0, 3));

  console.log("\n— worstSuppliersByOnTime (top 3) —");
  console.log(await worstSuppliersByOnTime(3));

  console.log("\n— listDisruptionTargets count —");
  console.log((await listDisruptionTargets()).length);
}

main()
  .then(() => getDriver().close())
  .catch(async (e) => {
    console.error("VERIFY FAILED:", e);
    process.exitCode = 1;
    await getDriver().close().catch(() => {});
  });
