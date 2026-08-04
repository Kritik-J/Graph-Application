"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ripple] runtime fault", error);
  }, [error]);

  return (
    <div className="mx-auto mt-20 max-w-lg border-2 border-accent bg-white p-8">
      <div className="rp-micro-accent">Runtime fault</div>
      <h2 className="mt-2 text-[26px] leading-tight font-extrabold">
        Something broke mid-traversal
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-n-600">
        {error.message || "An unexpected error interrupted this view."}
      </p>
      {error.digest ? <p className="rp-micro mt-2">Digest {error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-block bg-accent px-5 py-2.5 text-[11px] font-extrabold tracking-[0.1em] text-white uppercase transition-colors hover:bg-accent-700"
      >
        Retry
      </button>
    </div>
  );
}
