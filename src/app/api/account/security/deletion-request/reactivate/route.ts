import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { reactivateAccount } from "@/services/accountDeletionService";
import { getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Same-site cookies alone are not a substitute for same-origin intent.
  if (request.headers.get("origin") !== new URL(getBaseUrl()).origin) {
    return NextResponse.json({ error: "Unable to authorize account recovery." }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const sessionId = session?.user?.accountSessionId;
  if (!userId || !email || !sessionId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (session.user.status !== "PENDING_DELETION" || !session.user.emailVerified) {
    return NextResponse.json({ error: "Unable to authorize account recovery." }, { status: 403 });
  }
  try {
    const recovered = await reactivateAccount(userId, email, sessionId);
    return NextResponse.json({ success: true, request: { id: recovered.id, status: recovered.status, cancelledAt: recovered.cancelledAt?.toISOString() || null } });
  } catch (error) {
    const rejected = error instanceof Error && ["NoPendingRequest", "GracePeriodExpired", "AccountUnavailable", "RecoveryAuthorizationRequired"].includes(error.message);
    return NextResponse.json({ error: "Unable to authorize account recovery." }, { status: rejected ? 403 : 503 });
  }
}
