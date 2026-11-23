import assert from "node:assert/strict";
import test from "node:test";
import { checkedPresenceCount, isPublicWebsitePresenceRoute, mayRecordWebsitePresence, websitePresenceHeartbeatMs, websitePresenceWindowSeconds } from "./website-presence";

const guest = { currentUserId: null, consentStatus: "GRANTED", trackingDisabledAt: null, identityLinks: [] };
const account = { currentUserId: "user-1", consentStatus: "GRANTED", trackingDisabledAt: null, identityLinks: [{ userId: "user-1" }] };

test("website presence is never recorded without current consent and verified matching ownership", () => {
  assert.equal(mayRecordWebsitePresence(guest, null), true);
  assert.equal(mayRecordWebsitePresence(account, "user-1"), true);
  assert.equal(mayRecordWebsitePresence(null, null), false);
  assert.equal(mayRecordWebsitePresence(account, null), false);
  assert.equal(mayRecordWebsitePresence(guest, "user-1"), false);
  assert.equal(mayRecordWebsitePresence(account, "user-2"), false);
  assert.equal(mayRecordWebsitePresence({ ...guest, consentStatus: "WITHDRAWN" }, null), false);
  assert.equal(mayRecordWebsitePresence({ ...guest, trackingDisabledAt: new Date() }, null), false);
  assert.equal(mayRecordWebsitePresence({ ...guest, identityLinks: [{ userId: "user-1" }] }, null), false);
  assert.equal(mayRecordWebsitePresence({ ...account, identityLinks: [{ userId: "user-1" }, { userId: "user-2" }] }, "user-1"), false);
});

test("public website presence excludes mobile preview, admin and APIs", () => {
  assert.equal(isPublicWebsitePresenceRoute("/"), true);
  assert.equal(isPublicWebsitePresenceRoute("/flights"), true);
  assert.equal(isPublicWebsitePresenceRoute("/cars/details/x"), true);
  for (const path of [null, "/admin", "/admin/users", "/api", "/api/search", "/mobile", "/mobile/legal", "/mobile/legal/privacy-policy"]) {
    assert.equal(isPublicWebsitePresenceRoute(path), false, String(path));
  }
});

test("heartbeat frequency is below expiration time and counts reject bad data", () => {
  assert.ok(websitePresenceHeartbeatMs < websitePresenceWindowSeconds * 1000);
  assert.equal(checkedPresenceCount(BigInt(0)), 0);
  assert.equal(checkedPresenceCount(BigInt(42)), 42);
  for (const invalid of [Number.NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => checkedPresenceCount(invalid));
  }
});

test("presence aggregation checks account consent, environment, recency and current verified status", async () => {
  const { readFileSync } = await import("node:fs");
  const service = readFileSync("src/services/websitePresenceService.ts", "utf8");
  const route = readFileSync("src/app/api/identity/presence/route.ts", "utf8");
  const migration = readFileSync("prisma/migrations/20261026153000_add_consent_gated_web_presence/migration.sql", "utf8");
  assert.match(service, /websitePresenceAt.*cutoff/);
  assert.match(service, /websitePresenceEnvironment/);
  assert.match(service, /COUNT\(DISTINCT CASE WHEN v\."currentUserId"/);
  assert.match(service, /"trackingDisabledAt" IS NULL/);
  assert.match(service, /u\."status" = 'ACTIVE'/);
  assert.match(service, /"emailVerified" IS NOT NULL/);
  assert.match(service, /windowSeconds: websitePresenceWindowSeconds/);
  assert.match(service, /"unavailable"/);
  assert.match(route, /isSameOriginRequest/);
  assert.match(route, /isNativeVisitorRequest/);
  assert.match(route, /visitorTrackingDenied/);
  assert.match(route, /recordWebsitePresenceHeartbeat/);
  assert.match(migration, /ALTER TABLE "Visitor"/);
});
