import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { revokeCurrentUserSessionActivity } from "@/lib/sessionActivity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const result = await revokeCurrentUserSessionActivity({ userId, request });
    return NextResponse.json({ ok: true, ...result, revocationMode: "record-only" });
  } catch (error) {
    console.error("[account-security-sessions-current:revoke]", error);
    return NextResponse.json({ error: "Unable to mark current session as signed out." }, { status: 500 });
  }
}
