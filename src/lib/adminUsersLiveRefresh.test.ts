import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminUsersRefreshController, isAdminUsersRefreshPath, probeAdminUsersRefresh,
  type AdminUsersRefreshAvailability, type AdminUsersRefreshProbe, type AdminUsersRefreshState,
} from "./adminUsersLiveRefresh";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settle = async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); };

function fixture() {
  let now = 0;
  let serial = 0;
  let availability: AdminUsersRefreshAvailability = "ready";
  let probe: (signal: AbortSignal) => Promise<AdminUsersRefreshProbe> = async () => "ready";
  let refresh: () => Promise<void> = async () => undefined;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const states: AdminUsersRefreshState[] = [];
  const signals: AbortSignal[] = [];
  const refreshed: number[] = [];
  let unauthorized = 0;
  const controller = createAdminUsersRefreshController({
    availability: () => availability,
    probe: signal => { signals.push(signal); return probe(signal); },
    refresh: () => { refreshed.push(now); return refresh(); },
    unauthorized: () => { unauthorized += 1; },
    state: value => states.push(value),
    schedule: (callback, delay) => { const id = ++serial; timers.set(id, { at: now + delay, callback }); return id; },
    cancel: timer => { timers.delete(timer as number); },
  });
  return {
    controller, states, signals, refreshed, timers,
    unauthorized: () => unauthorized,
    setAvailability: (value: AdminUsersRefreshAvailability) => { availability = value; },
    setProbe: (value: typeof probe) => { probe = value; },
    setRefresh: (value: typeof refresh) => { refresh = value; },
    async advance(milliseconds: number) {
      const until = now + milliseconds;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next || next[1].at > until) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        await settle();
      }
      now = until;
      await settle();
    },
  };
}

test("all Users detail routes refresh, while Bots and the separately polled Online directory do not", () => {
  for (const path of ["/admin/users", "/admin/users/pages", "/admin/users/devices", "/admin/users/user/example/activity/all", "/admin/users/online/guest/reference", "/admin/users/guest/example/journeys"]) {
    assert.equal(isAdminUsersRefreshPath(path), true, path);
  }
  for (const path of ["/admin/users/online", "/admin/users/bots", "/admin/users/bots/example", "/admin/users-other", "/admin/searches"]) {
    assert.equal(isAdminUsersRefreshPath(path), false, path);
  }
});

test("the normal cycle waits fifteen seconds after each completed refresh", async () => {
  const h = fixture();
  h.controller.start();
  await h.advance(14_999);
  assert.equal(h.signals.length, 0);
  await h.advance(1);
  assert.deepEqual(h.refreshed, [15_000]);
  await h.advance(15_000);
  assert.deepEqual(h.refreshed, [15_000, 30_000]);
  assert.deepEqual(h.states, ["updating", "live", "updating", "live"]);
  h.controller.dispose();
  assert.equal(h.timers.size, 0);
});

test("slow server rendering and repeated resume events never create overlapping polls", async () => {
  const h = fixture();
  const rendering = deferred<void>();
  h.setRefresh(() => rendering.promise);
  h.controller.start();
  await h.advance(15_000);
  h.controller.resume();
  h.controller.resume();
  await h.advance(60_000);
  assert.equal(h.signals.length, 1);
  assert.equal(h.refreshed.length, 1);
  rendering.resolve();
  await settle();
  h.setRefresh(async () => undefined);
  await h.advance(0);
  assert.equal(h.signals.length, 2, "multiple recovery signals coalesce to one follow-up");
  assert.equal(h.refreshed.length, 2);
  h.controller.dispose();
});

test("hidden or offline tabs stop work, and a late aborted probe cannot repaint retained data", async () => {
  const h = fixture();
  const response = deferred<AdminUsersRefreshProbe>();
  h.setProbe(() => response.promise);
  h.controller.start();
  await h.advance(15_000);
  h.setAvailability("hidden");
  h.controller.resume();
  assert.equal(h.signals[0].aborted, true);
  response.resolve("ready");
  await settle();
  await h.advance(60_000);
  assert.equal(h.refreshed.length, 0);
  assert.equal(h.signals.length, 1);
  h.setAvailability("offline");
  h.controller.resume();
  assert.equal(h.states.at(-1), "offline");
  await h.advance(60_000);
  assert.equal(h.signals.length, 1);
  h.setAvailability("ready");
  h.setProbe(async () => "ready");
  h.controller.resume();
  await settle();
  assert.equal(h.signals.length, 2);
  assert.equal(h.refreshed.length, 1);
  h.controller.dispose();
});

test("active edits or menus defer refresh, including an interaction that begins during the probe", async () => {
  const h = fixture();
  h.setAvailability("interacting");
  h.controller.start();
  await h.advance(18_000);
  assert.equal(h.signals.length, 0);
  h.setAvailability("ready");
  const response = deferred<AdminUsersRefreshProbe>();
  h.setProbe(() => response.promise);
  await h.advance(1_000);
  assert.equal(h.signals.length, 1);
  h.setAvailability("interacting");
  response.resolve("ready");
  await settle();
  assert.equal(h.refreshed.length, 0);
  h.setAvailability("ready");
  h.setProbe(async () => "ready");
  await h.advance(1_000);
  assert.equal(h.refreshed.length, 1);
  h.controller.dispose();
});

test("network failures retain the page and back off to at most one retry per minute", async () => {
  const h = fixture();
  h.setProbe(async () => { throw new Error("Disconnected"); });
  h.controller.start();
  await h.advance(15_000);
  assert.equal(h.states.at(-1), "delayed");
  assert.equal(h.refreshed.length, 0);
  await h.advance(29_999);
  assert.equal(h.signals.length, 1);
  await h.advance(1);
  assert.equal(h.signals.length, 2);
  await h.advance(59_999);
  assert.equal(h.signals.length, 2);
  h.setProbe(async () => "ready");
  await h.advance(1);
  assert.equal(h.refreshed.length, 1);
  assert.equal(h.states.at(-1), "live");
  await h.advance(15_000);
  assert.equal(h.refreshed.length, 2, "successful recovery restores normal cadence");
  h.controller.dispose();
});

test("a stuck permission probe is aborted at eight seconds and retries with backoff", async () => {
  const h = fixture();
  h.setProbe(signal => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true })));
  h.controller.start();
  await h.advance(23_000);
  assert.equal(h.signals[0].aborted, true);
  assert.equal(h.states.at(-1), "delayed");
  assert.equal(h.refreshed.length, 0);
  await h.advance(29_999);
  assert.equal(h.signals.length, 1);
  await h.advance(1);
  assert.equal(h.signals.length, 2);
  h.controller.dispose();
});

test("revoked admin access invokes the canonical route guard once and stops automatic retries", async () => {
  const h = fixture();
  h.setProbe(async () => "unauthorized");
  h.controller.start();
  await h.advance(15_000);
  assert.equal(h.unauthorized(), 1);
  assert.equal(h.refreshed.length, 0);
  assert.equal(h.states.at(-1), "authorization");
  h.controller.resume();
  await h.advance(180_000);
  assert.equal(h.signals.length, 1);
  assert.equal(h.unauthorized(), 1);
  assert.equal(h.timers.size, 0);
});

test("navigation or unmount discards late work and cancels all owned timers", async () => {
  const h = fixture();
  const response = deferred<AdminUsersRefreshProbe>();
  h.setProbe(() => response.promise);
  h.controller.start();
  await h.advance(15_000);
  h.controller.dispose();
  response.resolve("ready");
  await settle();
  await h.advance(60_000);
  assert.equal(h.signals[0].aborted, true);
  assert.equal(h.refreshed.length, 0);
  assert.equal(h.timers.size, 0);
});

test("permission probes use an uncached same-origin request and distinguish auth from temporary failures", async () => {
  const signal = new AbortController().signal;
  let sent: { url: RequestInfo | URL; init?: RequestInit } | undefined;
  const result = await probeAdminUsersRefresh(signal, async (url, init) => {
    sent = { url, init };
    return Response.json({ ok: true });
  });
  assert.equal(result, "ready");
  assert.equal(sent!.url, "/api/admin/users/live-refresh");
  assert.equal(sent!.init!.credentials, "same-origin");
  assert.equal(sent!.init!.cache, "no-store");
  assert.equal(sent!.init!.signal, signal);
  for (const status of [401, 403]) assert.equal(await probeAdminUsersRefresh(signal, async () => Response.json({}, { status })), "unauthorized");
  await assert.rejects(probeAdminUsersRefresh(signal, async () => Response.json({}, { status: 503 })));
  await assert.rejects(probeAdminUsersRefresh(signal, async () => Response.json({ ok: false })));
});
