import assert from "node:assert/strict";
import test from "node:test";
import { VisitorIdentityCoordinator, parseStoredVisitorIdentity, type IdentitySession, type StoredVisitorIdentity } from "./visitorIdentityCoordinator";

const user = (id: string, token = `auth-${id}`): NonNullable<IdentitySession> => ({ token, user: { id } });
const visitorToken = (index: number) => String(index).padStart(43, "v");
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const turn = () => new Promise<void>(resolve => setImmediate(resolve));

function harness(initial: unknown = null) {
  let saved = initial;
  let nextToken = 1;
  const records = new Map<string, { userId: string | null; enabled: boolean }>();
  const calls: { operation: string; token: string | null; userId: string | null }[] = [];
  const controls = {
    failWithdrawal: false,
    failWrite: false,
    failMerge: false,
    waitGrant: null as ReturnType<typeof deferred<void>> | null,
    waitMerge: null as ReturnType<typeof deferred<void>> | null,
  };
  const coordinator = new VisitorIdentityCoordinator({
    read: async () => saved,
    write: async value => { if (controls.failWrite) throw new Error("storage unavailable"); saved = structuredClone(value); },
    grant: async (token, session) => {
      calls.push({ operation: "grant", token, userId: session?.user.id ?? null });
      if (controls.waitGrant) await controls.waitGrant.promise;
      const existing = token ? records.get(token) : undefined;
      if (existing?.enabled && (!existing.userId || existing.userId === session?.user.id)) return token!;
      const created = visitorToken(nextToken++);
      records.set(created, { userId: null, enabled: true });
      return created;
    },
    merge: async (token, session) => {
      calls.push({ operation: "merge", token, userId: session.user.id });
      if (controls.waitMerge) await controls.waitMerge.promise;
      if (controls.failMerge) throw new Error("offline");
      const record = records.get(token);
      if (!record?.enabled || (record.userId && record.userId !== session.user.id)) return { merged: false };
      record.userId = session.user.id;
      return { merged: true };
    },
    withdraw: async token => {
      calls.push({ operation: "withdraw", token, userId: null });
      if (controls.failWithdrawal) throw new Error("offline");
      const record = records.get(token);
      if (record) record.enabled = false;
    },
    now: () => 0,
  });
  return { coordinator, records, calls, controls, saved: () => saved as StoredVisitorIdentity };
}

test("unknown and declined consent never create or attach a visitor", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  assert.equal(h.coordinator.snapshot().choice, "unknown");
  assert.deepEqual(await h.coordinator.headers("/api/flights/search", null), {});
  await h.coordinator.choose(false);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", user("a")), {});
  await h.coordinator.refresh();
  assert.deepEqual(h.calls, []);
  assert.equal(h.saved().choice, "declined");
});

test("explicit opt-in uses a stable token only on the first-party search and handoff producers", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  await h.coordinator.choose(true);
  const headers = { "x-kt-visitor": visitorToken(1) };
  for (const path of ["/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/mobile/v1/hotels/progressive", "/api/redirect", "/api/journey/events"]) {
    assert.deepEqual(await h.coordinator.headers(path, null), headers);
  }
  for (const path of ["/api/mobile/v1/profile", "/api/mobile/v1/identity/visitor", "/api/hotels/details?id=x", "https://provider.example/api/redirect", "//provider.example/api/redirect", "https://provider.example/api/journey/events", "/api/journey/events?provider=external"]) {
    assert.deepEqual(await h.coordinator.headers(path, null), {});
  }
  assert.equal(h.calls.filter(call => call.operation === "grant").length, 1);
});

test("anonymous searches remain associated when sign-in links the same visitor", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  await h.coordinator.choose(true);
  await h.coordinator.transition(user("a"));
  assert.deepEqual(await h.coordinator.headers("/api/redirect", user("a")), { "x-kt-visitor": visitorToken(1) });
  assert.equal(h.records.get(visitorToken(1))?.userId, "a");
  await h.coordinator.transition(user("a", "refreshed-auth"));
  assert.equal(h.calls.filter(call => call.operation === "merge").length, 1);
});

test("optional event context changes on account or consent changes, but not a same-account session refresh", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  assert.equal(h.coordinator.trackingContext(), null);
  await h.coordinator.choose(true);
  const guestContext = h.coordinator.trackingContext();
  assert.notEqual(guestContext, null);
  await h.coordinator.transition(user("a"));
  const accountContext = h.coordinator.trackingContext();
  assert.notEqual(accountContext, guestContext);
  await h.coordinator.transition(user("a", "refreshed-session"));
  assert.equal(h.coordinator.trackingContext(), accountContext);
  await h.coordinator.transition(null);
  assert.notEqual(h.coordinator.trackingContext(), accountContext);
  const signedOutContext = h.coordinator.trackingContext();
  await h.coordinator.choose(false);
  assert.equal(h.coordinator.trackingContext(), null);
  assert.deepEqual(await h.coordinator.headers("/api/journey/events", null), {});
  await h.coordinator.choose(true);
  assert.notEqual(h.coordinator.trackingContext(), signedOutContext);
});

test("logout and switching accounts never reuse the former account's token", async () => {
  const h = harness();
  await h.coordinator.transition(user("a"));
  await h.coordinator.choose(true);
  await h.coordinator.transition(user("b"));
  assert.deepEqual(await h.coordinator.headers("/api/redirect", user("b")), { "x-kt-visitor": visitorToken(2) });
  assert.equal(h.records.get(visitorToken(1))?.userId, "a");
  assert.equal(h.records.get(visitorToken(2))?.userId, "b");
  await h.coordinator.transition(null);
  assert.deepEqual(await h.coordinator.headers("/api/flights/search", null), { "x-kt-visitor": visitorToken(3) });
  assert.equal(h.records.get(visitorToken(3))?.userId, null);
  assert.deepEqual(h.calls.filter(call => call.operation === "grant").map(call => call.token), [null, null, null]);
});

test("a pending analytics request does not delay a search or carry an old account reference", async () => {
  const h = harness();
  await h.coordinator.transition(user("a"));
  await h.coordinator.choose(true);
  h.controls.waitGrant = deferred<void>();
  const transition = h.coordinator.transition(null);
  await turn();
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), {});
  h.controls.waitGrant.resolve();
  await transition;
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), { "x-kt-visitor": visitorToken(2) });
});

test("offline withdrawal stops local attribution immediately and retries before any renewed grant", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  await h.coordinator.choose(true);
  h.controls.failWithdrawal = true;
  await h.coordinator.choose(false);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), {});
  assert.equal(h.saved().visitorToken, null);
  assert.deepEqual(h.saved().pendingWithdrawals, [visitorToken(1)]);
  assert.equal(h.coordinator.snapshot().error, true);
  await h.coordinator.choose(true);
  assert.deepEqual(await h.coordinator.headers("/api/flights/search", null), {});
  assert.equal(h.calls.filter(call => call.operation === "grant").length, 1);
  h.controls.failWithdrawal = false;
  await h.coordinator.refresh();
  assert.equal(h.records.get(visitorToken(1))?.enabled, false);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), { "x-kt-visitor": visitorToken(2) });
});

test("withdrawal during an unfinished opt-in revokes its eventual token instead of restoring consent", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  h.controls.waitGrant = deferred<void>();
  const grant = h.coordinator.choose(true);
  await turn();
  const decline = h.coordinator.choose(false);
  await turn();
  h.controls.waitGrant.resolve();
  await Promise.all([grant, decline]);
  assert.equal(h.coordinator.snapshot().choice, "declined");
  assert.equal(h.coordinator.snapshot().tracking, false);
  assert.equal(h.saved().visitorToken, null);
  assert.equal(h.records.get(visitorToken(1))?.enabled, false);
  assert.deepEqual(h.saved().pendingWithdrawals, []);
});

test("logout during an in-flight guest merge discards that now-account-bound reference", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  await h.coordinator.choose(true);
  h.controls.waitMerge = deferred<void>();
  const signIn = h.coordinator.transition(user("a"));
  await turn();
  const signOut = h.coordinator.transition(null);
  await turn();
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), {});
  h.controls.waitMerge.resolve();
  await Promise.all([signIn, signOut]);
  assert.equal(h.records.get(visitorToken(1))?.userId, "a");
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), { "x-kt-visitor": visitorToken(2) });
});

test("a restart while signed out rotates a persisted account-bound reference", async () => {
  const h = harness({ choice: "granted", visitorToken: visitorToken(90), userId: "a", pendingWithdrawals: [] });
  await h.coordinator.transition(null);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), { "x-kt-visitor": visitorToken(1) });
  assert.equal(h.calls[0].token, null);
});

test("a successful grant survives a failed merge and is reused on retry without attribution before confirmation", async () => {
  const h = harness();
  await h.coordinator.transition(user("a"));
  h.controls.failMerge = true;
  await h.coordinator.choose(true);
  assert.equal(h.saved().pendingToken, visitorToken(1));
  assert.equal(h.saved().pendingUserId, "a");
  assert.equal(h.saved().visitorToken, null);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", user("a")), {});
  h.controls.failMerge = false;
  await h.coordinator.refresh();
  assert.deepEqual(h.calls.filter(call => call.operation === "grant").map(call => call.token), [null, visitorToken(1)]);
  assert.equal(h.records.size, 1);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", user("a")), { "x-kt-visitor": visitorToken(1) });
  assert.equal(h.saved().pendingToken, null);
});

test("a pending merge candidate is also revoked when consent is withdrawn", async () => {
  const h = harness();
  await h.coordinator.transition(user("a"));
  h.controls.failMerge = true;
  await h.coordinator.choose(true);
  await h.coordinator.choose(false);
  assert.equal(h.records.get(visitorToken(1))?.enabled, false);
  assert.equal(h.saved().pendingToken, null);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", user("a")), {});
});

test("a signed-out restart does not reuse the token from an ambiguous account merge", async () => {
  const h = harness({ choice: "granted", visitorToken: visitorToken(90), userId: null, pendingToken: visitorToken(90), pendingUserId: "a", pendingWithdrawals: [] });
  await h.coordinator.transition(null);
  assert.equal(h.calls[0].token, null);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), { "x-kt-visitor": visitorToken(1) });
});

test("a failed consent write cannot start analytics", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  h.controls.failWrite = true;
  await assert.rejects(h.coordinator.choose(true));
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), {});
  assert.deepEqual(h.calls, []);
});

test("a refusal remains dirty after successful remote withdrawal and retries secure storage before reporting success", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  await h.coordinator.choose(true);
  h.controls.failWrite = true;
  await assert.rejects(h.coordinator.choose(false));
  assert.equal(h.records.get(visitorToken(1))?.enabled, false);
  assert.equal(h.saved().choice, "granted");
  assert.equal(h.coordinator.snapshot().choice, "declined");
  assert.equal(h.coordinator.snapshot().error, true);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), {});
  await h.coordinator.refresh();
  assert.equal(h.coordinator.snapshot().error, true);

  h.controls.failWrite = false;
  await h.coordinator.refresh();
  assert.equal(h.saved().choice, "declined");
  assert.equal(h.saved().visitorToken, null);
  assert.equal(h.coordinator.snapshot().error, false);
  const restarted = harness(h.saved());
  await restarted.coordinator.transition(null);
  assert.deepEqual(restarted.calls, []);
  assert.deepEqual(await restarted.coordinator.headers("/api/redirect", null), {});
});

test("storage recovery persists a refusal even if its server withdrawal remains offline", async () => {
  const h = harness();
  await h.coordinator.transition(null);
  await h.coordinator.choose(true);
  h.controls.failWrite = true;
  h.controls.failWithdrawal = true;
  await assert.rejects(h.coordinator.choose(false));
  h.controls.failWrite = false;
  await h.coordinator.refresh();
  assert.equal(h.saved().choice, "declined");
  assert.equal(h.saved().visitorToken, null);
  assert.deepEqual(h.saved().pendingWithdrawals, [visitorToken(1)]);
  assert.equal(h.coordinator.snapshot().error, true);
  assert.deepEqual(await h.coordinator.headers("/api/redirect", null), {});
});

test("malformed stored identifiers are discarded and a saved refusal never reactivates a token", () => {
  assert.equal(parseStoredVisitorIdentity({ choice: "granted", visitorToken: "bad" }).visitorToken, null);
  const state = parseStoredVisitorIdentity({ choice: "declined", visitorToken: visitorToken(1), userId: "a" });
  assert.equal(state.visitorToken, null);
  assert.equal(state.userId, null);
  assert.deepEqual(state.pendingWithdrawals, [visitorToken(1)]);
});
