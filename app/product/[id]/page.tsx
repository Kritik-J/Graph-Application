import Link from "next/link";
import { notFound } from "next/navigation";
import { ExposureTrace } from "@/components/ExposureTrace";
import { RippleCanvas } from "@/components/RippleCanvas";
import { DbDownState, fmtCompact } from "@/components/ui";
import { DbUnreachableError } from "@/lib/errors";
import { productDetail, type ProductDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product: ProductDetail | null;
  try {
    product = await productDetail(id);
  } catch (err) {
    if (err instanceof DbUnreachableError) return <DbDownState />;
    throw err;
  }
  if (!product) notFound();

  const { graph, exposure } = product;
  const componentCount =
    exposure[0]?.totalComponents ?? graph.nodes.filter((n) => n.label === "Component").length;
  const supplierCount = graph.nodes.filter((n) => n.label === "Supplier").length;
  const highRiskRegions = exposure.filter((e) => e.riskLevel === "high").length;

  const stats = [
    { label: "Components in BOM", value: componentCount, hot: false },
    { label: "Suppliers touched", value: supplierCount, hot: false },
    { label: "Regions touched", value: exposure.length, hot: false },
    { label: "High-risk regions", value: highRiskRegions, hot: highRiskRegions > 0 },
  ];

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <Link
        href="/"
        className="rp-micro inline-block transition-colors hover:text-accent"
      >
        ← Explorer
      </Link>

      <header className="rp-in mt-3 mb-8 max-w-3xl">
        <div className="rp-micro-accent">Product exposure</div>
        <h1 className="mt-2 text-[34px] leading-[1.05] font-extrabold tracking-[-0.02em] lg:text-[40px]">
          {product.name}
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-n-600">
          {product.category} · {fmtCompact.format(product.unitsPerYear)}{" "}
          units/yr — every component, supplier tier and region this product&apos;s supply chain
          touches.
        </p>
      </header>

      <div className="rp-in grid grid-cols-2 gap-px border border-divider bg-divider lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-4 py-3.5">
            <div className="rp-micro">{s.label}</div>
            <div
              className={`mt-1.5 text-[30px] leading-none font-extrabold ${
                s.hot ? "text-accent" : ""
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="flex min-h-[520px] flex-col border-2 border-divider bg-white lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-divider px-4 py-3">
            <h2 className="text-[13px] font-extrabold tracking-[0.02em] uppercase">Supply tree</h2>
            <span className="rp-micro">Drag to pan · scroll to zoom</span>
          </div>
          <RippleCanvas productId={product.id} readOnly />
          <p className="border-t border-divider px-4 py-3 text-[11.5px] leading-relaxed text-n-500">
            Take any supplier here into the{" "}
            <Link href="/" className="text-accent underline underline-offset-4">
              explorer
            </Link>{" "}
            to knock it out and watch the failure propagate.
          </p>
        </section>

        <ExposureTrace productId={product.id} exposure={exposure} />
      </div>

      <p className="rp-micro mt-6">Ambrosia Foods · fictional dataset · CognoDB Cloud</p>
    </div>
  );
}
