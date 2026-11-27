import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createNativePresenceClient, type ExistingGuestPresenceCredentials } from "./nativePresenceClient";

function fixture(
  context: TestContext,
  respond: (request: Request, attempt: number) => Promise<Response> | Response,
  platform: "ios" | "android" = "ios",
  options: { baseUrl?: string; readGuestCredentials?: () => ExistingGuestPresenceCredentials } = {},
) {
  context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: new Date("2026-11-18T01:00:00Z") });
  const requests: Request[] = [];
  const client = createNativePresenceClient(options.baseUrl ?? "https://staging.kurioticket.com", platform, async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return respond(request, requests.length);
  }, options.readGuestCredentials);
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

test("foreground presence renews without touch activity and pauses in the background", async context => {
  const { client, requests } = fixture(context, () => ok());
  client.setSession(null);
  assert.equal(requests.length, 0);
  client.setForeground(true);
  await flush();
  context.mock.timers.tick(30_000);
  await flush();
  assert.equal(requests.length, 2);
  context.mock.timers.tick(30_000);
  await flush();
  assert.equal(requests.length, 3);

  client.setForeground(false);
  context.mock.timers.tick(120_000);
  await flush();
  assert.equal(requests.length, 3);
  client.setForeground(true);
  await flush();
  assert.equal(requests.length, 4);
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

function searchCredential(platform: "ios" | "android", expiresAt = Date.now() + 30 * 60_000) {
  return `v2.00000000-0000-4000-8000-000000000001.${expiresAt}.staging.${platform}.${"A".repeat(43)}`;
}

test("staging guest heartbeat re-reads existing credentials for both bootstrap requests", async context => {
  for (const platform of ["ios", "android"] as const) {
    await context.test(platform, async subtest => {
      let current: ExistingGuestPresenceCredentials = {};
      let reads = 0;
      const { client, requests } = fixture(subtest, (_, attempt) => {
        if (attempt === 1) {
          current = { visitorToken: "B".repeat(43), operationalSearchCredential: searchCredential(platform, Date.now() + 60_000) };
          return issue("live-credential");
        }
        return ok();
      }, platform, { readGuestCredentials: () => { reads++; return current; } });
      const original = searchCredential(platform);
      current = { visitorToken: "A".repeat(43), operationalSearchCredential: original };
      client.setSession(null);
      client.setForeground(true);
      await flush();
      assert.equal(requests.length, 2);
      assert.equal(reads, 2);
      assert.equal(requests[0].headers.get("x-kt-visitor"), "A".repeat(43));
      assert.equal(requests[0].headers.get("x-kt-search-session"), original);
      assert.equal(requests[1].headers.get("x-kt-visitor"), current.visitorToken);
      assert.equal(requests[1].headers.get("x-kt-search-session"), current.operationalSearchCredential);
      assert.equal(requests[1].headers.get("x-kt-presence-session"), "live-credential");

      client.setSession(session);
      await flush();
      assert.equal(reads, 2, "account heartbeat never reads optional guest credentials");
      assert.equal(requests[2].headers.get("x-kt-visitor"), null);
      assert.equal(requests[2].headers.get("x-kt-search-session"), null);
    });
  }
});

test("production and unrelated origins do not read or forward guest history credentials", async context => {
  for (const baseUrl of ["https://kurioticket.com", "https://staging.kurioticket.com.attacker.invalid", "http://staging.kurioticket.com"]) {
    await context.test(baseUrl, async subtest => {
      let reads = 0;
      const { client, requests } = fixture(subtest, () => ok(), "ios", {
        baseUrl, readGuestCredentials: () => { reads++; return { visitorToken: "A".repeat(43) }; },
      });
      client.setSession(null);
      client.setForeground(true);
      await flush();
      client.refreshGuestCredentials();
      await flush();
      assert.equal(requests.length, 1);
      assert.equal(reads, 0, "credentials are not read outside staging");
      assert.equal(requests[0].headers.get("x-kt-visitor"), null);
      assert.equal(requests[0].headers.get("x-kt-search-session"), null);
    });
  }
});

test("native presence rejects malformed, expired, cross-platform, and legacy search context", async context => {
  const invalid = [
    (valid: string) => valid.replace(/^v2\./, "v1.").replace(".ios.", "."),
    (valid: string) => valid.replace(".staging.", ".production."),
    (valid: string) => valid.replace(".ios.", ".android."),
    () => searchCredential("ios", Date.now()),
    () => searchCredential("ios", Date.now() + 30 * 60_000 + 1),
    () => "not-a-credential",
  ];
  for (let index = 0; index < invalid.length; index++) {
    await context.test(String(index), async subtest => {
      const { client, requests } = fixture(subtest, () => ok(), "ios", {
        readGuestCredentials: () => ({ visitorToken: "not-a-visitor", operationalSearchCredential: invalid[index](searchCredential("ios")) }),
      });
      client.setSession(null);
      client.setForeground(true);
      await flush();
      assert.equal(requests[0].headers.get("x-kt-visitor"), null);
      assert.equal(requests[0].headers.get("x-kt-search-session"), null);
    });
  }
});

test("consent and search-context changes promptly update or clear a guest heartbeat", async context => {
  let current: ExistingGuestPresenceCredentials = {};
  const { client, requests } = fixture(context, () => ok(), "ios", { readGuestCredentials: () => current });
  client.setSession(null);
  client.setForeground(true);
  await flush();
  current = { visitorToken: "A".repeat(43), operationalSearchCredential: searchCredential("ios") };
  client.refreshGuestCredentials();
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("x-kt-visitor"), current.visitorToken);
  current = { operationalSearchCredential: current.operationalSearchCredential };
  client.refreshGuestCredentials();
  await flush();
  assert.equal(requests.length, 3);
  assert.equal(requests[2].headers.get("x-kt-visitor"), null);
  assert.equal(requests[2].headers.get("x-kt-search-session"), current.operationalSearchCredential, "essential search continuity survives analytics refusal");
  current = {};
  client.refreshGuestCredentials();
  await flush();
  assert.equal(requests.length, 4);
  assert.equal(requests[3].headers.get("x-kt-search-session"), null);
});

test("an in-flight heartbeat cannot retain withdrawn context in the next request", async context => {
  let finish!: (response: Response) => void;
  let current: ExistingGuestPresenceCredentials = { visitorToken: "A".repeat(43) };
  const { client, requests } = fixture(context, (_, attempt) => attempt === 1
    ? new Promise<Response>(resolve => { finish = resolve; }) : ok(), "ios", { readGuestCredentials: () => current });
  client.setSession(null);
  client.setForeground(true);
  current = {};
  client.refreshGuestCredentials();
  await flush();
  assert.equal(requests.length, 1);
  finish(ok());
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("x-kt-visitor"), null);
});

test("credential notifications coalesce with account transition before sending", async context => {
  const { client, requests } = fixture(context, () => ok(), "ios", {
    readGuestCredentials: () => ({ visitorToken: "A".repeat(43) }),
  });
  client.setSession(null);
  client.setForeground(true);
  await flush();
  client.refreshGuestCredentials();
  client.setSession(session);
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.get("authorization"), "Bearer account-bearer");
  assert.equal(requests[1].headers.get("x-kt-visitor"), null);
});

test("expired stored accounts and unavailable optional readers never supply guest context", async context => {
  for (const expired of [false, true]) {
    await context.test(String(expired), async subtest => {
      let reads = 0;
      const { client, requests } = fixture(subtest, () => ok(), "ios", {
        readGuestCredentials: () => { reads++; throw new Error("optional reader unavailable"); },
      });
      client.setSession(expired ? { ...session, expires: "2026-11-01T00:00:00Z" } : null);
      client.setForeground(true);
      await flush();
      assert.equal(requests.length, 1);
      assert.equal(reads, expired ? 0 : 1);
      assert.equal(requests[0].headers.get("x-kt-visitor"), null);
      assert.equal(requests[0].headers.get("x-kt-search-session"), null);
    });
  }
});
