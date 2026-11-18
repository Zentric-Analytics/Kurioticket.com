import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import test, { type TestContext } from "node:test";
import { startWebsiteOnlinePresence } from "./websiteOnlinePresenceClient";

type Browser = Parameters<typeof startWebsiteOnlinePresence>[0];

function browserHarness(t: TestContext, overrides: Partial<Navigator> = {}, mockClock = true) {
  if (mockClock) t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 100_000 });
  const page = new EventTarget();
  const screen = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const navigator = { onLine: true, webdriver: false, ...overrides };
  const requests: Array<{ url: RequestInfo | URL; init?: RequestInit }> = [];
  let respond = async () => new Response(null, { status: 204 });

  function windowFor() {
    return {
      navigator,
      document: screen,
      addEventListener: page.addEventListener.bind(page),
      removeEventListener: page.removeEventListener.bind(page),
      setTimeout,
      clearTimeout,
      fetch: async (url: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url, init });
        return respond();
      },
    } as unknown as Browser;
  }

  return {
    navigator, requests, windowFor,
    setResponse: (value: typeof respond) => { respond = value; },
    gesture(type = "pointerdown", trusted = true) {
      const event = Object.defineProperty(new Event(type), "isTrusted", { value: trusted });
      page.dispatchEvent(event);
    },
    wake: (type: string) => page.dispatchEvent(new Event(type)),
    visibility(value: string) {
      screen.visibilityState = value;
      screen.dispatchEvent(new Event("visibilitychange"));
    },
    async advance(ms: number) {
      t.mock.timers.tick(ms);
      await setImmediate();
    },
  };
}

function tabBroadcastChannel() {
  const tabs = new Set<TestBroadcastChannel>();
  class TestBroadcastChannel {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    constructor() { tabs.add(this); }
    postMessage(data: unknown) {
      for (const tab of tabs) {
        if (tab !== this) queueMicrotask(() => tab.onmessage?.({ data }));
      }
    }
    close() { tabs.delete(this); }
  }
  return TestBroadcastChannel as unknown as typeof BroadcastChannel;
}

test("a visible tab starts and renews presence without interaction, then pauses when hidden or offline", async t => {
  const browser = browserHarness(t);
  const tracker = startWebsiteOnlinePresence(browser.windowFor());
  t.after(tracker.dispose);
  tracker.setIdentity("guest");
  await browser.advance(2000);
  const [request] = browser.requests;
  assert.equal(request?.url, "/api/identity/online-presence");
  assert.equal(request.init?.method, "POST");
  assert.equal(request.init?.credentials, "same-origin");
  assert.equal(request.init?.referrerPolicy, "origin");
  assert.equal(request.init?.body, undefined);

  await browser.advance(31_000);
  assert.equal(browser.requests.length, 2);
  browser.visibility("hidden");
  await browser.advance(100_000);
  assert.equal(browser.requests.length, 2);

  browser.visibility("visible");
  await browser.advance(2000);
  assert.equal(browser.requests.length, 3);
  browser.navigator.onLine = false;
  browser.wake("offline");
  await browser.advance(100_000);
  assert.equal(browser.requests.length, 3);

  browser.navigator.onLine = true;
  browser.wake("online");
  await browser.advance(2000);
  assert.equal(browser.requests.length, 4);
});

test("heartbeats respect the cadence and a known identity change sends immediately", async t => {
  const browser = browserHarness(t);
  const tracker = startWebsiteOnlinePresence(browser.windowFor());
  t.after(tracker.dispose);
  tracker.setIdentity("guest");
  browser.gesture();
  await browser.advance(2000);
  await browser.advance(20_000);
  browser.gesture("keydown");
  await browser.advance(12_000);
  assert.equal(browser.requests.length, 2);

  tracker.setIdentity("account-session");
  await browser.advance(2000);
  assert.equal(browser.requests.length, 3);
  tracker.dispose();
  assert.equal(browser.requests.at(-1)?.init?.signal?.aborted, false);
  browser.gesture();
  await browser.advance(60_000);
  assert.equal(browser.requests.length, 3);
});

test("reconnection retries a transient request but respects server retry-after", async t => {
  const browser = browserHarness(t);
  const tracker = startWebsiteOnlinePresence(browser.windowFor());
  t.after(tracker.dispose);
  tracker.setIdentity("guest");
  browser.setResponse(async () => { throw new Error("disconnected"); });
  browser.gesture();
  await browser.advance(2000);
  assert.equal(browser.requests.length, 1);

  browser.setResponse(async () => new Response(null, { status: 503, headers: { "Retry-After": "12" } }));
  browser.wake("online");
  await browser.advance(50);
  assert.equal(browser.requests.length, 2);
  browser.wake("focus");
  await browser.advance(1000);
  assert.equal(browser.requests.length, 2);

  browser.setResponse(async () => new Response(null, { status: 204 }));
  await browser.advance(12_000);
  assert.equal(browser.requests.length, 3);
});

test("browser-identified webdriver automation sends no heartbeat", async t => {
  const browser = browserHarness(t, { webdriver: true });
  const tracker = startWebsiteOnlinePresence(browser.windowFor());
  t.after(tracker.dispose);
  tracker.setIdentity("guest");
  browser.gesture();
  await browser.advance(35_000);
  assert.equal(browser.requests.length, 0);
});

test("concurrent tabs serialize first-cookie issuance and share one send cadence", async t => {
  let taken = false;
  const locks = {
    async request(name: string, options: { ifAvailable: boolean }, enter: LockGrantedCallback<unknown>) {
      assert.equal(name, "kurioticket:online-presence");
      assert.equal(options.ifAvailable, true);
      if (taken) return enter(null);
      taken = true;
      try {
        return await enter({ name, mode: "exclusive" });
      } finally {
        taken = false;
      }
    },
  } as LockManager;
  const transport = { BroadcastChannel: tabBroadcastChannel() };
  const first = browserHarness(t, { locks });
  const second = browserHarness(t, { locks }, false);
  const trackers = [first, second].map(tab => startWebsiteOnlinePresence({ ...tab.windowFor(), ...transport }));
  t.after(() => trackers.forEach(tracker => tracker.dispose()));
  for (const tracker of trackers) tracker.setIdentity("guest");

  const response = Promise.withResolvers<Response>();
  first.setResponse(() => response.promise);
  first.gesture();
  second.gesture();
  await first.advance(2);
  assert.equal(first.requests.length, 1);
  assert.equal(second.requests.length, 0);
  response.resolve(new Response(null, { status: 204 }));
  await first.advance(2500);
  assert.equal(second.requests.length, 0);

  trackers[0].dispose();
  await first.advance(20_000);
  second.gesture();
  await first.advance(9000);
  assert.equal(first.requests.length, 1);
  assert.equal(second.requests.length, 1);
});

test("a tab without Web Locks waits for current cookie issuance and can retry when it fails", async t => {
  const transport = { BroadcastChannel: tabBroadcastChannel() };
  const first = browserHarness(t);
  const firstTracker = startWebsiteOnlinePresence({ ...first.windowFor(), ...transport });
  t.after(firstTracker.dispose);
  firstTracker.setIdentity("guest");
  const response = Promise.withResolvers<Response>();
  first.setResponse(() => response.promise);
  first.gesture();
  await first.advance(500);
  assert.equal(first.requests.length, 1);

  const second = browserHarness(t, {}, false);
  const secondTracker = startWebsiteOnlinePresence({ ...second.windowFor(), ...transport });
  t.after(secondTracker.dispose);
  secondTracker.setIdentity("guest");
  second.gesture();
  await first.advance(0);
  await first.advance(500);
  assert.equal(second.requests.length, 0);

  response.resolve(new Response(null, { status: 503 }));
  await first.advance(0);
  await first.advance(500);
  assert.equal(second.requests.length, 1);
});

test("cookie bootstrap confirms the guest heartbeat under the same browser lock", async t => {
  let acquired = 0;
  let holding = false;
  const locks = {
    async request(name: string, _options: LockOptions, enter: LockGrantedCallback<unknown>) {
      acquired++;
      holding = true;
      try {
        return await enter({ name, mode: "exclusive" });
      } finally {
        holding = false;
      }
    },
  } as LockManager;
  const browser = browserHarness(t, { locks });
  browser.setResponse(async () => {
    assert.equal(holding, true);
    return new Response(null, { status: browser.requests.length === 1 ? 202 : 204 });
  });
  const tracker = startWebsiteOnlinePresence(browser.windowFor());
  t.after(tracker.dispose);
  tracker.setIdentity("guest");
  browser.gesture();
  await browser.advance(1000);
  assert.equal(browser.requests.length, 2);
  assert.equal(acquired, 1);
});

test("a browser that cannot retain a cookie retries bootstrap only once before backing off", async t => {
  const browser = browserHarness(t);
  browser.setResponse(async () => new Response(null, { status: 202 }));
  const tracker = startWebsiteOnlinePresence(browser.windowFor());
  t.after(tracker.dispose);
  tracker.setIdentity("guest");
  browser.gesture();
  await browser.advance(1000);
  assert.equal(browser.requests.length, 2);
  browser.wake("online");
  browser.wake("focus");
  browser.gesture("keydown");
  await browser.advance(20_000);
  assert.equal(browser.requests.length, 2);
});
