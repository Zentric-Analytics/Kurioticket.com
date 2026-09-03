import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { deleteNotification, markNotificationRead } from "@/services/notificationService";

type Session = { user: { id: string; status: string } } | null;
type Dependencies = { session: (request: Request) => Promise<Session>; markRead: typeof markNotificationRead; remove: typeof deleteNotification };

export function createNotificationItemHandlers(deps: Dependencies = { session: getMobileSession, markRead: markNotificationRead, remove: deleteNotification }) {
  async function authenticatedId(request: Request) {
    const session = await deps.session(request);
    return session?.user.status === "ACTIVE" ? session.user.id : null;
  }
  async function notificationId(context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    return /^[a-z0-9_-]{10,}$/i.test(id) ? id : null;
  }
  return {
    PATCH: async (request: Request, context: { params: Promise<{ id: string }> }) => {
      const userId = await authenticatedId(request);
      if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const id = await notificationId(context);
      if (!id) return NextResponse.json({ error: "Invalid notification ID." }, { status: 400 });
      const result = await deps.markRead(userId, id);
      if (!result.notification) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
      return NextResponse.json({ notification: result.notification, changed: result.changed });
    },
    DELETE: async (request: Request, context: { params: Promise<{ id: string }> }) => {
      const userId = await authenticatedId(request);
      if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const id = await notificationId(context);
      if (!id) return NextResponse.json({ error: "Invalid notification ID." }, { status: 400 });
      const result = await deps.remove(userId, id);
      if (!result.found) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
      return NextResponse.json({ deleted: true, changed: result.deleted });
    },
  };
}

const handlers = createNotificationItemHandlers();
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
