import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { getUnreadNotificationCount } from "@/services/notificationService";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ count: await getUnreadNotificationCount(session.user.id) });
}
