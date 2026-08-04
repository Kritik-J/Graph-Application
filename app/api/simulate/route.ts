import { NextResponse } from "next/server";
import { handleDbErrors, type Mitigation, type SimulateResponse } from "@/lib/api-utils";
import { alternateSuppliers, blastRadius, type DisruptionType } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TYPES: DisruptionType[] = ["supplier", "facility", "region"];

/** Cap the fan-out of second-source lookups so one drill stays cheap. */
const MITIGATION_LOOKUP_LIMIT = 12;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const id = params.get("id");

  if (!type || !TYPES.includes(type as DisruptionType)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  return handleDbErrors(async (): Promise<SimulateResponse> => {
    const result = await blastRadius(type as DisruptionType, id);

    // Only a failing supplier has a like-for-like substitute; losing a
    // facility or a whole region is not solved by re-sourcing one part.
    let mitigations: Mitigation[] = [];
    if (type === "supplier") {
      const candidates = result.components.slice(0, MITIGATION_LOOKUP_LIMIT);
      const found = await Promise.all(
        candidates.map(async (c) => ({
          componentId: c.id,
          componentName: c.name,
          alternates: await alternateSuppliers(c.id, id),
        }))
      );
      mitigations = found.filter((m) => m.alternates.length > 0);
    }

    return { ...result, mitigations };
  });
}
