import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 max-w-lg border-2 border-divider bg-white p-8">
      <div className="rp-micro-accent">404</div>
      <h2 className="mt-2 text-[26px] leading-tight font-extrabold">Node not found</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-n-600">
        Nothing in the graph matches this address.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block bg-accent px-5 py-2.5 text-[11px] font-extrabold tracking-[0.1em] text-white uppercase transition-colors hover:bg-accent-700"
      >
        Back to the explorer
      </Link>
    </div>
  );
}
