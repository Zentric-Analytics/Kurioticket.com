import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { markNotificationRead } from "@/services/notificationService";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[a-z0-9_-]{10,}$/i.test(id)) return NextResponse.json({ error: "Invalid notification ID." }, { status: 400 });
  const result = await markNotificationRead(session.user.id, id);
  if (!result.notification) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ notification: result.notification, changed: result.changed });
}
