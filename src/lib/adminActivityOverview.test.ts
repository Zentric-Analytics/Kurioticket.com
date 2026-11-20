import assert from "node:assert/strict";
import test from "node:test";
import { activityOverviewRows, completeJourneyDetailHref, journeyHistoryHrefFromActivity } from "./adminActivityOverview";
import { decodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import type { ActivityRow } from "./adminIdentityJourney";
import type { ActivityFilters } from "./adminIdentityActivity";

const now = new Date("2026-11-20T12:50:00.000Z");
const activityPath = "/admin/users/user/qa-account-0001/activity?range=today&product=CAR&tab=searches&q=CDG";
const filters: ActivityFilters = {
  tab: "searches", stage: "SEARCH_COMPLETED", product: "CAR",
  from: "2026-11-20T00:00:00.000Z", to: now.toISOString(),
  q: "CDG", order: "newest",
};
function row(id: string, journeyId: string | undefined, stage: ActivityRow["stage"], at: Date, product: string | null = "CAR"): ActivityRow {
  return { id, journeyId, stage, at, product,
    label: stage === "ACCOUNT_ACTIVITY" ? "Unsaved item" : "Search completed",
    detail: product ? product + " · CDG → Paris" : "Recorded item",
    journeyStartedAt: journeyId ? new Date("2026-11-20T11:00:00.000Z") : undefined };
}

test("overview groups by actual journey identity, not adjacent rows, and keeps unlinked actions", () => {
  const rows = [
    row("e-other",undefined,"ACCOUNT_ACTIVITY",new Date("2026-11-20T12:49:00.000Z")),
    row("j-a1","a","SEARCH_COMPLETED",new Date("2026-11-20T12:48:00.000Z")),
    row("j-b1","b","RESULTS_VIEWED",new Date("2026-11-20T12:47:00.000Z")),
    row("j-a2","a","PROVIDER_HANDOFF_STARTED",new Date("2026-11-20T12:46:00.000Z")),
    row("s-unlinked",undefined,"SEARCH_COMPLETED",new Date("2026-11-20T12:45:00.000Z")),
  ];
  const s = activityOverviewRows(rows);
  assert.equal(s.matchingJourneyCount,2);
  assert.equal(s.otherCount,2);
  assert.equal(s.journeys[0].id,"a");
  assert.equal(s.journeys[0].eventCount,2);
  assert.equal(s.journeys[0].searches,1);
  assert.equal(s.journeys[0].handoffs,1);
  assert.equal(s.journeys[0].route,"CDG → Paris");
  assert.deepEqual(s.other.map(x=>x.id),["e-other","s-unlinked"]);
  assert.equal(rows.length,5,"summary never mutates or deletes source records");
});

test("overview shows five newest groups without changing totals or discarding source records", () => {
  const items = Array.from({length:22},(_,i)=>row("j-"+i, "trip-"+i,"SEARCH_COMPLETED",new Date(now.getTime()-i*60000)));
  const actions = Array.from({length:18},(_,i)=>row("e-"+i,undefined,"ACCOUNT_ACTIVITY",new Date(now.getTime()-i*61000)));
  const result = activityOverviewRows([...items,...actions]);
  assert.equal(result.journeys.length,5);
  assert.equal(result.other.length,5);
  assert.equal(result.matchingJourneyCount,22);
  assert.equal(result.otherCount,18);
  assert.equal(items.length+actions.length,40);
});

test("journey navigation carries only applicable product/date/stage filters and safe Activity return", () => {
  const href = journeyHistoryHrefFromActivity("user","qa-account-0001",filters,"today",activityPath);
  const url = new URL(href,"https://kurioticket.test");
  assert.equal(url.searchParams.get("range"),"today");
  assert.equal(url.searchParams.get("product"),"CAR");
  assert.equal(url.searchParams.get("stage"),"SEARCH_COMPLETED");
  assert.equal(url.searchParams.get("from"),filters.from);
  assert.equal(url.searchParams.get("to"),filters.to);
  assert.equal(url.searchParams.get("q"),null);
  assert.equal(url.searchParams.get("tab"),null);
  assert.equal(decodeActivityJourneyReturn(url.searchParams.get("activityReturn")),activityPath);
});

test("journey detail opens all eligible recorded stages for one identity; filter state is return-only", () => {
  const href = completeJourneyDetailHref("trip-99","user","qa-account-0001","staging",now,activityPath);
  const url = new URL(href,"https://kurioticket.test");
  assert.equal(url.pathname,"/admin/journeys/trip-99");
  assert.equal(url.searchParams.get("from"),"1970-01-01T00:00:00.000Z");
  assert.equal(url.searchParams.get("to"),now.toISOString());
  assert.equal(url.searchParams.get("environment"),"staging");
  assert.equal(url.searchParams.get("userId"),"qa-account-0001");
  assert.equal(url.searchParams.get("product"),null);
  assert.equal(url.searchParams.get("stage"),null);
  assert.equal(decodeActivityJourneyReturn(url.searchParams.get("activityReturn")),activityPath);
});
