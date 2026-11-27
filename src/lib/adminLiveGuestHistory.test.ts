import test from "node:test";
import assert from "node:assert/strict";
import { adminLiveGuestReference } from "./adminLiveGuestReference";
import { matchLiveGuestHistory, resolveVerifiedLiveGuestHistory, type LiveGuestHistoryCandidate } from "./adminLiveGuestHistory";
import type { OnlineIdentityRow } from "./adminOnlineUsersSnapshot";

const secret = "qa-only-guest-navigation-signing-secret-material";
const now = new Date("2026-11-27T01:00:00Z");
const sourceId = "a".repeat(64);
const reference = adminLiveGuestReference("staging", sourceId, secret)!;
const row: OnlineIdentityRow = {
  id: "guest-1", kind: "guest", name: "Guest session", email: null, role: null,
  locationLabel: "Nigeria", platforms: ["android"], lastSeenAt: now.toISOString(), liveReference: reference,
};
const candidate: LiveGuestHistoryCandidate = {
  sourceId, platform: "android", lastSeenAt: now, guestActivityKind: "operational",
  guestActivityId: "b9ab6aa4-e28f-4daf-9b10-b1bb5616f6ef", guestActivityObservedAt: now,
  guestActivityExpiresAt: new Date(+now + 60_000),
};
const resolve = (input = row, candidates = [candidate], at = now) => matchLiveGuestHistory(input, candidates, "staging", at, secret);

test("live navigation matches only its opaque current reference, for all four platforms", () => {
  for (const platform of ["desktop_web", "mobile_web", "ios", "android"] as const) {
    const match = resolve({ ...row, platforms: [platform] }, [{ ...candidate, platform }]);
    assert.deepEqual(match?.identity, { kind: "operational", id: candidate.guestActivityId, expiresAt: candidate.guestActivityExpiresAt });
  }
  assert.equal(resolve({ ...row, liveReference: "x".repeat(43) }), null);
  assert.equal(resolve({ ...row, liveReference: undefined }), null);
  assert.equal(resolve({ ...row, kind: "registered" }), null);
  assert.equal(resolve(row, [{ ...candidate, sourceId: "b".repeat(64) }]), null);
  assert.equal(resolve(row, [candidate, candidate]), null, "ambiguous current references fail closed");
  assert.equal(matchLiveGuestHistory(row, [candidate], "production", now, secret), null);
  assert.equal(matchLiveGuestHistory(row, [candidate], "staging", now, undefined), null);
});

test("recorded ownership must belong to the exact fresh heartbeat and unexpired proof", () => {
  assert.equal(resolve(row, [candidate], new Date(+now + 90_000)), null);
  assert.equal(resolve(row, [candidate], new Date(+now - 1)), null);
  assert.equal(resolve(row, [{ ...candidate, lastSeenAt: new Date(+now + 1) }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityObservedAt: new Date(+now - 1) }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityObservedAt: null }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityExpiresAt: now }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityKind: null }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityId: row.id }]), null, "roster IDs never become history IDs");
  assert.equal(resolve(row, [{ ...candidate, platform: "ios" }]), null);
  assert.equal(resolve({ ...row, platforms: ["unclassified"] }, [{ ...candidate, platform: "unclassified" as typeof candidate.platform }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityKind: "user" }]), null);
  assert.equal(resolve(row, [{ ...candidate, guestActivityId: "../another-guest" }]), null);
});

test("visitor and operational ownership retain their verified source without inferring from location", () => {
  const visitor = { ...candidate, guestActivityKind: "visitor", guestActivityId: "visitor-existing-123" };
  assert.equal(resolve(row, [visitor])?.identity.kind, "visitor");
  assert.equal(resolve({ ...row, locationLabel: null }, [visitor])?.identity.id, visitor.guestActivityId);
  assert.equal(resolve({ ...row, liveReference: undefined, locationLabel: "Nigeria" }, [visitor]), null);
});

test("slow database reads cannot extend live presence or ownership expiry", async () => {
  for (const phase of ["candidates", "target"] as const) {
    let at = now;
    const result = await resolveVerifiedLiveGuestHistory(row, "staging", now, secret, {
      clock: () => at,
      readCandidates: async () => {
        if (phase === "candidates") at = new Date(+now + 90_000);
        return [{ ...candidate, guestActivityExpiresAt: new Date(+now + 20 * 60_000) }];
      },
      targetEligible: async () => { at = new Date(+now + 90_000); return true; },
    });
    assert.equal(result, null, phase);
  }
  let at = now;
  const nearExpiry = { ...candidate, guestActivityExpiresAt: new Date(+now + 1000) };
  assert.equal(await resolveVerifiedLiveGuestHistory(row, "staging", now, secret, {
    clock: () => at, readCandidates: async () => [nearExpiry],
    targetEligible: async () => { at = new Date(+now + 1000); return true; },
  }), null, "signed ownership expires during the final read");
  at = now;
  assert.deepEqual(await resolveVerifiedLiveGuestHistory(row, "staging", now, secret, {
    clock: () => at, readCandidates: async () => [candidate], targetEligible: async () => true,
  }), { kind: "operational", id: candidate.guestActivityId });
});
