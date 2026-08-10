import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { __notificationServiceTest, escapeNotificationHtml, getUnreadNotificationCount, InvalidNotificationCursorError, listNotifications, markAllNotificationsRead, markNotificationRead, validateNotificationActionPath } from "@/services/notificationService";

type Row = { id: string; userId: string; type: "SYSTEM"; title: string; body: string; actionPath: string | null; metadata: null; readAt: Date | null; createdAt: Date };
function fakeDb(rows: Row[]) {
  const visible = (row: Row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, actionPath: row.actionPath, metadata: row.metadata, readAt: row.readAt, createdAt: row.createdAt });
  return { notification: {
    findFirst: async ({ where }: { where: { id?: string; userId?: string } }) => { const row = rows.find((item) => (!where.id || item.id === where.id) && (!where.userId || item.userId === where.userId)); return row ? visible(row) : null; },
    findMany: async ({ where, take, cursor, skip }: { where: { userId: string }; take: number; cursor?: { id: string }; skip?: number }) => { const sorted = rows.filter((row) => row.userId === where.userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)); const start = cursor ? sorted.findIndex((row) => row.id === cursor.id) + (skip || 0) : 0; return sorted.slice(start, start + take).map(visible); },
    count: async ({ where }: { where: { userId: string; readAt: null } }) => rows.filter((row) => row.userId === where.userId && row.readAt === null).length,
    updateMany: async ({ where, data }: { where: { id?: string; userId: string; readAt: null }; data: { readAt: Date } }) => { let count = 0; for (const row of rows) if ((!where.id || row.id === where.id) && row.userId === where.userId && row.readAt === null) { row.readAt = data.readAt; count += 1; } return { count }; },
  } };
}
afterEach(() => __notificationServiceTest.setPrisma(null));

test("notification actions accept only known mobile destinations", () => {
  assert.equal(validateNotificationActionPath("/price-alerts"), "/price-alerts");
  assert.equal(validateNotificationActionPath("/saved"), "/saved");
  assert.equal(validateNotificationActionPath("https://evil.example/steal"), null);
  assert.equal(validateNotificationActionPath("//evil.example"), null);
  assert.equal(validateNotificationActionPath("/notifications/../../admin"), null);
});

test("generic notification email content is HTML escaped", () => {
  assert.equal(escapeNotificationHtml(`<img src=x onerror="alert('x')"> & hi`), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; hi");
});

test("inbox pagination is newest-first and never returns another user's rows", async () => {
  const rows: Row[] = [
    { id: "notification01", userId: "user-1", type: "SYSTEM", title: "Older", body: "One", actionPath: "https://evil.example", metadata: null, readAt: null, createdAt: new Date("2026-01-01") },
    { id: "notification02", userId: "user-1", type: "SYSTEM", title: "Newer", body: "Two", actionPath: null, metadata: null, readAt: null, createdAt: new Date("2026-01-02") },
    { id: "notification03", userId: "user-2", type: "SYSTEM", title: "Private", body: "Other", actionPath: null, metadata: null, readAt: null, createdAt: new Date("2026-01-03") },
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
    { id: "notification01", userId: "user-1", type: "SYSTEM", title: "One", body: "One", actionPath: null, metadata: null, readAt: null, createdAt: new Date() },
    { id: "notification02", userId: "user-1", type: "SYSTEM", title: "Two", body: "Two", actionPath: null, metadata: null, readAt: null, createdAt: new Date() },
    { id: "notification03", userId: "user-2", type: "SYSTEM", title: "Private", body: "Other", actionPath: null, metadata: null, readAt: null, createdAt: new Date() },
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
