import type { ArmTarget } from "@/components/RippleCanvas";

export const EVENT_TYPES = ["Fire", "Sanction", "Closure"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** What was actually simulated — survives the armed target changing. */
export interface SimTarget {
  id: string;
  name: string;
  eventType: EventType;
}

/** "s-grindwell" → "Grindwell", a stand-in until the real name arrives. */
export function prettyId(id: string) {
  const tail = id.replace(/^[a-z]-/, "").replace(/-/g, " ");
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

/** Parses the /spof deep link, "supplier:s-grindwell" or "region:r-ci". */
export function parseArm(raw: string | null): ArmTarget | null {
  if (!raw) return null;
  const [kind, ...rest] = raw.split(":");
  const id = rest.join(":");
  if ((kind !== "supplier" && kind !== "region") || !id) return null;
  return { kind, id, name: prettyId(id) };
}
