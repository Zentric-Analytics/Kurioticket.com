import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { sendOptionalEmail, sendTransactionalEmail } from "@/services/emailService";
import type { OptionalEmailCategory } from "@/services/emailPreferencesService";

export type CanonicalNotificationType = "PRICE_ALERT" | "ROUTE_WATCH" | "TRIP_REMINDER" | "SUPPORT_UPDATE" | "ACCOUNT_UPDATE" | "SECURITY_UPDATE" | "SYSTEM" | "TRAVEL_INSIGHT";
export type NotificationActionPath = "/price-alerts" | "/saved" | "/settings" | "/personal-information";
export type NotificationEmail = { kind: "none" } | { kind: "optional"; category: OptionalEmailCategory; to: string } | { kind: "transactional"; to: string };

const allowedActionPaths = new Set<NotificationActionPath>(["/price-alerts", "/saved", "/settings", "/personal-information"]);
const mobileNotificationSelect = { id: true, type: true, title: true, body: true, actionPath: true, metadata: true, readAt: true, createdAt: true } as const;
let notificationPrismaForTesting: ReturnType<typeof getPrisma> | null = null;
function notificationDb() { return notificationPrismaForTesting ?? getPrisma(); }

export function validateNotificationActionPath(value: string | null | undefined): NotificationActionPath | null {
  if (!value) return null;
  return allowedActionPaths.has(value as NotificationActionPath) ? value as NotificationActionPath : null;
}

export function escapeNotificationHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function createNotificationEvent(input: {
  userId: string; eventKey: string; title: string; body: string; type: CanonicalNotificationType;
  actionPath?: NotificationActionPath | null; metadata?: Record<string, unknown>; email?: NotificationEmail;
}) {
  if (!input.eventKey.trim()) throw new Error("Notification eventKey is required.");
  const actionPath = validateNotificationActionPath(input.actionPath);
  if (input.actionPath && !actionPath) throw new Error("Unsafe notification action path.");
  let notification;
  try {
    notification = await notificationDb().notification.create({ data: { userId: input.userId, eventKey: input.eventKey, type: input.type, channel: "IN_APP", title: input.title, body: input.body, actionPath, metadata: input.metadata as Prisma.InputJsonValue | undefined } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await notificationDb().notification.findUnique({ where: { eventKey: input.eventKey } });
      if (existing?.userId === input.userId) return { notification: existing, created: false, email: { skipped: true, reason: "duplicate_event" } as const };
    }
    throw error;
  }

  const email = input.email ?? { kind: "none" as const };
  if (email.kind === "none") return { notification, created: true, email: { skipped: true, reason: "not_requested" } as const };
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1>${escapeNotificationHtml(input.title)}</h1><p>${escapeNotificationHtml(input.body)}</p></div>`;
  const common = { to: email.to, subject: input.title, html, template: "notification" as const, idempotencyKey: `notification:${input.eventKey}:email`, metadata: { notificationId: notification.id, eventKey: input.eventKey, notificationType: input.type, ...input.metadata } };
  try {
    const result = email.kind === "optional"
      ? await sendOptionalEmail({ ...common, userId: input.userId, category: email.category })
      : await sendTransactionalEmail(common);
    return { notification, created: true, email: result };
  } catch (error) {
    console.error("[notification:email-failed]", { notificationId: notification.id, eventKey: input.eventKey, type: input.type, message: error instanceof Error ? error.message : "email_failed" });
    return { notification, created: true, email: { skipped: true, reason: "delivery_failed" } as const };
  }
}

export async function listNotifications(userId: string, input: { cursor?: string; limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  if (input.cursor && !await notificationDb().notification.findFirst({ where: { id: input.cursor, userId }, select: { id: true } })) throw new InvalidNotificationCursorError();
  const rows = await notificationDb().notification.findMany({ where: { userId }, select: mobileNotificationSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}) });
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(serializeMobileNotification);
  return { items, nextCursor: hasMore ? items.at(-1)!.id : null };
}

export async function getUnreadNotificationCount(userId: string) { return notificationDb().notification.count({ where: { userId, readAt: null } }); }
export async function markNotificationRead(userId: string, id: string) {
  const result = await notificationDb().notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  const notification = await notificationDb().notification.findFirst({ where: { id, userId }, select: mobileNotificationSelect });
  return { notification: notification ? serializeMobileNotification(notification) : null, changed: result.count > 0 };
}
export async function markAllNotificationsRead(userId: string) { return notificationDb().notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }); }
export class InvalidNotificationCursorError extends Error {}
function serializeMobileNotification<T extends { actionPath: string | null }>(notification: T) { return { ...notification, actionPath: validateNotificationActionPath(notification.actionPath) }; }

/** @deprecated Use createNotificationEvent; retained only for callers being migrated. */
export async function createNotification(input: { userId: string; title: string; body: string; type?: CanonicalNotificationType; eventKey?: string; actionPath?: NotificationActionPath; metadata?: Record<string, unknown> }) {
  if (!input.eventKey) throw new Error("Canonical notifications require eventKey.");
  return createNotificationEvent({ userId: input.userId, eventKey: input.eventKey, title: input.title, body: input.body, type: input.type ?? "SYSTEM", actionPath: input.actionPath, metadata: input.metadata });
}
export const __notificationServiceTest = { setPrisma(prisma: unknown | null) { notificationPrismaForTesting = prisma as ReturnType<typeof getPrisma> | null; } };
