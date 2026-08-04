"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "up" | "down";

export function HealthDot() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) setStatus(res.ok ? "up" : "down");
      } catch {
        if (!cancelled) setStatus("down");
      }
    };
    check();
    const t = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const dot = status === "up" ? "bg-ok" : status === "down" ? "bg-accent" : "bg-n-300";
  const label = status === "up" ? "live" : status === "down" ? "unreachable" : "checking";

  return (
    <span
      className="flex items-center gap-1.5 border border-divider bg-white px-2 py-1"
      title={`CognoDB · ${label}`}
    >
      <span className={`h-[6px] w-[6px] ${dot} ${status === "checking" ? "rp-pulse" : ""}`} />
      <span className="rp-micro">CognoDB {label}</span>
    </span>
  );
}
