import assert from "node:assert/strict";
import test from "node:test";
import { resolveRequestActivityIdentity } from "./requestActivityIdentity";
import { prepareOperationalSearchSession } from "@/lib/operationalSearchSession";
import { getPublicEnvironment } from "@/lib/stagingSafety";

const token = "a".repeat(43);
const webRequest = () => new Request("https://kurioticket.com/api/hotels/search", {
  headers: { cookie: `kt_visitor=${token}` },
});

test("consented guest searches and handoffs receive a visitor but no account identity", async () => {
  for (const path of ["/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/redirect"]) {
    const identity = await resolveRequestActivityIdentity(new Request(`https://kurioticket.com${path}`, {
      headers: { cookie: `kt_visitor=${token}` },
    }), {
      web: async () => null,
      mobile: async () => { throw new Error("must not read mobile auth for a web request"); },
      visitor: async (value, userId) => {
        assert.equal(value, token);
        assert.equal(userId, null);
        return "guest-visitor";
      },
    });
    assert.deepEqual(identity, { userId: null, visitorId: "guest-visitor", applicationSource: "UNKNOWN" });
  }
});

test("native identity uses the app token and validated bearer without borrowing a web account", async () => {
  for (const path of ["/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/mobile/v1/hotels/progressive", "/api/redirect"]) {
    const identity = await resolveRequestActivityIdentity(new Request(`https://kurioticket.com${path}`, {
      headers: { "x-mobile-platform": "android", "x-kt-visitor": token, cookie: `kt_visitor=${"b".repeat(43)}` },
    }), {
      web: async () => { throw new Error("must not read the web session"); },
      mobile: async () => ({ user: { id: "app-user", status: "ACTIVE" } }),
      visitor: async (value, userId) => {
        assert.equal(value, token);
        assert.equal(userId, "app-user");
        return "app-visitor";
      },
    });
    assert.deepEqual(identity, { userId: "app-user", visitorId: "app-visitor", applicationSource: "UNKNOWN" });
  }
});

test("a revoked native bearer cannot fall back to a different web account", async () => {
  const identity = await resolveRequestActivityIdentity(new Request("https://kurioticket.com/api/redirect", {
    headers: { authorization: "Bearer revoked", "x-kt-visitor": token },
  }), {
    web: async () => { throw new Error("must not borrow a web session"); },
    mobile: async () => null,
    visitor: async (_value, userId) => {
      assert.equal(userId, null, "the visitor service must reject an account-bound token without its account");
      return null;
    },
  });
  assert.deepEqual(identity, { userId: null, visitorId: null, applicationSource: "UNKNOWN" });
});

test("visitor failures preserve verified account attribution and never reject the caller", async () => {
  const identity = await resolveRequestActivityIdentity(webRequest(), {
    web: async () => ({ userId: "web-user" }),
    mobile: async () => null,
    visitor: async () => { throw new Error("visitor table unavailable"); },
  });
  assert.deepEqual(identity, { userId: "web-user", visitorId: null, applicationSource: "WEB" });
});

test("an unavailable session boundary cannot claim guest or registered ownership", async () => {
  const identity = await resolveRequestActivityIdentity(webRequest(), {
    web: async () => { throw new Error("session store unavailable"); },
    mobile: async () => null,
    visitor: async () => { throw new Error("must not resolve an unknown account context"); },
  });
  assert.deepEqual(identity, { userId: null, visitorId: null, applicationSource: "UNKNOWN" });
});

test("no token and withdrawn consent do not manufacture a guest identity", async () => {
  for (const request of [new Request("https://kurioticket.com/api/redirect"), webRequest()]) {
    assert.deepEqual(await resolveRequestActivityIdentity(request, {
      web: async () => null,
      mobile: async () => null,
      visitor: async () => null,
    }), { userId: null, visitorId: null, applicationSource: "UNKNOWN" });
  }
});

test("a local web refusal stops visitor attribution even while durable withdrawal is retrying", async () => {
  const identity = await resolveRequestActivityIdentity(new Request("https://kurioticket.com/api/redirect", {
    headers: { cookie: `kt_visitor=${token}; kt_analytics_denied=1` },
  }), {
    web: async () => ({ userId: "signed-in-user" }),
    mobile: async () => null,
    visitor: async () => { throw new Error("refused visitor identity must not be resolved"); },
  });
  assert.deepEqual(identity, { userId: "signed-in-user", visitorId: null, applicationSource: "WEB" });
});


test("verified registered website users retain their own identity for all three searches", async () => {
  for (const path of ["/api/flights/search", "/api/hotels/search", "/api/cars/search"]) {
    const identity = await resolveRequestActivityIdentity(new Request("https://staging.kurioticket.com" + path, {
      headers: { cookie: "kt_visitor=" + token },
    }), {
      web: async () => ({ userId: "verified-user" }),
      mobile: async () => { throw new Error("web requests cannot borrow native auth"); },
      visitor: async (visitorToken, userId) => {
        assert.equal(visitorToken, token);
        assert.equal(userId, "verified-user");
        return "linked-and-consented-visitor";
      },
    });
    assert.deepEqual(identity, { userId: "verified-user", visitorId: "linked-and-consented-visitor", applicationSource: "WEB" });
  }
});

test("native guest searches use server-bound platform for operational telemetry without visitor consent", async () => {
  const original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-native-guest-attribution-secret-at-least-32-characters";
  const dependencies = {
    web: async () => { throw new Error("native guest must not use browser session"); },
    mobile: async () => null,
    visitor: async (value: string | null, accountId: string | null) => {
      assert.equal(value, null);
      assert.equal(accountId, null);
      return null;
    },
  };
  try {
    for (const platform of ["android", "ios"] as const) {
      for (const path of ["/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/mobile/v1/hotels/progressive", "/api/redirect"]) {
        const request = new Request("https://kurioticket.com" + path, { method: "POST", headers: { "x-mobile-platform": platform, "x-kt-search-protocol": "v2" } });
        const prepared = prepareOperationalSearchSession(request, Date.now(), getPublicEnvironment());
        assert.ok(prepared, "guest operational session should be available");
        const attributed = await resolveRequestActivityIdentity(request, dependencies, prepared);
        assert.deepEqual(attributed, { userId: null, visitorId: null, applicationSource: platform.toUpperCase() });
        // Native guest attribution must not grant account privileges or create a consented visitor.
        const recorded = await resolveRequestActivityIdentity(new Request(request.url, {
          method: "POST", headers: { "x-mobile-platform": platform, "x-kt-search-session": prepared.credential },
        }), dependencies);
        assert.deepEqual(recorded, attributed, "signed continuity retains platform for a later request");
      }
    }
  } finally {
    if (original === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = original;
  }
});

test("untrusted, browser, invalid-bearer and unverifiable native requests remain UNKNOWN", async () => {
  const original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-native-guest-attribution-secret-at-least-32-characters";
  const dependencies = {
    web: async () => { throw new Error("native-looking requests cannot borrow web sessions"); },
    mobile: async () => null,
    visitor: async () => null,
  };
  try {
    const url = "https://kurioticket.com/api/flights/search";
    const req = new Request(url, { method: "POST", headers: { "x-mobile-platform": "android", "x-kt-search-protocol": "v2" } });
    assert.equal((await resolveRequestActivityIdentity(req, dependencies)).applicationSource, "UNKNOWN");
    const prepared = prepareOperationalSearchSession(req, Date.now(), getPublicEnvironment());
    assert.ok(prepared);
    const adversarialHeaders: Array<Record<string, string>> = [
      { "x-mobile-platform": "android", origin: "https://kurioticket.com" },
      { "x-mobile-platform": "android", "sec-fetch-mode": "cors" },
      { "x-mobile-platform": "ios", "x-kt-search-session": prepared.credential },
      { "x-mobile-platform": "android", "x-kt-search-session": "invalid" },
      { "x-mobile-platform": "android", "x-kt-search-session": prepared.credential, authorization: "Bearer revoked" },
    ];
    for (const headers of adversarialHeaders) {
      const request = new Request(url, { method: "POST", headers });
      assert.equal((await resolveRequestActivityIdentity(request, dependencies)).applicationSource, "UNKNOWN");
    }
    const invalidAuth = new Request(url, { method: "POST",
      headers: { "x-mobile-platform": "android", authorization: "Bearer revoked" } });
    assert.deepEqual(await resolveRequestActivityIdentity(invalidAuth, dependencies, prepared),
      { userId: null, visitorId: null, applicationSource: "UNKNOWN" });
  } finally {
    if (original === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = original;
  }
});
