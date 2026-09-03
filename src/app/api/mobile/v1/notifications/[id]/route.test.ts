import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationItemHandlers } from "./route";

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = new Request("https://example.test/api/mobile/v1/notifications/notification01", { method: "DELETE" });

test("notification delete requires an active authenticated mobile user", async () => {
  for (const session of [null, { user: { id: "user-1", status: "SUSPENDED" } }]) {
    const handlers = createNotificationItemHandlers({ session: async () => session, markRead: async () => ({ notification: null, changed: false }), remove: async () => ({ found: true, deleted: true }) });
    assert.equal((await handlers.DELETE(request, context("notification01"))).status, 401);
  }
});

test("notification delete validates IDs, scopes deletion to session user, and is repeat-safe", async () => {
  const calls: Array<{ userId: string; id: string }> = [];
  let first = true;
  const handlers = createNotificationItemHandlers({
    session: async () => ({ user: { id: "user-1", status: "ACTIVE" } }),
    markRead: async () => ({ notification: null, changed: false }),
    remove: async (userId, id) => { calls.push({ userId, id }); const deleted = first; first = false; return { found: true, deleted }; },
  });
  assert.equal((await handlers.DELETE(request, context("bad"))).status, 400);
  const firstResponse = await handlers.DELETE(request, context("notification01"));
  assert.deepEqual(await firstResponse.json(), { deleted: true, changed: true });
  const repeated = await handlers.DELETE(request, context("notification01"));
  assert.deepEqual(await repeated.json(), { deleted: true, changed: false });
  assert.deepEqual(calls, [{ userId: "user-1", id: "notification01" }, { userId: "user-1", id: "notification01" }]);
});

test("another user's or missing notification fails without revealing ownership", async () => {
  const handlers = createNotificationItemHandlers({ session: async () => ({ user: { id: "user-1", status: "ACTIVE" } }), markRead: async () => ({ notification: null, changed: false }), remove: async () => ({ found: false, deleted: false }) });
  assert.equal((await handlers.DELETE(request, context("notification02"))).status, 404);
});
