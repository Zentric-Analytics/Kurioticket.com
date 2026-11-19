import assert from "node:assert/strict";
import test from "node:test";
import { eligibleGuestVisitorWhere, eligibleLinkedVisitorWhere, mergeAdminActivity, toAdminJourneyActivity, type JourneyEventRecord } from "./adminIdentityJourney";

const at = new Date("2026-10-22T11:00:00Z");
const sample: JourneyEventRecord = {
  id: "event-1", type: "RESULTS_VIEWED", product: "FLIGHT", provider: null, createdAt: at,
  searchHistoryId: "search-1", redirectLogId: null,
  journey: { id: "journey-1", visitorId: "visitor-1", startedAt: at },
  searchHistory: { visitorId: "visitor-1", userId: null, type: "FLIGHT", origin: "LOS", destination: "LHR", status: "SUCCESS" },
  redirectLog: null,
};

test("guest consent filters require unlinked, active, granted identity", () => {
  const where = eligibleGuestVisitorWhere("visitor-1");
  assert.equal(where.consentStatus, "GRANTED");
  assert.deepEqual(where.identityLinks, { none: {} });
  assert.equal(where.trackingDisabledAt, null);
  const linked = eligibleLinkedVisitorWhere("user-1");
  assert.equal(linked.currentUserId, "user-1");
  assert.deepEqual(linked.identityLinks.none, { userId: { not: "user-1" } });
});

test("journey events render only for the matching visitor and account", () => {
  assert.equal(toAdminJourneyActivity(sample, "guest", "visitor-1")?.label, "Results viewed");
  assert.equal(toAdminJourneyActivity({ ...sample, searchHistory: { ...sample.searchHistory!, visitorId: "someone-else" } }, "guest", "visitor-1"), null);
  assert.equal(toAdminJourneyActivity({ ...sample, searchHistory: { ...sample.searchHistory!, userId: "user-2" } }, "user", "user-1"), null);
  assert.equal(toAdminJourneyActivity({ ...sample, searchHistory: { ...sample.searchHistory!, userId: "user-2" } }, "guest", "visitor-1"), null);
  assert.equal(toAdminJourneyActivity({ ...sample, searchHistory: null }, "guest", "visitor-1"), null);
});

test("recorded search and handoff stages use safe fields without raw metadata", () => {
  const search = toAdminJourneyActivity({ ...sample, type: "SEARCH_COMPLETED" }, "guest", "visitor-1");
  assert.equal(search?.dedupeKey, "search:search-1");
  assert.match(search?.detail || "", /LOS → LHR/);
  const handoff = toAdminJourneyActivity({
    ...sample, type: "PROVIDER_HANDOFF_STARTED", searchHistoryId: null, searchHistory: null, redirectLogId: "redirect-1",
    redirectLog: { visitorId: "visitor-1", userId: null, type: "FLIGHT", provider: "Duffel", route: "LOS-LHR" },
  }, "guest", "visitor-1");
  assert.equal(handoff?.dedupeKey, "handoff:redirect-1");
  assert.equal(handoff?.label, "Provider handoff started");
});

test("canonical journey stage replaces duplicate older search but retains unrepresented history", () => {
  const j = toAdminJourneyActivity({ ...sample, type: "SEARCH_COMPLETED" }, "guest", "visitor-1")!;
  const events = mergeAdminActivity([j], [
    { id: "old-1", label: "FLIGHT search", detail: "LOS → LHR", dedupeKey: "search:search-1", at },
    { id: "old-2", label: "Provider handoff", detail: "Duffel", dedupeKey: "handoff:redirect-2", at: new Date(at.getTime()-1000) },
  ]);
  assert.deepEqual(events.map(e => e.id), ["j-event-1", "old-2"]);
});
