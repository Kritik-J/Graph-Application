"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Explorer" },
  { href: "/spof", label: "Failure points" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[10px] tracking-[0.1em] uppercase transition-colors ${
              active ? "font-extrabold text-ink" : "font-semibold text-n-500 hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
