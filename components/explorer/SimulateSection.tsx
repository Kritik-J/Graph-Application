"use client";

import { EVENT_TYPES, type EventType } from "./types";
import { Section } from "./Section";

export function SimulateSection({
  armedKind,
  armedName,
  armedMeta,
  eventType,
  simRunning,
  onEventType,
  onSimulate,
  onReset,
}: {
  armedKind: "supplier" | "region" | null;
  armedName: string;
  armedMeta: string | null;
  eventType: EventType;
  simRunning: boolean;
  onEventType: (t: EventType) => void;
  onSimulate: () => void;
  onReset: () => void;
}) {
  return (
    <Section number="02" title="Simulate disruption">
      {armedKind ? (
        <div className="border border-divider bg-surface p-3">
          <div className="rp-micro-accent">{armedKind === "region" ? "Region" : "Supplier"}</div>
          <p className="mt-1 text-[14px] leading-tight font-extrabold">{armedName}</p>
          {armedMeta ? <p className="mt-1 text-[11px] text-n-500">{armedMeta}</p> : null}
        </div>
      ) : (
        <div className="border border-dashed border-n-300 px-3 py-4">
          <p className="text-[11.5px] leading-relaxed text-n-500">
            Click any origin, processor or region tag on the canvas to arm a disruption.
          </p>
        </div>
      )}

      <div className="mt-4">
        <div className="rp-micro">Event type</div>
        <div role="radiogroup" aria-label="Event type" className="mt-1.5 flex border border-divider">
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={eventType === t}
              onClick={() => onEventType(t)}
              className={`flex-1 border-divider py-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors not-first:border-l ${
                eventType === t ? "bg-accent text-white" : "bg-white text-n-600 hover:bg-surface"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!armedKind || simRunning}
        onClick={onSimulate}
        className="mt-3 w-full bg-accent py-2.5 text-[12px] font-extrabold tracking-[0.08em] text-white uppercase transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:bg-n-300"
      >
        {simRunning ? "Simulating…" : "Simulate disruption"}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="mt-1.5 w-full border border-divider bg-white py-2 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-surface"
      >
        Reset view
      </button>
    </Section>
  );
}
