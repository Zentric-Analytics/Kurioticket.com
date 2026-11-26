// QA ONLY: deterministic synthetic rows for rendering the actual Admin Activity route.
// Never use this as production data or cite a generated screenshot as a staging result.
import { activityWindow, encodeActivityCursor, decodeActivityCursor } from "@/lib/adminIdentityActivity";
import { mergeUnifiedActivityPage } from "@/lib/adminUnifiedActivityPage";

const time = minute => new Date("2026-10-22T17:" + String(minute).padStart(2, "0") + ":00.000Z");
const journey = (id, startedAt, props) => ({ journeyId: id, journeyStartedAt: startedAt, ...props });
export const recorded = [
  // Four separately recorded identical-looking selections, each retaining its own ID/time.
  ...[59, 58, 57, 56].map(minute =>
    journey("qa-journey-repeated", time(56), {
      id: "j-qa-selection-" + minute, at: time(minute), label: "Offer selected",
      detail: "HOTEL · London, United Kingdom · Example provider", stage: "OFFER_SELECTED",
      product: "HOTEL", provider: "Example provider",
    })
  ),
  journey("qa-journey-hotel", time(46), { id: "j-qa-hotel-results", at: time(48), label: "Results viewed", detail: "HOTEL · Johannesburg, South Africa", stage: "RESULTS_VIEWED", product: "HOTEL", searchHistoryId: "qa-hotel-search" }),
  journey("qa-journey-hotel", time(46), { id: "j-qa-hotel-search", at: time(47), label: "Search completed", detail: "HOTEL · Johannesburg, South Africa · SUCCESS", stage: "SEARCH_COMPLETED", product: "HOTEL", searchHistoryId: "qa-hotel-search" }),
  journey("qa-journey-flight", time(43), { id: "j-qa-flight-handoff", at: time(46), label: "Provider handoff started", detail: "FLIGHT · LOS → IST · Duffel", stage: "PROVIDER_HANDOFF_STARTED", product: "FLIGHT", provider: "Duffel", redirectLogId: "qa-duffel-handoff" }),
  journey("qa-journey-flight", time(43), { id: "j-qa-flight-offer", at: time(45), label: "Offer selected", detail: "FLIGHT · LOS → IST · Jetabroad", stage: "OFFER_SELECTED", product: "FLIGHT", provider: "Jetabroad" }),
  journey("qa-journey-flight", time(43), { id: "j-qa-flight-results", at: time(44), label: "Results viewed", detail: "FLIGHT · LOS → IST", stage: "RESULTS_VIEWED", product: "FLIGHT", searchHistoryId: "qa-flight-search" }),
  journey("qa-journey-flight", time(43), { id: "j-qa-flight-search", at: time(43), label: "Search completed", detail: "FLIGHT · LOS → IST · SUCCESS", stage: "SEARCH_COMPLETED", product: "FLIGHT", searchHistoryId: "qa-flight-search" }),
  { id: "e-qa-account-event", at: time(39), label: "Price alert created", detail: "Recorded account activity", stage: "ACCOUNT_ACTIVITY", product: null },
  journey("qa-journey-single", time(35), { id: "j-qa-single", at: time(35), label: "Search completed",
    detail: "CAR · LAX → SFO · SUCCESS", stage: "SEARCH_COMPLETED", product: "CAR", searchHistoryId: "qa-car-search" }),
];
// These records used to require separate cursor pages. Complete mode includes both upfront.
const olderRecorded = [
  journey("qa-journey-older", time(29), {
    id: "j-qa-older-search", at: time(29), label: "Search completed",
    detail: "HOTEL · Earlier recorded search · SUCCESS",
    stage: "SEARCH_COMPLETED", product: "HOTEL", searchHistoryId: "qa-older-search",
  }),
];
const newerRecorded = [
  journey("qa-journey-newer", new Date("2026-10-23T08:00:00Z"), {
    id: "j-qa-newer-search", at: new Date("2026-10-23T08:00:00Z"),
    label: "Search completed", detail: "FLIGHT · Recent recorded search · SUCCESS",
    stage: "SEARCH_COMPLETED", product: "FLIGHT", searchHistoryId: "qa-newer-search",
  }),
];
// These are fictional, non-consented operational records. They have no
// JourneyEvent, user ID, analytics consent, or linked visitor identity.
const operationalRecorded = [
  { id: "s-qa-operational-flight", at: time(51), label: "Search completed",
    detail: "FLIGHT · ATL → MCO · PARTIAL", stage: "SEARCH_COMPLETED", product: "FLIGHT", searchHistoryId: "qa-operational-flight" },
  { id: "s-qa-operational-hotel", at: time(45), label: "Search completed",
    detail: "HOTEL · Abuja · SUCCESS", stage: "SEARCH_COMPLETED", product: "HOTEL", searchHistoryId: "qa-operational-hotel" },
  { id: "r-qa-operational-handoff", at: time(40), label: "Provider handoff started",
    detail: "FLIGHT · ATL → MCO · Example provider", stage: "PROVIDER_HANDOFF_STARTED", product: "FLIGHT",
    provider: "Example provider", redirectLogId: "qa-operational-handoff" },
];
const completeHistory = Array.from({ length: 1005 }, (_, index) => ({
  id: "s-qa-complete-" + String(index).padStart(4, "0"),
  at: new Date(Date.parse("2026-10-22T18:00:00Z") - index * 60000),
  label: "Search completed", detail: "Complete history " + index + " · SUCCESS",
  stage: "SEARCH_COMPLETED", product: index % 2 ? "HOTEL" : "FLIGHT",
  searchHistoryId: "qa-complete-search-" + index,
}));

const pageVisitHistory = Array.from({ length: 45 }, (_, index) => {
  const native = index % 3 !== 2;
  const platform = index % 3 === 0 ? "iOS app" : index % 3 === 1 ? "Android app" : "Mobile web";
  const path = index % 2 ? "/support" : "/";
  return { id: "e-qa-page-" + String(index).padStart(3, "0"), at: new Date(Date.parse("2026-10-22T18:00:00Z") - index * 60000),
    stage: "PAGE_VIEW", label: path === "/" ? "Homepage" : "Support", detail: path + " · " + platform,
    pageView: { path, previousPath: null, transport: native ? "native" : "web", platform, href: native ? null : "https://staging.kurioticket.com" + path } };
});

const localCalendarHistory = [{
  id: "s-qa-lagos-midnight", at: new Date("2026-10-21T23:05:00.000Z"),
  label: "Search completed", detail: "HOTEL · Abuja · SUCCESS",
  stage: "SEARCH_COMPLETED", product: "HOTEL", searchHistoryId: "qa-lagos-midnight-search",
}];

export async function loadAdminIdentityActivity(kind, id, filters, cursor, readMode = "page", pageHistory) {
  if (!/^[a-z0-9_-]{6,80}$/i.test(id)) return { status: "not_found" };
  if (kind === "user" && id === "qa-registered-unavailable-0001") return { status: "unavailable" };
  if (readMode !== "all" && cursor && !["older-qa-page", "oldest-current-qa-page", "newer-qa-page"].includes(cursor)) return { status: "invalid_cursor" };
  const tabMatch = stage => filters.tab === "all"
    || (filters.tab === "pages" && stage === "PAGE_VIEW")
    || (filters.tab === "journeys" && stage !== "ACCOUNT_ACTIVITY")
    || (filters.tab === "searches" && ["SEARCH_COMPLETED", "RESULTS_VIEWED"].includes(stage))
    || (filters.tab === "selections" && stage === "OFFER_SELECTED")
    || (filters.tab === "handoffs" && stage === "PROVIDER_HANDOFF_STARTED")
    || (filters.tab === "interactions" && ["RESULT_SAVED","RESULT_UNSAVED","RESULT_SHARED","PRICE_ALERT_CREATED","ACCOUNT_ACTIVITY"].includes(stage));
  const { gte: fromBound, lt: toBound } = activityWindow(filters);
  const matches = row => tabMatch(row.stage)
    && (filters.stage === "all" || row.stage === filters.stage)
    && (filters.product === "all" || row.product === filters.product)
    && (!filters.q || (row.detail + row.label).toLowerCase().includes(filters.q.toLowerCase()))
    && (!fromBound || row.at >= fromBound)
    && (!toBound || row.at < toBound)
    && (!pageHistory || pageHistory.platform === "all" || row.pageView?.platform === ({ios:"iOS app",android:"Android app",mobile:"Mobile web",desktop:"Desktop web"})[pageHistory.platform]);
  const sourceRows = id === "qa-operational-guest-0001" || id === "12345678-1234-4123-8123-123456789abc" ? operationalRecorded
    : id === "qa-complete-history-0001" ? completeHistory
    : id === "qa-page-history-0001" ? pageVisitHistory
    : id === "qa-lagos-midnight-0001" ? localCalendarHistory
    : [...recorded, ...olderRecorded, ...newerRecorded];
  const allMatched = id === "qa-no-events-0001" ? [] : sourceRows.filter(matches);
  const summary = {
    pagesVisited: allMatched.filter(row => row.stage === "PAGE_VIEW").length,
    searchProducts: {
      flights: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && row.product === "FLIGHT").length,
      hotels: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && row.product === "HOTEL").length,
      cars: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && row.product === "CAR").length,
      other: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && !["FLIGHT", "HOTEL", "CAR"].includes(row.product)).length,
    },
    searches: allMatched.filter(row => row.stage === "SEARCH_COMPLETED").length,
    resultsViewed: allMatched.filter(row => row.stage === "RESULTS_VIEWED").length,
    offersSelected: allMatched.filter(row => row.stage === "OFFER_SELECTED").length,
    providerHandoffs: allMatched.filter(row => row.stage === "PROVIDER_HANDOFF_STARTED").length,
    journeysTracked: new Set(allMatched.map(row => row.journeyId).filter(Boolean)).size,
  };
  const currentRows = id === "qa-no-events-0001" ? [] : recorded.filter(matches);
  const olderRows = id === "qa-no-events-0001" ? [] : olderRecorded.filter(matches);
  const newerRows = id === "qa-no-events-0001" ? [] : newerRecorded.filter(matches);
  // Legacy fixture callers retain their old paging contract for baseline screenshots.
  const ascendingPages = [
    { cursor: null, rows: olderRows },
    { cursor: "oldest-current-qa-page", rows: [...currentRows].reverse() },
    { cursor: "newer-qa-page", rows: newerRows },
  ].filter(page => page.rows.length);
  const selected = cursor ? ascendingPages.findIndex(page => page.cursor === cursor) : 0;
  const ordered = [...allMatched].sort((a,b) => (filters.order === "oldest" ? a.at - b.at : b.at - a.at) || a.id.localeCompare(b.id));
  const rows = pageHistory ? ordered.slice((pageHistory.page - 1) * 20, pageHistory.page * 20)
    : readMode === "summary" ? [...ordered.filter(row => row.stage !== "PAGE_VIEW"), ...ordered.filter(row => row.stage === "PAGE_VIEW").slice(0, 1)]
    : readMode === "all" ? ordered
    : filters.order === "oldest"
      ? (selected < 0 ? [] : ascendingPages[selected]?.rows ?? [])
      : (cursor === "older-qa-page" ? olderRows : currentRows);
  const nextCursor = pageHistory || readMode === "all" || readMode === "summary" ? null : filters.order === "oldest"
    ? (selected >= 0 ? ascendingPages[selected + 1]?.cursor ?? null : null)
    : (!cursor && olderRows.length ? "older-qa-page" : null);
  return { status: "ok", data: {
    id, kind, title: kind === "guest" ? "Guest visitor" : id === "qa-realistic-identity-0001" ? "Alexandria Adekunle" : id === "qa-long-identity-0001" ? "Alexandria Olufunmilayo Adekunle-Wellington" : "QA registered customer",
    email: kind === "guest" ? null : id === "qa-realistic-identity-0001" ? "alexandria.adekunle@zentricexample.invalid" : id === "qa-protected-admin-0001" ? "protected.qa@example.invalid" : id === "qa-long-identity-0001" ? "alexandria.olufunmilayo.adekunle-wellington@example.invalid" : "customer.qa@example.invalid",
    role: kind === "guest" ? null : "USER",
    status: kind === "guest" ? "Anonymous" : "ACTIVE",
    firstSeenAt: time(39), lastSeenAt: time(48), environment: "staging",
    source: kind === "guest" ? (id === "qa-operational-guest-0001" || id === "12345678-1234-4123-8123-123456789abc" ? "operational" : "visitor") : "account",
    events: rows,
    summary,
    nextCursor,
  } };
}

// QA ONLY. Use the real cursor and merge rules on deterministic sample rows.
// The underlying SQL/authorization reader is covered independently by service tests.
export async function loadAdminUnifiedActivity(kind,id,filters,cursorInput,now) {
  const cursor=decodeActivityCursor(cursorInput,kind,id,filters,"staging");
  if (cursor===null) return {status:"invalid_cursor"};
  const result=await loadAdminIdentityActivity(kind,id,filters,undefined,"all");
  if (result.status!=="ok") return result;
  const after=row=>!cursor || +row.at < Date.parse(cursor.at) || (+row.at === Date.parse(cursor.at) && row.id.localeCompare(cursor.id)>0);
  const matching=result.data.events.filter(after);
  // Only the normal registered identity has independent device rows in this fixture.
  // The synthetic large-history identity intentionally has travel events only.
  const accessTime=new Date("2026-10-22T17:50:00Z");
  const {gte,lt}=activityWindow(filters);
  const includeDevice=kind==="user" && id==="qa-registered-0001" &&
    ["access","all"].includes(filters.tab) && filters.product==="all" && filters.stage==="all" &&
    (!gte || accessTime>=gte) && (!lt || accessTime<lt) && (!filters.q || "desktop web recorded device access".includes(filters.q.toLowerCase()));
  const access=includeDevice ? [{id:"d-qa-fixture-access",at:accessTime,label:"Recorded device access",detail:"Desktop web · Windows computer · Location unavailable"}].filter(after):[];
  const merged=mergeUnifiedActivityPage(matching.slice(0,20),access,matching.length>20,20);
  return {status:"ok",data:{...result.data,events:merged.rows,nextCursor:merged.hasMore?encodeActivityCursor(merged.rows.at(-1),kind,id,filters,"staging"):null}};
}
