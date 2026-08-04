import { handleDbErrors } from "@/lib/api-utils";
import { spofReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 6;

/** spofReport() already sorts by products-at-risk; ?limit trims the head. */
export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), 100) : DEFAULT_LIMIT;
  return handleDbErrors(async () => (await spofReport()).slice(0, limit));
}
