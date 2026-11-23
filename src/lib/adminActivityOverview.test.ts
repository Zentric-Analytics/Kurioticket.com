import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("recent searches split the same visitor journey by verified SearchHistory reference", () => {
  const rows: ActivityRow[] = [
    { ...row("flight-search","shared","SEARCH_COMPLETED",new Date("2026-11-23T10:00:00Z"),"FLIGHT"), searchHistoryId:"flight-1",detail:"FLIGHT · LOS → CDG · SUCCESS", platform:"IOS", resultCount:125 },
    { ...row("hotel-one","shared","SEARCH_COMPLETED",new Date("2026-11-23T10:02:00Z"),"HOTEL"),searchHistoryId:"hotel-1",detail:"HOTEL · Paris · SUCCESS" },
    { ...row("hotel-two","shared","SEARCH_COMPLETED",new Date("2026-11-23T10:03:00Z"),"HOTEL"),searchHistoryId:"hotel-2",detail:"HOTEL · Lyon · SUCCESS" },
    { ...row("car-search","shared","SEARCH_COMPLETED",new Date("2026-11-23T10:05:00Z"),"CAR"),searchHistoryId:"car-1",detail:"CAR · CDG · SUCCESS" },
    { ...row("flight-results","shared","RESULTS_VIEWED",new Date("2026-11-23T10:06:00Z"),"FLIGHT"),searchHistoryId:"flight-1" },
    { ...row("flight-choice","shared","OFFER_SELECTED",new Date("2026-11-23T10:07:00Z"),"FLIGHT"),searchHistoryId:"flight-1",provider:"Example provider" },
    { ...row("flight-handoff","shared","PROVIDER_HANDOFF_STARTED",new Date("2026-11-23T10:08:00Z"),"FLIGHT"),searchHistoryId:"flight-1",redirectLogId:"handoff-1",provider:"Example provider" },
    { ...row("hotel-results","shared","RESULTS_VIEWED",new Date("2026-11-23T10:09:00Z"),"HOTEL"),searchHistoryId:"hotel-1" },
    { ...row("other-search",undefined,"SEARCH_COMPLETED",new Date("2026-11-23T10:10:00Z"),"FLIGHT"),searchHistoryId:"flight-unlinked" },
    { ...row("account-event",undefined,"ACCOUNT_ACTIVITY",new Date("2026-11-23T10:11:00Z")) },
  ];
  const summary=activityOverviewRows(rows);
  assert.equal(summary.matchingSearchCount,5);
  assert.equal(summary.matchingJourneyCount,1);
  assert.equal(summary.searches.length,5);
  assert.deepEqual(new Set(summary.searches.map(s=>s.id)),new Set(["flight-1","hotel-1","hotel-2","car-1","flight-unlinked"]));
  const flight=summary.searches.find(s=>s.id==="flight-1")!;
  assert.equal(flight.eventCount,4);
  assert.equal(flight.resultsViewed,1);
  assert.equal(flight.offersSelected,1);
  assert.equal(flight.handoffs,1);
  assert.equal(flight.route,"LOS → CDG");
  assert.equal(flight.searchStatus,"SUCCESS");
  assert.equal(flight.platform,"IOS");
  assert.equal(flight.resultCount,125);
  assert.deepEqual(flight.providers,["Example provider"]);
  assert.equal(summary.searches.find(s=>s.id==="hotel-2")!.route,"Lyon");
  assert.equal(summary.searches.find(s=>s.id==="flight-unlinked")!.journeyId,null);
  assert.equal(summary.otherCount,1);
  assert.equal(summary.unlinkedStageCount,0);
  assert.equal(rows.length,10,"never mutate, remove or backfill source records");
});

test("verified stages stay on the same search across a visitor journey rollover", () => {
  const rows: ActivityRow[] = [
    { ...row("search-event","first-journey","SEARCH_COMPLETED",new Date("2026-11-23T08:00:00Z"),"FLIGHT"),searchHistoryId:"same-search" },
    { ...row("view-event","second-journey","RESULTS_VIEWED",new Date("2026-11-23T08:40:00Z"),"FLIGHT"),searchHistoryId:"same-search" },
    { ...row("selection-event","second-journey","OFFER_SELECTED",new Date("2026-11-23T08:41:00Z"),"FLIGHT"),searchHistoryId:"same-search" },
  ];
  const result=activityOverviewRows(rows);
  assert.equal(result.matchingSearchCount,1);
  assert.equal(result.matchingJourneyCount,2);
  assert.equal(result.unlinkedStageCount,0);
  assert.equal(result.searches[0].searches,1);
  assert.equal(result.searches[0].resultsViewed,1);
  assert.equal(result.searches[0].offersSelected,1);
  assert.equal(result.searches[0].eventCount,3);
});

test("unreferenced stages are never assigned to a nearby search or another product", () => {
  const rows: ActivityRow[] = [
    { ...row("flight","joint","SEARCH_COMPLETED",new Date("2026-11-20T12:48:00Z"),"FLIGHT"), searchHistoryId:"flight" },
    { ...row("unknown-handoff","joint","PROVIDER_HANDOFF_STARTED",new Date("2026-11-20T12:49:00Z"),"FLIGHT"), redirectLogId:"handoff" },
    { ...row("unknown-selection","joint","OFFER_SELECTED",new Date("2026-11-20T12:49:15Z"),"FLIGHT") },
    { ...row("other","joint","ACCOUNT_ACTIVITY",new Date("2026-11-20T12:50:00Z")) },
  ];
  const result=activityOverviewRows(rows);
  assert.equal(result.matchingSearchCount,1);
  assert.equal(result.searches[0].eventCount,1);
  assert.equal(result.searches[0].handoffs,0);
  assert.equal(result.searches[0].offersSelected,0);
  assert.equal(result.unlinkedStageCount,2);
  assert.equal(result.otherCount,1);
});

test("recent search cards cap display at ten while keeping exact matching counts", () => {
  const items=Array.from({length:22},(_,i)=>({
    ...row("j-"+i,"trip-1","SEARCH_COMPLETED",new Date(now.getTime()-i*60000)),
    searchHistoryId:"search-"+i,
  }));
  const other=Array.from({length:18},(_,i)=>row("e-"+i,undefined,"ACCOUNT_ACTIVITY",new Date(now.getTime()-i*61000)));
  const result=activityOverviewRows([...items,...other]);
  assert.equal(result.searches.length,10);
  assert.equal(result.matchingSearchCount,22);
  assert.equal(result.matchingJourneyCount,1);
  assert.equal(result.other.length,10);
  assert.equal(result.otherCount,18);
  assert.equal(items.length+other.length,40);
});

test("recent search presentation is informational and leaves full Journey History navigation intact", () => {
  const component=readFileSync("src/components/admin/AdminActivityOverview.tsx","utf8");
  const page=readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx","utf8");
  const history=readFileSync("src/app/admin/users/[kind]/[id]/journeys/page.tsx","utf8");
  assert.match(component,/data-testid="activity-journey-row"/);
  assert.match(component,/overview\.searches\.map\(search/);
  assert.match(component,/search\.resultsViewed/);
  assert.match(component,/search\.offersSelected/);
  assert.match(component,/search\.handoffs/);
  assert.match(component,/search\.route/);
  assert.match(component,/search\.platform/);
  assert.match(component,/search\.resultCount/);
  assert.match(component,/Search record only/);
  assert.match(component,/View Journey History/);
  assert.doesNotMatch(component,/completeJourneyDetailHref|View journey for /);
  assert.match(page,/<AdminActivityOverview/);
  assert.match(history,/View journey <ChevronRight/);
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

test("old inclusive UTC date filters become a strict same-day Journey window", () => {
  const href=journeyHistoryHrefFromActivity("user","qa-account-0001",{
    ...filters,from:"2026-10-22",to:"2026-10-22",
  },"custom",activityPath);
  const p=new URL(href,"https://kurioticket.test").searchParams;
  assert.equal(p.get("range"),"custom");
  assert.equal(p.get("from"),"2026-10-22T00:00:00.000Z");
  assert.equal(p.get("to"),"2026-10-23T00:00:00.000Z");
});

test("operational guest events appear directly in Activity without a second-page redirect", () => {
  const page = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const overview = readFileSync("src/components/admin/AdminActivityOverview.tsx", "utf8");
  const legacy = readFileSync("src/app/admin/users/[kind]/[id]/other/page.tsx", "utf8");
  assert.match(page, /<AdminActivityOverview events=\{data\.events\}/);
  assert.match(page, /environment=\{environment\} operational=\{operational\}/);
  assert.doesNotMatch(page, /otherHref|encodeURIComponent\(id\) \+ "\/other"/);
  assert.match(overview, /<ActivityTimeline events=\{events\} nextHref=\{null\} environment=\{environment\}/);
  assert.doesNotMatch(overview, /View recorded session activity|href=\{otherHref\}/);
  assert.match(overview, /!operational \? <section/);
  assert.match(legacy, /loadAdminIdentityActivity\(kind, id, parsed\.filters, undefined, "all"\)/);
});
