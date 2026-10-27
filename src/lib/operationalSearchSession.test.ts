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
