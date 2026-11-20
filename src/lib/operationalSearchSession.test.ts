import assert from "node:assert/strict";
import test from "node:test";
import {
  attachOperationalSearchSession, operationalSessionCookieName,
  prepareOperationalSearchSession, readOperationalSearchSession,
} from "./operationalSearchSession";

test("operational session is issued only for a same-origin search and never relies on analytics consent", () => {
  const priorSecret = process.env.AUTH_SECRET;
  const priorUrl = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.AUTH_SECRET = "test-search-session-secret-must-not-be-used-in-production";
    process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
    const now = Date.UTC(2026, 9, 27, 10, 0, 0);
    const req = new Request("https://kurioticket.com/api/flights/search", {
      method: "POST", headers: { origin: "https://kurioticket.com" },
    });
    const first = prepareOperationalSearchSession(req, now, "staging");
    assert.ok(first);
    assert.equal(first.transport, "web");
    assert.equal(first.newCredential, true);
    const response = attachOperationalSearchSession(Response.json({ ok: true }), first);
    assert.match(response.headers.get("set-cookie") || "", /HttpOnly; SameSite=Lax/);
    assert.match(response.headers.get("set-cookie") || "", new RegExp(operationalSessionCookieName));
    const reused = prepareOperationalSearchSession(new Request(req.url, {
      method: "POST", headers: { origin: "https://kurioticket.com", cookie: operationalSessionCookieName + "=" + first.credential },
    }), now + 5000, "staging");
    assert.ok(reused);
    assert.equal(reused.reference.id, first.reference.id);
    assert.equal(reused.newCredential, false);
    assert.equal(readOperationalSearchSession(new Request(req.url, {
      method: "POST", headers: { origin: "https://kurioticket.com", cookie: operationalSessionCookieName + "=" + first.credential },
    }), now + 30 * 60 * 1000 + 1, "staging"), null);
    assert.equal(readOperationalSearchSession(new Request(req.url, {
      method: "POST", headers: { origin: "https://kurioticket.com", cookie: operationalSessionCookieName + "=" + first.credential },
    }), now + 300, "production"), null);
    assert.equal(prepareOperationalSearchSession(new Request(req.url, { method: "POST", headers: { origin: "https://attacker.example" } }), now, "staging"), null);
    assert.equal(prepareOperationalSearchSession(new Request(req.url, { method: "POST" }), now, "staging"), null);
  } finally {
    if (priorSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = priorSecret;
    if (priorUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = priorUrl;
  }
});

test("native continuity sends signed credentials without storing browser cookies", () => {
  const priorSecret = process.env.AUTH_SECRET;
  try {
    process.env.AUTH_SECRET = "test-native-search-session-secret-not-production";
    const now = Date.UTC(2026, 9, 27, 10, 0, 0);
    const req = new Request("https://kurioticket.com/api/cars/search", {
      method: "POST", headers: { "x-mobile-platform": "android" },
    });
    const first = prepareOperationalSearchSession(req, now, "staging");
    assert.ok(first);
    const response = attachOperationalSearchSession(Response.json({ ok: true }), first);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("x-kt-search-session"), first.credential);
    const again = prepareOperationalSearchSession(new Request(req.url, {
      method: "POST", headers: { "x-mobile-platform": "android", "x-kt-search-session": first.credential },
    }), now + 5000, "staging");
    assert.equal(again?.reference.id, first.reference.id);
  } finally {
    if (priorSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = priorSecret;
  }
});

test("native guest search continuity is platform-bound, short-lived and not a browser credential", () => {
  const prior = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-native-guest-attribution-secret-at-least-32-characters";
  try {
    const now = Date.UTC(2026, 10, 20, 12);
    for (const platform of ["ios", "android"] as const) {
      const url = "https://kurioticket.com/api/flights/search";
      const firstRequest = new Request(url, { method: "POST", headers: { "x-mobile-platform": platform, "x-kt-search-protocol": "v2" } });
      const prepared = prepareOperationalSearchSession(firstRequest, now, "staging");
      assert.ok(prepared);
      assert.equal(prepared.transport, "native");
      assert.equal(prepared.guestNativeAttribution, true);
      assert.equal(prepared.reference.nativePlatform, platform);
      assert.match(prepared.credential, /^v2\./);
      const response = attachOperationalSearchSession(Response.json({ ok: true }), prepared);
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(response.headers.get("x-kt-search-session"), prepared.credential);

      const headers = { "x-mobile-platform": platform, "x-kt-search-protocol": "v2", "x-kt-search-session": prepared.credential };
      const continued = new Request(url, { method: "POST", headers });
      assert.equal(readOperationalSearchSession(continued, now + 1000, "staging")?.nativePlatform, platform);
      assert.equal(prepareOperationalSearchSession(continued, now + 1000, "staging")?.newCredential, false);
      assert.equal(readOperationalSearchSession(continued, now + 1000, "production"), null);
      assert.equal(readOperationalSearchSession(continued, now + 30 * 60_000 + 1, "staging"), null);

      const other = platform === "ios" ? "android" : "ios";
      const switchRequest = new Request(url, { method: "POST", headers: { ...headers, "x-mobile-platform": other } });
      assert.equal(readOperationalSearchSession(switchRequest, now + 1000, "staging"), null);
      assert.equal(prepareOperationalSearchSession(switchRequest, now + 1000, "staging"), null);
      const forgedRequest = new Request(url, { method: "POST", headers: { ...headers,
        "x-kt-search-session": prepared.credential.slice(0, -1) + (prepared.credential.endsWith("Z") ? "Y" : "Z") } });
      assert.equal(readOperationalSearchSession(forgedRequest, now + 1000, "staging"), null);
      assert.equal(prepareOperationalSearchSession(forgedRequest, now + 1000, "staging")?.guestNativeAttribution, false);
      const browserVariants: Array<Record<string, string>> = [{ origin: "https://kurioticket.com" }, { "sec-fetch-site": "same-origin" }];
      for (const browser of browserVariants) {
        const spoofed = new Request(url, { method: "POST", headers: { ...headers, ...browser } });
        assert.equal(readOperationalSearchSession(spoofed, now + 1000, "staging"), null);
        assert.equal(prepareOperationalSearchSession(spoofed, now + 1000, "staging"), null);
      }
    }
  } finally {
    if (prior === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = prior;
  }
});

test("installed native v1 clients retain signed guest session continuity without a capability header", () => {
  const old = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-native-legacy-compatibility-secret-at-least-32-characters";
  try {
    const now = Date.UTC(2026, 10, 20, 12);
    for (const platform of ["android", "ios"] as const) {
      const url = "https://kurioticket.com/api/flights/search";
      const oldClient = new Request(url, { method: "POST", headers: { "x-mobile-platform": platform } });
      const first = prepareOperationalSearchSession(oldClient, now, "staging");
      assert.ok(first);
      assert.match(first.credential, /^v1\./);
      assert.equal(first.guestNativeAttribution, false);
      assert.equal(first.reference.nativePlatform, undefined);
      const secondRequest = new Request(url, { method: "POST", headers: {
        "x-mobile-platform": platform, "x-kt-search-session": first.credential,
      } });
      assert.equal(readOperationalSearchSession(secondRequest, now + 1000, "staging")?.id, first.reference.id);
      const again = prepareOperationalSearchSession(secondRequest, now + 1000, "staging");
      assert.equal(again?.newCredential, false);
      assert.equal(again?.reference.id, first.reference.id);
      assert.equal(again?.guestNativeAttribution, false);
      assert.equal(attachOperationalSearchSession(Response.json({ ok: true }), again).headers.get("x-kt-search-session"), null);
      const upgradeRequest = new Request(url, { method: "POST", headers: {
        "x-mobile-platform": platform, "x-kt-search-protocol": "v2", "x-kt-search-session": first.credential,
      } });
      const upgraded = prepareOperationalSearchSession(upgradeRequest, now + 1000, "staging");
      assert.ok(upgraded);
      assert.match(upgraded.credential, /^v2\./);
      assert.equal(upgraded.reference.id, first.reference.id, "upgrade retains operational guest correlation");
      assert.equal(upgraded.reference.nativePlatform, platform);
      assert.equal(upgraded.guestNativeAttribution, true);
    }
  } finally {
    if (old === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = old;
  }
});
