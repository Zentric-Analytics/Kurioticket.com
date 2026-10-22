import assert from "node:assert/strict";
import test from "node:test";
import { createIdentityHandlers } from "./visitor-identity-route";
import { createVisitorToken, visitorCookieName } from "./visitor-identity";
import { visitorDenialCookieName } from "./visitor-consent-constants";

const browserToken = createVisitorToken();
const nativeToken = createVisitorToken();
const issuedToken = createVisitorToken();
type Dependencies = Parameters<typeof createIdentityHandlers>[0];

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
