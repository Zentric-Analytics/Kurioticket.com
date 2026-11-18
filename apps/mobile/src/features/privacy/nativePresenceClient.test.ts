import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createNativePresenceClient } from "./nativePresenceClient";

function fixture(
  context: TestContext,
  respond: (request: Request, attempt: number) => Promise<Response> | Response,
  platform: "ios" | "android" = "ios",
) {
  context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: new Date("2026-11-18T01:00:00Z") });
  const requests: Request[] = [];
  const client = createNativePresenceClient("https://staging.kurioticket.com", platform, async (input, options) => {
    const request = new Request(input, options);
    requests.push(request);
    return respond(request, requests.length);
  });
  context.after(() => client.stop());
  return { client, requests };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const ok = (credential?: string) => new Response(null, {
  status: 204,
  headers: credential ? { "x-kt-presence-session": credential } : {},
});
const issue = (credential: string) => new Response(null, {
  status: 202,
  headers: { "x-kt-presence-session": credential },
});
const session = { token: "account-bearer", expires: "2026-12-01T00:00:00Z" };

test("native guests and accounts share one credential through sign-in and logout", async context => {
  for (const platform of ["ios", "android"] as const) {
    await context.test(platform, async subtest => {
      const { client, requests } = fixture(subtest, (_, attempt) => attempt === 1 ? issue("guest-credential") : ok(), platform);
      client.setForeground(true);
      assert.equal(requests.length, 0, "waits for session hydration");
      client.setSession(null);
      await flush();
      client.setSession(session);
      await flush();
      client.setSession(null);
      await flush();

      assert.deepEqual(requests.map(request => ({
        url: request.url,
        method: request.method,
        credentials: request.credentials,
        platform: request.headers.get("x-mobile-platform"),
        session: request.headers.get("x-kt-presence-session"),
        authorization: request.headers.get("authorization"),
        analytics: request.headers.get("x-kt-visitor"),
        body: request.body,
      })), [
        { url: "https://staging.kurioticket.com/api/mobile/v1/presence", method: "POST", credentials: "omit", platform, session: null, authorization: null, analytics: null, body: null },
        { url: "https://staging.kurioticket.com/api/mobile/v1/presence", method: "POST", credentials: "omit", platform, session: "guest-credential", authorization: null, analytics: null, body: null },
        { url: "https://staging.kurioticket.com/api/mobile/v1/presence", method: "POST", credentials: "omit", platform, session: "guest-credential", authorization: "Bearer account-bearer", analytics: null, body: null },
        { url: "https://staging.kurioticket.com/api/mobile/v1/presence", method: "POST", credentials: "omit", platform, session: "guest-credential", authorization: null, analytics: null, body: null },
      ]);
    });
  }
});

test("presence pauses on backgrounding and idleness, then resumes on use", async context => {
  const { client, requests } = fixture(context, () => ok());
  client.setSession(null);
  assert.equal(requests.length, 0);
  client.setForeground(true);
  await flush();
  context.mock.timers.tick(30_000);
  await flush();
  assert.equal(requests.length, 1, "does not renew on an idle timer");

  client.noteActivity();
  await flush();
  assert.equal(requests.length, 2);
  client.setForeground(false);
  context.mock.timers.tick(120_000);
  await flush();
  assert.equal(requests.length, 2);
  client.setForeground(true);
  await flush();
  assert.equal(requests.length, 3);
});

test("recent interaction keeps the next cadence-limited heartbeat scheduled", async context => {
  const { client, requests } = fixture(context, () => ok());
  client.setSession(null);
  client.setForeground(true);
  await flush();
  context.mock.timers.tick(20_000);
  client.noteActivity();
  await flush();
  assert.equal(requests.length, 1);
  context.mock.timers.tick(10_000);
  await flush();
  assert.equal(requests.length, 2);
});

test("credential issuance does not start a heartbeat after backgrounding", async context => {
  let finishIssuance!: (response: Response) => void;
  const { client, requests } = fixture(context, (_, attempt) => attempt === 1
    ? new Promise<Response>(resolve => { finishIssuance = resolve; })
    : ok());
  client.setSession(null);
  client.setForeground(true);
  client.setForeground(false);
  finishIssuance(issue("guest-credential"));
  await flush();
  assert.equal(requests.length, 1);

  context.mock.timers.tick(30_000);
  client.setForeground(true);
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("x-kt-presence-session"), "guest-credential");
});

test("a sign-in during guest issuance reuses the returned credential", async context => {
  let finishGuest!: (response: Response) => void;
  const { client, requests } = fixture(context, (_, attempt) => attempt === 1
    ? new Promise<Response>(resolve => { finishGuest = resolve; })
    : ok());
  client.setForeground(true);
  client.setSession(null);
  client.setSession(session);
  assert.equal(requests.length, 1);

  finishGuest(issue("guest-credential"));
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("x-kt-presence-session"), "guest-credential");
  assert.equal(requests[1].headers.get("authorization"), "Bearer account-bearer");
});

test("a rejected bearer does not produce anonymous heartbeats before logout", async context => {
  const { client, requests } = fixture(context, (_, attempt) => attempt === 1 ? new Response(null, { status: 401 }) : ok());
  client.setSession(session);
  client.setForeground(true);
  await flush();
  context.mock.timers.tick(30_000);
  client.noteActivity();
  client.setSession({ ...session });
  await flush();
  assert.equal(requests.length, 1);

  client.setSession(null);
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("authorization"), null);
});

test("network failure does not prevent a later heartbeat", async context => {
  const { client, requests } = fixture(context, (_, attempt) => {
    if (attempt === 1) throw new Error("offline");
    return ok();
  });
  client.setSession(null);
  client.setForeground(true);
  await flush();
  context.mock.timers.tick(20_000);
  client.noteActivity();
  context.mock.timers.tick(10_000);
  await flush();
  assert.equal(requests.length, 2);
});

test("rate limits and older servers suppress repeated foreground requests", async context => {
  for (const [status, retryAfter, delay] of [[429, "60", 60_000], [503, "60", 60_000], [404, undefined, 300_000], [405, undefined, 300_000]] as const) {
    await context.test(String(status), async subtest => {
      const { client, requests } = fixture(subtest, (_, attempt) => attempt === 1
        ? new Response(null, { status, headers: retryAfter ? { "Retry-After": retryAfter } : {} })
        : ok());
      client.setSession(null);
      client.setForeground(true);
      await flush();
      client.setForeground(false);
      subtest.mock.timers.tick(delay - 1000);
      client.setForeground(true);
      await flush();
      assert.equal(requests.length, 1);
      subtest.mock.timers.tick(1000);
      await flush();
      assert.equal(requests.length, 2);
    });
  }
});

test("recovery-only sessions cannot send either kind of heartbeat", async context => {
  const { client, requests } = fixture(context, () => ok());
  client.setSession({ ...session, recovery: { deadline: "2026-11-19T00:00:00Z" } });
  client.setForeground(true);
  await flush();
  assert.equal(requests.length, 0);
});
