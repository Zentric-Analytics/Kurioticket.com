import assert from "node:assert/strict";
import test from "node:test";
import { fetchHasUnreadNotifications } from "./notificationUnreadModel";

test("zero unread notifications does not show a badge", async () => {
  assert.equal(await fetchHasUnreadNotifications(async () => ({ count: 0 })), false);
});

test("a real unread notification shows a badge", async () => {
  assert.equal(await fetchHasUnreadNotifications(async () => ({ count: 1 })), true);
});

test("API failures never produce a false unread badge", async () => {
  assert.equal(await fetchHasUnreadNotifications(async () => { throw new Error("offline"); }), false);
});

test("a passive unauthenticated lookup neither redirects nor shows a badge", async () => {
  assert.equal(await fetchHasUnreadNotifications(async () => { throw Object.assign(new Error("Unauthorized"), { status: 401 }); }), false);
});

test("a refreshed count after mark-all-read removes the badge", async () => {
  let count = 2;
  const load = async () => ({ count });
  assert.equal(await fetchHasUnreadNotifications(load), true);
  count = 0;
  assert.equal(await fetchHasUnreadNotifications(load), false);
});
