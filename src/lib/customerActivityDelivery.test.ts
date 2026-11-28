import assert from "node:assert/strict";
import test from "node:test";
import { createCustomerActivityDelivery } from "./customerActivityDelivery";
import { analyticsConfirmationHeader } from "./visitor-consent-constants";

const pageEndpoint = "/api/activity/page-views";
const payload = { eventId: "00000000-0000-4000-8000-000000000001", pageKey: "flight_results" };
const proof = "b".repeat(64);
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

function fixture(respond: (attempt: number) => Promise<Response>) {
  const calls: RequestInit[] = [];
  const timers = new Map<number, { delay: number; run: () => void }>();
  const grant = new AbortController();
  let consent: AbortSignal | null = grant.signal;
  let timerId = 0;
  const deliver = createCustomerActivityDelivery({
    request: (_endpoint, init) => { calls.push(init); return respond(calls.length); },
    currentConsent: () => consent,
    confirmationProof: (current) => current === grant.signal ? proof : null,
    schedule: (run, delay) => { timers.set(++timerId, { delay, run }); return timerId as unknown as ReturnType<typeof setTimeout>; },
    cancel: timer => { timers.delete(timer as unknown as number); },
  });
  return {
    deliver, calls, timers, grant,
    setConsent: (next: AbortSignal | null) => { consent = next; },
    runTimer: async () => {
      const next = [...timers.entries()].sort((left, right) => left[1].delay - right[1].delay)[0];
      assert.ok(next, "a retry was scheduled");
      timers.delete(next[0]);
      next[1].run();
      await tick();
      return next[1].delay;
    },
  };
}

test("a persisted page with deferred journey evidence retries the same occurrence UUID", async () => {
  const f = fixture(async attempt => Response.json({ accepted: true, retryable: attempt === 1 }, { status: 202 }));
  assert.equal(f.deliver(pageEndpoint, payload, f.grant.signal), true);
  await tick();
  assert.equal(await f.runTimer(), 250);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.calls.map(call => JSON.parse(call.body as string)), [payload, payload]);
  assert.ok(f.calls.every(call => call.credentials === "same-origin" && call.referrerPolicy === "origin"));
  assert.ok(f.calls.every(call => new Headers(call.headers).get(analyticsConfirmationHeader) === proof));
  assert.equal(f.timers.size, 0);
});

test("transient failures use bounded attempts and honor an applicable Retry-After", async () => {
  const f = fixture(async attempt => {
    if (attempt === 1) throw new Error("Offline");
    return new Response(null, { status: attempt === 2 ? 429 : 503,
      ...(attempt === 2 ? { headers: { "Retry-After": "2" } } : {}) });
  });
  f.deliver(pageEndpoint, payload, f.grant.signal);
  await tick();
  for (const wait of [250, 2000, 3000]) assert.equal(await f.runTimer(), wait);
  assert.equal(f.calls.length, 4);
  assert.equal(f.timers.size, 0);
});

test("an explicit identity rejection is terminal even when the transport returns 202", async () => {
  const f = fixture(async () => Response.json({ accepted: false }, { status: 202 }));
  f.deliver(pageEndpoint, payload, f.grant.signal);
  await tick();
  assert.equal(f.calls.length, 1);
  assert.equal(f.timers.size, 0);
});

test("withdrawal aborts an in-flight request and account changes cancel the previous retry", async () => {
  let complete!: (response: Response) => void;
  const f = fixture(async () => new Promise<Response>(resolve => { complete = resolve; }));
  f.deliver(pageEndpoint, payload, f.grant.signal);
  f.grant.abort();
  assert.equal(f.calls[0].signal?.aborted, true);
  complete(new Response(null, { status: 503 }));
  await tick();
  assert.equal(f.timers.size, 0);
  assert.equal(f.deliver(pageEndpoint, payload, f.grant.signal), false);

  const account = fixture(async () => new Response(null, { status: 503 }));
  account.deliver(pageEndpoint, payload, account.grant.signal);
  await tick();
  account.setConsent(new AbortController().signal);
  await account.runTimer();
  assert.equal(account.calls.length, 1);
  assert.equal(account.timers.size, 0);
});
