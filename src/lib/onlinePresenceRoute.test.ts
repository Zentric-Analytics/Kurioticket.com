import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { isWebsiteOnlinePresenceRoute } from "./onlinePresence";
import { createOnlinePresenceHandler } from "./onlinePresenceRoute";
import { hasConsistentWebsitePresenceOrigin, renewPresenceCredential } from "./onlinePresenceCredential";

const now = new Date("2026-11-18T12:00:00Z");
const secret = "qa-only-operational-presence-signing-material";
const automationSecret = "qa-only-trusted-edge-automation-signing-material";
const cookieName = "kt_online_presence";
const tokenHeader = "x-kt-presence-session";
const webPath = "/api/identity/online-presence";
const nativePath = "/api/mobile/v1/presence";
const origin = "https://kurioticket.example";

function fixture() {
  const records: Array<{ sourceId: string; platform: string; accountSessionId: string | null }> = [];
  const handler = (transport: "web" | "native", environment: "staging" | "production" = "production") =>
    createOnlinePresenceHandler(transport, {
      environment: () => environment,
      secret: () => secret,
      automationSecret: () => automationSecret,
      now: () => now,
      authenticate: async () => ({ id: "canonical-session", platform: transport === "native" ? "ios" : null }),
      admit: () => true,
      record: async (record) => { records.push(record); },
    });
  return { handler, records };
}

function web(headers: HeadersInit = {}, path = webPath) {
  return new Request(origin + path, { method: "POST", headers: { origin, "sec-fetch-site": "same-origin", ...headers } });
}

function native(headers: HeadersInit = {}) {
  return new Request(origin + nativePath, { method: "POST", headers: { "x-mobile-platform": "android", ...headers } });
}

test("a guest uses a secure temporary web cookie independently of analytics consent", async () => {
  const { handler, records } = fixture();
  const post = handler("web");
  const first = await post(web({ cookie: "kt_analytics_consent=declined", "sec-ch-ua-mobile": "?1" }));
  assert.equal(first.status, 202);
  assert.equal(records.length, 0);
  assert.equal((await post(web())).status, 202);
  assert.equal(records.length, 0, "a lost or rejected issuance response contributes no guest");
  assert.equal(first.headers.get(tokenHeader), null);
  assert.match(first.headers.get("cache-control") ?? "", /no-store/);
  const cookie = first.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^kt_online_presence=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Path=\/api\/identity\/online-presence/i);
  assert.doesNotMatch(cookie, /Domain=/i);
  const credential = cookie.split(";")[0];
  assert.equal((await post(web({ cookie: credential, "sec-ch-ua-mobile": "?1" }))).status, 204);
  const second = await post(web({ cookie: credential + "; __Secure-next-auth.session-token.0=jwt" }));
  assert.equal(second.status, 204);
  assert.equal(second.headers.get("set-cookie"), null);
  assert.equal(records[0].platform, "mobile_web");
  assert.equal(records[0].sourceId, records[1].sourceId);
  assert.deepEqual(records.map(record => record.accountSessionId), [null, "canonical-session"]);
});

test("native guest credentials are transport and environment bound and transition to verified account sessions", async () => {
  const { handler, records } = fixture();
  const post = handler("native");
  const first = await post(native());
  assert.equal(first.status, 202);
  const token = first.headers.get(tokenHeader);
  assert.ok(token);
  assert.equal(records.length, 0);
  assert.equal(first.headers.get("set-cookie"), null);
  assert.equal((await post(native({ [tokenHeader]: token }))).status, 204);
  assert.equal((await post(native({ [tokenHeader]: token, authorization: "Bearer valid" }))).status, 204);
  const staging = handler("native", "staging");
  const staged = await staging(native({ [tokenHeader]: token }));
  assert.equal(staged.status, 202);
  const stagingToken = staged.headers.get(tokenHeader);
  assert.ok(stagingToken);
  assert.equal((await staging(native({ [tokenHeader]: stagingToken }))).status, 204);
  const website = handler("web");
  const issued = await website(web({ cookie: cookieName + "=" + token }));
  assert.equal(issued.status, 202);
  const webCookie = issued.headers.get("set-cookie")?.split(";")[0];
  assert.ok(webCookie);
  assert.equal((await website(web({ cookie: webCookie }))).status, 204);
  assert.equal(records[0].platform, "android");
  assert.equal(records[1].platform, "ios");
  assert.equal(records[0].sourceId, records[1].sourceId);
  assert.equal(records[1].accountSessionId, "canonical-session");
  assert.equal(new Set(records.map(record => record.sourceId)).size, 3);
});

test("a temporary credential renews the source before expiration and cannot be tampered with or replayed after expiry", () => {
  const input = { environment: "production", transport: "web", secret } as const;
  const first = renewPresenceCredential(null, { ...input, now: now.getTime() });
  const renewal = renewPresenceCredential(first.token, { ...input, now: now.getTime() + 26 * 60_000 });
  assert.equal(renewal.sourceId, first.sourceId);
  assert.notEqual(renewal.token, first.token);
  const expired = renewPresenceCredential(first.token, { ...input, now: now.getTime() + 30 * 60_000 });
  assert.notEqual(expired.sourceId, first.sourceId);
  const tampered = renewPresenceCredential(first.token.slice(0, -2) + "AB", { ...input, now: now.getTime() });
  assert.notEqual(tampered.sourceId, first.sourceId);
});

test("transport guards reject cross-site web requests and native requests with browser metadata", async () => {
  const { handler, records } = fixture();
  assert.equal((await handler("web")(web({ origin: "https://foreign.example" }))).status, 403);
  assert.equal((await handler("web")(web({ "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await handler("native")(native({ origin }))).status, 403);
  assert.equal((await handler("native")(native({ "x-mobile-platform": "web" }))).status, 403);
  assert.equal(records.length, 0);
});

test("only authenticated ingress automation evidence suppresses an otherwise eligible heartbeat", async () => {
  const { handler, records } = fixture();
  const stamp = String(now.getTime());
  const sign = (timestamp: string) =>
    timestamp + "." + createHmac("sha256", automationSecret).update(["verified-automation-v1", "production", webPath, timestamp].join("\n")).digest("base64url");
  const post = handler("web");
  const verified = await post(web({ "x-kt-verified-automation": sign(stamp) }));
  assert.equal(verified.status, 204);
  assert.equal(verified.headers.get("set-cookie"), null);
  assert.equal(records.length, 0);
  const cookie = (await post(web())).headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const untrusted = await post(web({ cookie, "user-agent": "Googlebot", "cf-verified-bot": "true", "x-kt-verified-automation": stamp + ".spoofer" }));
  assert.equal(untrusted.status, 204);
  await post(web({ cookie, "x-kt-verified-automation": sign(String(now.getTime() - 61_000)) }));
  assert.equal(records.length, 2);
});

test("invalid authorization is not counted as a guest and storage failures never return success", async () => {
  const never = () => { throw new Error("must not run"); };
  const failures: string[] = [];
  const deps = { environment: () => "production" as const, now: () => now, secret: () => secret,
    automationSecret: () => undefined, admit: () => true, authenticate: async () => null, record: async () => {},
    onFailure: (environment: string) => failures.push(environment) };
  const invalid = createOnlinePresenceHandler("native", { ...deps, record: never });
  assert.equal((await invalid(native({ authorization: "Bearer invalid" }))).status, 401);
  const invalidWeb = createOnlinePresenceHandler("web", { ...deps, record: never });
  assert.equal((await invalidWeb(web({ cookie: "next-auth.session-token=expired" }))).status, 401);
  const down = createOnlinePresenceHandler("native", { ...deps, record: never });
  const credential = (await down(native())).headers.get(tokenHeader);
  assert.ok(credential);
  const unavailable = await down(native({ [tokenHeader]: credential }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get(tokenHeader), null);
  const limited = createOnlinePresenceHandler("native", { ...deps, admit: () => false, record: never });
  assert.equal((await limited(native())).status, 429);

  const disabled = createOnlinePresenceHandler("web", { ...deps, enabled: () => false, record: never });
  const disabledResponse = await disabled(web());
  assert.equal(disabledResponse.status, 503);
  assert.equal(disabledResponse.headers.get("set-cookie"), null);
  assert.deepEqual(failures, ["production"], "expected rejections do not signal an outage");
});

test("operational website presence includes authenticated Admin routes and public guests", () => {
  for (const path of ["/", "/flights", "/admin-guide"]) {
    assert.equal(isWebsiteOnlinePresenceRoute(path, false), true);
  }
  for (const path of ["/admin", "/admin/users"]) {
    assert.equal(isWebsiteOnlinePresenceRoute(path, false), false);
    assert.equal(isWebsiteOnlinePresenceRoute(path, true), true);
  }
  for (const path of [null, "/api", "/api/admin", "/mobile", "/mobile/legal"]) {
    assert.equal(isWebsiteOnlinePresenceRoute(path, true), false);
  }
});

test("website monitoring detects invalid or conflicting public origins", () => {
  assert.equal(hasConsistentWebsitePresenceOrigin(), true);
  assert.equal(hasConsistentWebsitePresenceOrigin(undefined, "http://localhost:3000"), true);
  assert.equal(hasConsistentWebsitePresenceOrigin("https://staging.kurioticket.com/", "https://staging.kurioticket.com"), true);
  assert.equal(hasConsistentWebsitePresenceOrigin("https://kurioticket.com", "https://staging.kurioticket.com"), false);
  assert.equal(hasConsistentWebsitePresenceOrigin("https://name@kurioticket.com", undefined), false);
  assert.equal(hasConsistentWebsitePresenceOrigin("not a URL", undefined), false);
  assert.equal(hasConsistentWebsitePresenceOrigin("http://staging.kurioticket.com", "http://staging.kurioticket.com",
    "https://staging.kurioticket.com"), false);
});
