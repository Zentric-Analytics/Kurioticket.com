import assert from "node:assert/strict";
import test from "node:test";
import { eligibleGuestVisitorWhere, eligibleLinkedVisitorWhere, eligibleJourneyEventCandidateWhere, mergeAdminActivity, recordedSearchContext, toAdminJourneyActivity, type JourneyEventRecord } from "./adminIdentityJourney";

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

test("original search identity is projected from stored source evidence without relabelling linked guest searches", () => {
  const guestUnderAccount = toAdminJourneyActivity(sample, "user", "account-1")!;
  assert.equal(guestUnderAccount.originalSearchIdentity, "guest");
  assert.equal(guestUnderAccount.searchOutcome, "SUCCESS");
  const account = toAdminJourneyActivity({ ...sample,
    searchHistory: { ...sample.searchHistory!, userId: "account-1", status: "FAILED" },
  }, "user", "account-1")!;
  assert.equal(account.originalSearchIdentity, "registered");
  assert.equal(account.searchOutcome, "FAILED");
  assert.deepEqual(recordedSearchContext(null), {});
  assert.deepEqual(recordedSearchContext(undefined), {});
  assert.deepEqual(recordedSearchContext({}), {});
  assert.deepEqual(recordedSearchContext({ userId: "", status: "untrusted" }), {});
  assert.deepEqual(recordedSearchContext({ userId: null, status: "PARTIAL" }), { originalSearchIdentity: "guest", searchOutcome: "PARTIAL" });
  assert.equal(toAdminJourneyActivity({ ...sample,
    searchHistory: { ...sample.searchHistory!, userId: "different-account" },
  }, "user", "account-1"), null, "presentation context must not weaken ownership validation");
});

test("explicit native flight fare, provider-deal and detail stages have distinct labels", () => {
  for (const [type, label] of [
    ["FLIGHT_DETAILS_VIEWED", "Flight details viewed"],
    ["PROVIDER_DEAL_SELECTED", "Provider deal selected"],
  ] as const) {
    const event = toAdminJourneyActivity({ ...sample, type, metadata: {
      resultId: "flight_safe_01", sourcePage: "/flight-details", private: "secret",
    } }, "guest", "visitor-1");
    assert.equal(event?.label, label);
    assert.doesNotMatch(event?.detail ?? "", /secret|private/);
  }
  const fare = toAdminJourneyActivity({ ...sample, type: "OFFER_SELECTED",
    metadata: { resultId: "fare_01", sourcePage: "/flight-details" },
  }, "guest", "visitor-1");
  assert.equal(fare?.label, "Fare selected");
  const legacy = toAdminJourneyActivity({ ...sample, type: "OFFER_SELECTED",
    metadata: { sourcePage: "/flight-details" },
  }, "guest", "visitor-1");
  assert.equal(legacy?.label, "Offer selected", "do not relabel historical events without source evidence");
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

test("existing saved, unsaved, shared and alert-created events retain exact search attribution", () => {
  const cases = [
    { type: "RESULT_SAVED", action: "saved_item_confirmed", label: "Saved to account" },
    { type: "RESULT_UNSAVED", action: "saved_item_removed", label: "Removed saved item" },
    { type: "RESULT_SHARED", action: "share_link_copied", label: "Result link copied" },
    { type: "RESULT_SHARED", action: "share_sheet_completed", label: "Share sheet completed" },
    { type: "PRICE_ALERT_CREATED", action: "price_alert_created", label: "Price alert created" },
  ] as const;
  for (const item of cases) {
    const recorded = toAdminJourneyActivity({
      ...sample, type: item.type, metadata: { action: item.action,
        customerEmail: "private@invalid.example", recipient: "private" },
    }, "guest", "visitor-1");
    assert.equal(recorded?.label, item.label);
    assert.equal(recorded?.searchHistoryId, "search-1");
    assert.equal(recorded?.journeyId, "journey-1");
    assert.doesNotMatch(recorded?.detail ?? "", /customerEmail|recipient|private/);
    assert.equal(toAdminJourneyActivity({
      ...sample, type: item.type, metadata: { action: item.action },
      searchHistory: { ...sample.searchHistory!, visitorId: "another-visitor" },
    }, "guest", "visitor-1"), null);
    assert.equal(toAdminJourneyActivity({
      ...sample, type: item.type, metadata: { action: item.action },
      searchHistoryId: null, searchHistory: null,
    }, "guest", "visitor-1"), null);
  }
  const unknown = toAdminJourneyActivity({
    ...sample, type: "RESULT_SHARED", metadata: { action: "unknown_secret_action" },
  }, "guest", "visitor-1");
  assert.equal(unknown?.label, "Result shared");
  assert.doesNotMatch(unknown?.detail ?? "", /secret/);
});

test("canonical journey stage replaces duplicate older search but retains unrepresented history", () => {
  const j = toAdminJourneyActivity({ ...sample, type: "SEARCH_COMPLETED" }, "guest", "visitor-1")!;
  const events = mergeAdminActivity([j], [
    { id: "old-1", label: "FLIGHT search", detail: "LOS → LHR", dedupeKey: "search:search-1", at },
    { id: "old-2", label: "Provider handoff", detail: "Duffel", dedupeKey: "handoff:redirect-2", at: new Date(at.getTime()-1000) },
  ]);
  assert.deepEqual(events.map(e => e.id), ["j-event-1", "old-2"]);
});

test("candidate pruning requires actual stage/time events without relaxing registered consent and ownership", () => {
  const from = new Date("2026-11-20T00:00:00.000Z");
  const to = new Date("2026-11-21T00:00:00.000Z");
  const where = eligibleJourneyEventCandidateWhere("account-1", ["SEARCH_COMPLETED", "OFFER_SELECTED"], { gte: from, lt: to });
  const and = where.AND;
  assert.ok(Array.isArray(and));
  assert.deepEqual(and[0], {
    currentUserId: "account-1",
    consentStatus: "GRANTED",
    trackingDisabledAt: null,
    identityLinks: {
      some: { userId: "account-1" },
      none: { userId: { not: "account-1" } },
    },
    currentUser: { is: { status: "ACTIVE", emailVerified: { not: null } } },
  });
  assert.deepEqual(and[1], {
    journeys: { some: { events: { some: {
      type: { in: ["SEARCH_COMPLETED", "OFFER_SELECTED"] },
      createdAt: { gte: from, lt: to },
    } } } },
  });
  // No fixed take, magic IDs, or account-specific shortcuts here. Unlinked
  // and nonconsenting visitors are always excluded by the first predicate.
});

test("candidate selection does not exclude valid results-viewed and handoff stages", () => {
  const window = { gte: new Date("2026-10-01T00:00:00.000Z") };
  const where = eligibleJourneyEventCandidateWhere("account-2", [
    "RESULTS_VIEWED", "PROVIDER_HANDOFF_STARTED",
  ], window);
  const and = where.AND;
  assert.ok(Array.isArray(and));
  assert.deepEqual(and[1], {
    journeys: { some: { events: { some: {
      type: { in: ["RESULTS_VIEWED", "PROVIDER_HANDOFF_STARTED"] },
      createdAt: window,
    } } } },
  });
});
