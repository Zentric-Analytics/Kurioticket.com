import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { __notificationServiceTest, deleteNotification, escapeNotificationHtml, getUnreadNotificationCount, InvalidNotificationCursorError, listNotifications, markAllNotificationsRead, markNotificationRead, persistCanonicalNotificationEvent, validateNotificationActionPath } from "@/services/notificationService";

type Row = { id: string; userId: string; type: "SYSTEM" | "PRICE_ALERT" | "TRAVEL_INSIGHT" | "SUPPORT_UPDATE" | "ACCOUNT_UPDATE" | "SECURITY_UPDATE"; title: string; body: string; actionPath: string | null; metadata: Record<string, unknown> | null; readAt: Date | null; deletedAt: Date | null; createdAt: Date; eventKey?: string };
function fakeDb(rows: Row[]) {
  const visible = (row: Row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, actionPath: row.actionPath, metadata: row.metadata, readAt: row.readAt, createdAt: row.createdAt });
  const matches = (row: Row, where: Record<string, any>) => {
    if (where.id && row.id !== where.id || where.userId && row.userId !== where.userId) return false;
    if ("readAt" in where && row.readAt !== where.readAt || "deletedAt" in where && row.deletedAt !== where.deletedAt) return false;
    if (where.OR && !where.OR.some((clause: Record<string, any>) => clause.type.in.includes(row.type) && row.createdAt > clause.createdAt.gt)) return false;
    return true;
  };
  return { notification: {
    createMany: async ({ data }: { data: Array<Record<string, any>> }) => { const value = data[0]!; if (rows.some((row) => row.eventKey === value.eventKey)) return { count: 0 }; rows.push({ id: `notification${rows.length + 1}`.padEnd(14, "0"), metadata: null, readAt: null, deletedAt: null, createdAt: new Date(), actionPath: null, ...value } as Row); return { count: 1 }; },
    findUnique: async ({ where }: { where: { eventKey: string } }) => rows.find((row) => row.eventKey === where.eventKey) ?? null,
    findFirst: async ({ where }: { where: Record<string, any> }) => { const row = rows.find((item) => matches(item, where)); return row ? visible(row) : null; },
    findMany: async ({ where, take, cursor, skip }: { where: Record<string, any>; take: number; cursor?: { id: string }; skip?: number }) => { const sortedAll = rows.filter((row) => row.userId === where.userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)); const afterCursor = cursor ? sortedAll.slice(sortedAll.findIndex((row) => row.id === cursor.id) + (skip || 0)) : sortedAll; return afterCursor.filter((row) => matches(row, where)).slice(0, take).map(visible); },
    count: async ({ where }: { where: Record<string, any> }) => rows.filter((row) => matches(row, where)).length,
    updateMany: async ({ where, data }: { where: Record<string, any>; data: { readAt?: Date; deletedAt?: Date } }) => { let count = 0; for (const row of rows) if (matches(row, where)) { if (data.readAt) row.readAt = data.readAt; if (data.deletedAt) row.deletedAt = data.deletedAt; count += 1; } return { count }; },
  } };
}
afterEach(() => __notificationServiceTest.setPrisma(null));

test("notification actions accept only known mobile destinations", () => {
  assert.equal(validateNotificationActionPath("/price-alerts"), "/price-alerts");
  assert.equal(validateNotificationActionPath("/saved"), "/saved");
  assert.equal(validateNotificationActionPath("/security"), "/security");
  assert.equal(validateNotificationActionPath("https://evil.example/steal"), null);
  assert.equal(validateNotificationActionPath("//evil.example"), null);
  assert.equal(validateNotificationActionPath("/notifications/../../admin"), null);
});

test("generic notification email content is HTML escaped", () => {
  assert.equal(escapeNotificationHtml(`<img src=x onerror="alert('x')"> & hi`), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; hi");
});

test("inbox pagination is newest-first and never returns another user's rows", async () => {
  const rows: Row[] = [
    { id: "notification01", userId: "user-1", type: "SYSTEM", title: "Older", body: "One", actionPath: "https://evil.example", metadata: null, readAt: null, deletedAt: null, createdAt: new Date() },
    { id: "notification02", userId: "user-1", type: "SYSTEM", title: "Newer", body: "Two", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date(Date.now() + 1) },
    { id: "notification03", userId: "user-2", type: "SYSTEM", title: "Private", body: "Other", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date(Date.now() + 2) },
  ];
  __notificationServiceTest.setPrisma(fakeDb(rows));
  const first = await listNotifications("user-1", { limit: 1 });
  assert.deepEqual(first.items.map(({ id }) => id), ["notification02"]);
  assert.equal(first.nextCursor, "notification02");
  const second = await listNotifications("user-1", { cursor: first.nextCursor!, limit: 1 });
  assert.deepEqual(second.items.map(({ id }) => id), ["notification01"]);
  assert.equal(second.items[0]?.actionPath, null);
  await assert.rejects(() => listNotifications("user-1", { cursor: "notification03" }), InvalidNotificationCursorError);
  assert.equal("userId" in first.items[0]!, false);
});

test("read mutations are owned, idempotent, and update unread count", async () => {
  const rows: Row[] = [
    { id: "notification01", userId: "user-1", type: "SYSTEM", title: "One", body: "One", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date() },
    { id: "notification02", userId: "user-1", type: "SYSTEM", title: "Two", body: "Two", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date() },
    { id: "notification03", userId: "user-2", type: "SYSTEM", title: "Private", body: "Other", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date() },
  ];
  __notificationServiceTest.setPrisma(fakeDb(rows));
  assert.equal(await getUnreadNotificationCount("user-1"), 2);
  assert.equal((await markNotificationRead("user-1", "notification03")).notification, null);
  assert.equal((await markNotificationRead("user-1", "notification01")).changed, true);
  assert.equal((await markNotificationRead("user-1", "notification01")).changed, false);
  assert.equal(await getUnreadNotificationCount("user-1"), 1);
  assert.equal((await markAllNotificationsRead("user-1")).count, 1);
  assert.equal(await getUnreadNotificationCount("user-1"), 0);
  assert.equal(await getUnreadNotificationCount("user-2"), 1);
});

test("inbox normalizes legacy security destinations without making null actions actionable", async () => {
  const now = new Date("2026-01-05T00:00:00.000Z");
  const rows: Row[] = [
    { id: "notification01", userId: "user-1", type: "SECURITY_UPDATE", title: "Security", body: "Changed", actionPath: "/settings", metadata: null, readAt: null, deletedAt: null, createdAt: new Date("2026-01-04") },
    { id: "notification02", userId: "user-1", type: "ACCOUNT_UPDATE", title: "Deletion", body: "Pending", actionPath: "/settings", metadata: { deletionRequestId: "delete-1" }, readAt: null, deletedAt: null, createdAt: new Date("2026-01-03") },
    { id: "notification03", userId: "user-1", type: "PRICE_ALERT", title: "Price", body: "Dropped", actionPath: "/settings", metadata: null, readAt: null, deletedAt: null, createdAt: new Date("2026-01-02") },
    { id: "notification04", userId: "user-1", type: "SUPPORT_UPDATE", title: "Reply", body: "Received", actionPath: "/support", metadata: { ticketId: "ticket-1" }, readAt: null, deletedAt: null, createdAt: new Date("2026-01-01") },
    { id: "notification05", userId: "user-1", type: "SECURITY_UPDATE", title: "Informational", body: "No action", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date("2025-12-31") },
  ];
  __notificationServiceTest.setPrisma(fakeDb(rows));
  const page = await listNotifications("user-1", { now });
  assert.deepEqual(page.items.map(item => item.actionPath), ["/security", "/security", "/price-alerts", "/support", null]);
});

test("mobile inbox applies type-specific retention to list, unread count, and pagination", async () => {
  const now = new Date("2026-09-03T12:00:00.000Z");
  const ago = (days: number, extraMs = 0) => new Date(now.getTime() - days * 86_400_000 + extraMs);
  const make = (id: string, type: Row["type"], createdAt: Date): Row => ({ id, userId: "user-1", type, title: id, body: id, actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt });
  const rows = [
    make("pricevisible1", "PRICE_ALERT", ago(7, 1)), make("priceexpired1", "PRICE_ALERT", ago(7)),
    make("travelexpired1", "TRAVEL_INSIGHT", ago(7)), make("securityvis1", "SECURITY_UPDATE", ago(30, 1)),
    make("securityexp1", "SECURITY_UPDATE", ago(30)), make("supportexpir1", "SUPPORT_UPDATE", ago(31)),
    make("accountexpir1", "ACCOUNT_UPDATE", ago(31)), make("systemvisible1", "SYSTEM", ago(29)), make("systemexpired1", "SYSTEM", ago(30)),
  ];
  __notificationServiceTest.setPrisma(fakeDb(rows));
  const first = await listNotifications("user-1", { limit: 2, now });
  assert.deepEqual(first.items.map((item) => item.id), ["pricevisible1", "systemvisible1"]);
  assert.equal(first.nextCursor, "systemvisible1");
  const second = await listNotifications("user-1", { cursor: first.nextCursor!, limit: 2, now });
  assert.deepEqual(second.items.map((item) => item.id), ["securityvis1"]);
  assert.equal(await getUnreadNotificationCount("user-1", now), 3);
});

test("notification deletion is owned, idempotent, durable, and preserves canonical event idempotency", async () => {
  const relatedSecurityEvent = { id: "security-event-1", changed: false };
  const rows: Row[] = [
    { id: "notification01", userId: "user-1", type: "SECURITY_UPDATE", title: "Unread", body: "One", actionPath: "/security", metadata: { securityEventId: relatedSecurityEvent.id }, readAt: null, deletedAt: null, createdAt: new Date(), eventKey: "security:event:1" },
    { id: "notification02", userId: "user-1", type: "SYSTEM", title: "Read", body: "Two", actionPath: null, metadata: null, readAt: new Date(), deletedAt: null, createdAt: new Date(), eventKey: "system:2" },
    { id: "notification03", userId: "user-2", type: "SYSTEM", title: "Private", body: "Three", actionPath: null, metadata: null, readAt: null, deletedAt: null, createdAt: new Date(), eventKey: "system:3" },
  ];
  const db = fakeDb(rows);
  __notificationServiceTest.setPrisma(db);
  assert.deepEqual(await deleteNotification("user-1", "notification03"), { found: false, deleted: false });
  assert.deepEqual(await deleteNotification("user-1", "notification01"), { found: true, deleted: true });
  assert.deepEqual(await deleteNotification("user-1", "notification01"), { found: true, deleted: false });
  assert.deepEqual((await listNotifications("user-1")).items.map((item) => item.id), ["notification02"]);
  assert.equal(await getUnreadNotificationCount("user-1"), 0);
  assert.equal(relatedSecurityEvent.changed, false);
  const retry = await persistCanonicalNotificationEvent({ userId: "user-1", eventKey: "security:event:1", type: "SECURITY_UPDATE", title: "Unread", body: "One" }, db as never);
  assert.equal(retry.created, false);
  assert.equal(rows.filter((row) => row.eventKey === "security:event:1").length, 1);
  assert.deepEqual(await deleteNotification("user-1", "notification02"), { found: true, deleted: true });
});
