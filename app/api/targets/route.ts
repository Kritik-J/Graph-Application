import { handleDbErrors } from "@/lib/api-utils";
import { listDisruptionTargets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleDbErrors(() => listDisruptionTargets());
}
