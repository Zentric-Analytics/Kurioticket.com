import assert from "node:assert/strict";
import test from "node:test";
import { resolveRequestActivityIdentity } from "./requestActivityIdentity";

const token = "a".repeat(43);
const webRequest = () => new Request("https://kurioticket.com/api/hotels/search", {
  headers: { cookie: `kt_visitor=${token}` },
});

test("consented guest searches and handoffs receive a visitor but no account identity", async () => {
  for (const path of ["/api/flights/search", "/api/hotels/search", "/api/redirect"]) {
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
    assert.deepEqual(identity, { userId: null, visitorId: "guest-visitor" });
  }
});

test("native identity uses the app token and validated bearer without borrowing a web account", async () => {
  for (const path of ["/api/flights/search", "/api/hotels/search", "/api/mobile/v1/hotels/progressive", "/api/redirect"]) {
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
    assert.deepEqual(identity, { userId: "app-user", visitorId: "app-visitor" });
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
  assert.deepEqual(identity, { userId: null, visitorId: null });
});

test("visitor failures preserve verified account attribution and never reject the caller", async () => {
  const identity = await resolveRequestActivityIdentity(webRequest(), {
    web: async () => ({ userId: "web-user" }),
    mobile: async () => null,
    visitor: async () => { throw new Error("visitor table unavailable"); },
  });
  assert.deepEqual(identity, { userId: "web-user", visitorId: null });
});

test("an unavailable session boundary cannot claim guest or registered ownership", async () => {
  const identity = await resolveRequestActivityIdentity(webRequest(), {
    web: async () => { throw new Error("session store unavailable"); },
    mobile: async () => null,
    visitor: async () => { throw new Error("must not resolve an unknown account context"); },
  });
  assert.deepEqual(identity, { userId: null, visitorId: null });
});

test("no token and withdrawn consent do not manufacture a guest identity", async () => {
  for (const request of [new Request("https://kurioticket.com/api/redirect"), webRequest()]) {
    assert.deepEqual(await resolveRequestActivityIdentity(request, {
      web: async () => null,
      mobile: async () => null,
      visitor: async () => null,
    }), { userId: null, visitorId: null });
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
  assert.deepEqual(identity, { userId: "signed-in-user", visitorId: null });
});
