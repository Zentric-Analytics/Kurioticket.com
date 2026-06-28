import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { listUserSessionActivities } from "@/lib/sessionActivity";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const result = await listUserSessionActivities({ userId, request });
    return NextResponse.json({
      ...result,
      revocationMode: "record-only",
      notice: "Kurioticket uses JWT sessions, so removing a device record does not instantly invalidate an already-issued sign-in token.",
    });
  } catch (error) {
    console.error("[account-security-sessions:get]", error);
    return NextResponse.json({ error: "Unable to load active sessions." }, { status: 500 });
  }
}
