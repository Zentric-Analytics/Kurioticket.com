import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { revokeAllSessions } from "@/lib/account-session";
import { deliverSecurityEvent } from "@/services/securityEventService";
export async function POST() {
  const auth = await requireWebApiSession();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const event = await revokeAllSessions(auth.userId);
  await deliverSecurityEvent({ userId: auth.userId, email: auth.session.user.email, securityEventId: event.id, title: "Signed out everywhere", body: "All devices were signed out of your Kurioticket account. If this wasn’t you, reset your password immediately." });
  return NextResponse.json({ ok: true });
}
