import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { reactivateAccount } from "@/services/accountDeletionService";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const request = await reactivateAccount(userId, email);
    return NextResponse.json({ success: true, request: { id: request.id, status: request.status, cancelledAt: request.cancelledAt?.toISOString() || null } });
  } catch (error) {
    console.error("[account-security-deletion-request:reactivate]", error);
    const message = error instanceof Error && error.message === "GracePeriodExpired" ? "The 7-day reactivation window has expired. Contact support." : "Unable to reactivate account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
