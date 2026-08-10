import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getTwoFactorStatus } from "@/services/twoFactorService";

export const runtime = "nodejs";

export async function GET() {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json({ twoFactor: await getTwoFactorStatus(userId) });
}
