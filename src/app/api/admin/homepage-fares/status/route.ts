import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";
import { readHomepageFareSnapshotStatus } from "@/services/homepageFareSnapshotService";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;

  const status = await readHomepageFareSnapshotStatus();

  return NextResponse.json(status);
}
