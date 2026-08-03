import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await checkHealth();
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}
