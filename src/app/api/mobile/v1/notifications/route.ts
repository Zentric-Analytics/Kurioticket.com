import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { InvalidNotificationCursorError, listNotifications, markAllNotificationsRead } from "@/services/notificationService";

async function userId(request: Request) {
  const session = await getMobileSession(request);
  return session?.user.status === "ACTIVE" ? session.user.id : null;
}

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") || undefined;
  const requestedLimit = url.searchParams.get("limit");
  const limit = requestedLimit ? Number(requestedLimit) : undefined;
  if ((cursor && !/^[a-z0-9_-]{10,}$/i.test(cursor)) || (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50))) {
    return NextResponse.json({ error: "Invalid pagination parameters." }, { status: 400 });
  }
  try { return NextResponse.json(await listNotifications(id, { cursor, limit })); }
  catch (error) { if (error instanceof InvalidNotificationCursorError) return NextResponse.json({ error: "Invalid pagination cursor." }, { status: 400 }); return NextResponse.json({ error: "Unable to load notifications." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const result = await markAllNotificationsRead(id);
  return NextResponse.json({ updated: result.count });
}
