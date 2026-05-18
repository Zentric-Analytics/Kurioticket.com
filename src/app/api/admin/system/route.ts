import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin";
import { getSafeSystemStatus } from "@/lib/admin-data";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ system: await getSafeSystemStatus() });
}
