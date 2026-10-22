import assert from "node:assert/strict";
import { test as runTest } from "node:test";
import { createIdentityHandlers } from "./visitor-identity-route";
import { createVisitorToken, visitorCookieName } from "./visitor-identity";
import { visitorDenialCookieName } from "./visitor-consent-constants";
import { analyticsConsentPolicyVersion, createVisitorConsentSynchronizer, type AnalyticsConsentChoice } from "./analyticsConsentClient";

const browserToken = createVisitorToken();
const nativeToken = createVisitorToken();
const issuedToken = createVisitorToken();
type Dependencies = Parameters<typeof createIdentityHandlers>[0];
const publicOrigin = "https://staging.kurioticket.com";

async function withOrigins(values: { app?: string; auth?: string }, work: () => Promise<void>) {
  const previous = { app: process.env.NEXT_PUBLIC_APP_URL, auth: process.env.NEXTAUTH_URL };
  try {
    if (values.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = values.app;
    if (values.auth === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = values.auth;
    await work();
  } finally {
    if (previous.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous.app;
    if (previous.auth === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previous.auth;
  }
}

// Each case owns both canonical URL settings, including older direct-URL cases.
function test(name: string, work: () => Promise<void>) {
  return runTest(name, () => withOrigins({}, work));
}

function fixture(transport: "web" | "native" = "web") {
  const calls: Array<{ operation: string; value: unknown }> = [];
  let userId: string | null = null;
  let fail = false;
  const identity: Dependencies["identity"] = {
    async registerAnalyticsVisitor(input) {
      calls.push({ operation: "register", value: input });
      if (fail) throw new Error("private database connection details");
      return { id: "visitor-1", token: issuedToken, created: true };
    },
    async getAnalyticsVisitorStatus(token, accountId) {
      calls.push({ operation: "status", value: { token, userId: accountId } });
      if (fail) throw new Error("private database connection details");
      return { analyticsTracking: "enabled", linked: false };
    },
    async mergeAnalyticsVisitor(input) {
      calls.push({ operation: "merge", value: input });
      if (fail) throw new Error("private database connection details");
      return input.token ? { id: "visitor-1", token: issuedToken, created: true } : null;
    },
    async withdrawAnalyticsConsent(token) {
      calls.push({ operation: "withdraw", value: token });
      if (fail) throw new Error("private database connection details");
      return true;
    },
  };
  const dependencies: Dependencies = { transport, identity, authenticate: async () => userId ? { userId } : null, rateLimit: () => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 }) };
  return { calls, dependencies, handlers: createIdentityHandlers(dependencies), setUser: (id: string | null) => { userId = id; }, setFail: (value: boolean) => { fail = value; } };
}

function request(method: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request("https://kurioticket.com/api/identity/visitor", {
    method,
    headers: { origin: "https://kurioticket.com", cookie: `${visitorCookieName}=${browserToken}`, "x-kt-visitor": nativeToken, ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function proxyRequest(method: string, body?: unknown, extraHeaders: Record<string, string> = {}, path = "/api/identity/visitor") {
  return new Request(`http://127.0.0.1:10000${path}`, {
    method,
    headers: {
      origin: publicOrigin,
      host: "internal-service:10000",
      "x-forwarded-host": "staging.kurioticket.com",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "same-origin",
      cookie: `${visitorCookieName}=${browserToken}`,
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("the configured public origin completes grant, status, sign-in merge, and withdrawal behind a proxy", async () => {
  await withOrigins({ app: publicOrigin, auth: "https://other-auth.example" }, async () => {
    const f = fixture();
    const granted = await f.handlers.POST(proxyRequest("POST", { analytics: true, policyVersion: "analytics-v1" }));
    assert.equal(granted.status, 201);
    assert.deepEqual(await granted.json(), { analyticsTracking: "enabled" });
    assert.match(granted.headers.get("set-cookie")!, /HttpOnly/);
    assert.ok(granted.headers.get("set-cookie")?.includes(issuedToken));

    const cookie = `${visitorCookieName}=${issuedToken}`;
    const status = await f.handlers.GET(proxyRequest("GET", undefined, { cookie }));
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { analyticsTracking: "enabled", linked: false });
    assert.equal(status.headers.has("set-cookie"), false);

    f.setUser("verified-account");
    const merged = await f.handlers.MERGE(proxyRequest("POST", undefined, { cookie }, "/api/identity/merge"));
    assert.equal(merged.status, 200);
    assert.deepEqual(await merged.json(), { merged: true });

    const withdrawn = await f.handlers.DELETE(proxyRequest("DELETE", undefined, { cookie: `${cookie}; ${visitorDenialCookieName}=1` }));
    assert.equal(withdrawn.status, 200);
    assert.deepEqual(await withdrawn.json(), { analyticsTracking: "disabled" });
    assert.match(withdrawn.headers.get("set-cookie")!, /Max-Age=0/);
    assert.deepEqual(f.calls, [
      { operation: "register", value: { token: browserToken, userId: null, policyVersion: "analytics-v1" } },
      { operation: "status", value: { token: issuedToken, userId: null } },
      { operation: "merge", value: { token: issuedToken, userId: "verified-account", source: "ACCOUNT_API" } },
      { operation: "withdraw", value: issuedToken },
    ]);
  });
});

test("the auth URL fallback permits public-origin consent while invalid bodies remain non-mutating", async () => {
  await withOrigins({ auth: publicOrigin }, async () => {
    const f = fixture();
    const invalid = await f.handlers.POST(proxyRequest("POST", { analyticsTracking: false }));
    assert.equal(invalid.status, 400, "a same-origin invalid body reaches validation, not an origin403");
    assert.deepEqual(await invalid.json(), { error: "Analytics consent is required to enable visitor tracking." });
    assert.equal(f.calls.length, 0);
    assert.equal((await f.handlers.POST(proxyRequest("POST", { analytics: true }))).status, 201);
    assert.equal(f.calls.length, 1);
  });
});

test("the privacy synchronizer saves allow, account linkage, and decline through proxy-backed identity handlers", async () => {
  await withOrigins({ app: publicOrigin }, async () => {
    const f = fixture();
    f.setUser("verified-account");
    let choice: AnalyticsConsentChoice = "granted";
    let cookie = `${visitorCookieName}=${browserToken}`;
    const states: string[] = [];
    const saved: AnalyticsConsentChoice[] = [];
    const sync = createVisitorConsentSynchronizer({
      readChoice: () => choice,
      onState: state => { states.push(state); },
      onSaved: context => { saved.push(context.choice); },
      request: async (url, init) => {
        assert.equal(init.credentials, "same-origin");
        const incoming = proxyRequest(init.method!, init.body ? JSON.parse(init.body as string) : undefined,
          { ...Object.fromEntries(new Headers(init.headers)), cookie }, url);
        const response = url.endsWith("/merge") ? await f.handlers.MERGE(incoming)
          : init.method === "DELETE" ? await f.handlers.DELETE(incoming) : await f.handlers.POST(incoming);
        const issued = response.cookies.get(visitorCookieName);
        if (issued) cookie = `${visitorCookieName}=${issued.value}`;
        return response;
      },
    });
    assert.equal(await sync.sync({ choice, accountKey: "verified-account" }, true), "saved");
    assert.deepEqual(saved, ["granted"]);
    choice = "declined";
    cookie += `; ${visitorDenialCookieName}=1`;
    assert.equal(await sync.sync({ choice, accountKey: "verified-account" }, true), "saved");
    assert.deepEqual(saved, ["granted", "declined"]);
    assert.deepEqual(states, ["saving", "saved", "saving", "saved"], "neither choice leaves the UI in the retry-error state");
    assert.deepEqual(f.calls, [
      { operation: "register", value: { token: browserToken, userId: "verified-account", policyVersion: analyticsConsentPolicyVersion } },
      { operation: "merge", value: { token: issuedToken, userId: "verified-account", source: "ACCOUNT_API" } },
      { operation: "withdraw", value: issuedToken },
    ]);
    assert.equal(cookie, `${visitorCookieName}=`);
  });
});

test("spoofed proxy hosts, cross-site metadata, and a matching internal origin cannot authorize identity requests", async () => {
  await withOrigins({ app: publicOrigin }, async () => {
    const f = fixture();
    f.setUser("verified-account");
    const deniedHeaders: Array<Record<string, string>> = [
      { origin: "https://attacker.example", host: "attacker.example", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https", forwarded: "host=attacker.example;proto=https" },
      { origin: "http://127.0.0.1:10000" },
      { origin: "https://staging.kurioticket.com.attacker.example" },
      { origin: publicOrigin, "sec-fetch-site": "cross-site" },
      { origin: "null" },
    ];
    for (const headers of deniedHeaders) {
      for (const [method, handler] of [["GET", f.handlers.GET], ["POST", f.handlers.POST], ["DELETE", f.handlers.DELETE], ["POST", f.handlers.MERGE]] as const) {
        const response = await handler(proxyRequest(method, method === "POST" ? { analytics: true } : undefined, headers));
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: "Invalid request origin." });
      }
    }
    assert.equal(f.calls.length, 0);
  });
});

test("malformed canonical configuration cannot silently fall back to the auth URL or request URL", async () => {
  await withOrigins({ app: "not a valid URL", auth: "https://kurioticket.com" }, async () => {
    const f = fixture();
    f.setUser("verified-account");
    for (const [method, handler] of [["GET", f.handlers.GET], ["POST", f.handlers.POST], ["DELETE", f.handlers.DELETE], ["POST", f.handlers.MERGE]] as const) {
      assert.equal((await handler(request(method, method === "POST" ? { analytics: true } : undefined))).status, 403);
    }
    assert.equal(f.calls.length, 0);
  });
});

test("native iOS and Android identity calls keep their headerless-origin flow under canonical web configuration", async () => {
  await withOrigins({ app: publicOrigin }, async () => {
    for (const platform of ["ios", "android"]) {
      const f = fixture("native");
      f.setUser("verified-native-account");
      const nativeRequest = (method: string, body?: unknown, origin?: string) => new Request("http://127.0.0.1:10000/api/mobile/v1/identity/visitor", {
        method,
        credentials: "omit",
        headers: { "x-mobile-platform": platform, "x-kt-visitor": nativeToken, authorization: "Bearer validated", ...(origin ? { origin } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      assert.deepEqual(await (await f.handlers.GET(nativeRequest("GET"))).json(), { analyticsTracking: "enabled", linked: false });
      const granted = await f.handlers.POST(nativeRequest("POST", { analytics: true }));
      assert.equal(granted.status, 201);
      assert.deepEqual(await granted.json(), { analyticsTracking: "enabled", visitorToken: issuedToken });
      assert.equal(granted.headers.has("set-cookie"), false);
      const merged = await f.handlers.MERGE(nativeRequest("POST"));
      assert.deepEqual(await merged.json(), { merged: true, visitorToken: issuedToken });
      assert.equal(merged.headers.has("set-cookie"), false);
      const withdrawn = await f.handlers.DELETE(nativeRequest("DELETE"));
      assert.deepEqual(await withdrawn.json(), { analyticsTracking: "disabled" });
      assert.equal(withdrawn.headers.has("set-cookie"), false);
      assert.deepEqual(f.calls.map(call => call.operation), ["status", "register", "merge", "withdraw"]);
      assert.equal((await f.handlers.POST(nativeRequest("POST", { analytics: true }, "https://attacker.example"))).status, 403);
      assert.equal(f.calls.length, 4, "a native marker never bypasses a supplied foreign Origin");
    }
  });
});

test("web grants return only a HttpOnly cookie; native grants return only the native token", async () => {
  for (const transport of ["web", "native"] as const) {
    const f = fixture(transport);
    const response = await f.handlers.POST(request("POST", { analytics: true, policyVersion: "v1" }));
    assert.equal(response.status, 201);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.deepEqual(f.calls[0], { operation: "register", value: { token: transport === "web" ? browserToken : nativeToken, userId: null, policyVersion: "v1" } });
    if (transport === "web") {
      assert.deepEqual(await response.json(), { analyticsTracking: "enabled" });
      assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
      assert.match(response.headers.get("set-cookie")!, /SameSite=lax/);
    } else {
      assert.deepEqual(await response.json(), { analyticsTracking: "enabled", visitorToken: issuedToken });
      assert.equal(response.headers.has("set-cookie"), false);
    }
  }
});

test("consent grants require explicit true and reject injected account identifiers", async () => {
  const f = fixture();
  for (const body of [{}, { analytics: false }, { analytics: "true" }, { analytics: true, userId: "victim" }, { analytics: true, policyVersion: "x".repeat(3000) }]) {
    assert.equal((await f.handlers.POST(request("POST", body))).status, 400);
  }
  assert.equal(f.calls.length, 0);
});

test("status is read-only and scoped to the authoritative current account", async () => {
  const f = fixture();
  f.setUser("account-a");
  const response = await f.handlers.GET(request("GET"));
  assert.deepEqual(await response.json(), { analyticsTracking: "enabled", linked: false });
  assert.deepEqual(f.calls, [{ operation: "status", value: { token: browserToken, userId: "account-a" } }]);
  assert.equal(response.headers.has("set-cookie"), false);
});

test("merge requires authentication and never accepts the caller's account identity", async () => {
  const f = fixture();
  assert.equal((await f.handlers.MERGE(request("POST", { userId: "victim" }))).status, 401);
  assert.equal(f.calls.length, 0);
  f.setUser("actual-account");
  const response = await f.handlers.MERGE(request("POST", { userId: "victim" }));
  assert.equal(response.status, 200);
  assert.deepEqual(f.calls, [{ operation: "merge", value: { token: browserToken, userId: "actual-account", source: "ACCOUNT_API" } }]);
  assert.deepEqual(await response.json(), { merged: true });
  assert.ok(response.headers.get("set-cookie")?.includes(issuedToken));
});

test("native merge returns a rotation token without writing browser cookies", async () => {
  const f = fixture("native");
  f.setUser("actual-account");
  const response = await f.handlers.MERGE(request("POST"));
  assert.deepEqual(await response.json(), { merged: true, visitorToken: issuedToken });
  assert.equal(response.headers.has("set-cookie"), false);
  assert.deepEqual(f.calls[0], { operation: "merge", value: { token: nativeToken, userId: "actual-account", source: "ACCOUNT_API" } });
});

test("withdrawal failures retain credentials and never falsely acknowledge revocation", async () => {
  for (const transport of ["web", "native"] as const) {
    const f = fixture(transport);
    f.setFail(true);
    const failed = await f.handlers.DELETE(request("DELETE"));
    assert.equal(failed.status, 503);
    assert.equal(failed.headers.has("set-cookie"), false);
    assert.doesNotMatch(await failed.text(), /private|database connection|disabled/);
    f.setFail(false);
    const response = await f.handlers.DELETE(request("DELETE"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { analyticsTracking: "disabled" });
    if (transport === "web") assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  }
});

test("browser denial stops status and merge immediately while withdrawal still receives its token", async () => {
  const f = fixture();
  f.setUser("account-a");
  const headers = { cookie: `${visitorCookieName}=${browserToken}; ${visitorDenialCookieName}=1` };
  const status = await f.handlers.GET(request("GET", undefined, headers));
  assert.deepEqual(await status.json(), { analyticsTracking: "disabled", linked: false });
  const merged = await f.handlers.MERGE(request("POST", undefined, headers));
  assert.deepEqual(await merged.json(), { merged: false });
  assert.equal(f.calls.length, 0);
  const withdrawal = await f.handlers.DELETE(request("DELETE", undefined, headers));
  assert.equal(withdrawal.status, 200);
  assert.deepEqual(f.calls, [{ operation: "withdraw", value: browserToken }]);
});

test("browser denial permits explicit regrant and never changes native identity status or merging", async () => {
  const headers = { cookie: `${visitorCookieName}=${browserToken}; ${visitorDenialCookieName}=1` };
  const web = fixture();
  assert.equal((await web.handlers.POST(request("POST", { analytics: true }, headers))).status, 201);
  assert.equal(web.calls[0].operation, "register");
  const native = fixture("native");
  native.setUser("account-a");
  assert.deepEqual(await (await native.handlers.GET(request("GET", undefined, headers))).json(), { analyticsTracking: "enabled", linked: false });
  assert.deepEqual(await (await native.handlers.MERGE(request("POST", undefined, headers))).json(), { merged: true, visitorToken: issuedToken });
});

test("storage and authentication errors return safe unavailable responses", async () => {
  const f = fixture();
  f.setFail(true);
  for (const response of [await f.handlers.GET(request("GET")), await f.handlers.POST(request("POST", { analytics: true }))]) {
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /private|enabled|disabled/);
  }
  const handlers = createIdentityHandlers({ ...f.dependencies, authenticate: async () => { throw new Error("session secret"); } });
  const response = await handlers.MERGE(request("POST"));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret/);
});

test("cross-origin requests cannot mutate consent or links", async () => {
  const f = fixture();
  for (const [method, handler] of [["POST", f.handlers.POST], ["DELETE", f.handlers.DELETE], ["POST", f.handlers.MERGE]] as const) {
    assert.equal((await handler(request(method, method === "POST" ? { analytics: true } : undefined, { origin: "https://attacker.example" }))).status, 403);
  }
  assert.equal(f.calls.length, 0);
});

test("rate limiting returns Retry-After and does not mutate identity", async () => {
  const f = fixture();
  const handlers = createIdentityHandlers({ ...f.dependencies, rateLimit: () => ({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 }) });
  const response = await handlers.POST(request("POST", { analytics: true }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(f.calls.length, 0);
});
