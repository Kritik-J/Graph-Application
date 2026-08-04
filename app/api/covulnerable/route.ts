import { handleDbErrors } from "@/lib/api-utils";
import { coVulnerablePairs } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 4;

export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), 50) : DEFAULT_LIMIT;
  return handleDbErrors(() => coVulnerablePairs(limit));
}
