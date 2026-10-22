import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin";
import {
  currentReferralAttributionEnvironment,
  getReferralAttributionSummary,
  parseAttributionDays,
} from "@/services/referralAttributionService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const days = parseAttributionDays(new URL(request.url).searchParams.get("days"));
  if (days === null) {
    return NextResponse.json({ error: "days must be an integer between 1 and 90." }, { status: 400 });
  }

  return NextResponse.json(
    await getReferralAttributionSummary(days, currentReferralAttributionEnvironment()),
  );
}
