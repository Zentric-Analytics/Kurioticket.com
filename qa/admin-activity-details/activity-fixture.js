// QA ONLY: deterministic synthetic rows for rendering the actual Admin Activity route.
// Never use this as production data or cite a generated screenshot as a staging result.
const time = minute => new Date("2026-10-22T17:" + String(minute).padStart(2, "0") + ":00.000Z");
const journey = (id, startedAt, props) => ({ journeyId: id, journeyStartedAt: startedAt, ...props });
const recorded = [
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
const completeHistory = Array.from({ length: 1005 }, (_, index) => ({
  id: "s-qa-complete-" + String(index).padStart(4, "0"),
  at: new Date(Date.parse("2026-10-22T18:00:00Z") - index * 60000),
  label: "Search completed", detail: "Complete history " + index + " · SUCCESS",
  stage: "SEARCH_COMPLETED", product: index % 2 ? "HOTEL" : "FLIGHT",
  searchHistoryId: "qa-complete-search-" + index,
}));

export async function loadAdminIdentityActivity(kind, id, filters, cursor, readMode = "page") {
  if (!/^[a-z0-9_-]{6,80}$/i.test(id)) return { status: "not_found" };
  if (kind === "user" && id === "qa-registered-unavailable-0001") return { status: "unavailable" };
  if (readMode !== "all" && cursor && !["older-qa-page", "oldest-current-qa-page", "newer-qa-page"].includes(cursor)) return { status: "invalid_cursor" };
  const tabMatch = stage => filters.tab === "all"
    || (filters.tab === "journeys" && stage !== "ACCOUNT_ACTIVITY")
    || (filters.tab === "searches" && ["SEARCH_COMPLETED", "RESULTS_VIEWED"].includes(stage))
    || (filters.tab === "selections" && stage === "OFFER_SELECTED")
    || (filters.tab === "handoffs" && stage === "PROVIDER_HANDOFF_STARTED");
  const matches = row => tabMatch(row.stage)
    && (filters.stage === "all" || row.stage === filters.stage)
    && (filters.product === "all" || row.product === filters.product)
    && (!filters.q || (row.detail + row.label).toLowerCase().includes(filters.q.toLowerCase()))
    && (!filters.from || row.at >= new Date(filters.from + "T00:00:00.000Z"))
    && (!filters.to || row.at < new Date(new Date(filters.to + "T00:00:00.000Z").getTime() + 86400000));
  const sourceRows = id === "qa-complete-history-0001" ? completeHistory : [...recorded, ...olderRecorded, ...newerRecorded];
  const allMatched = id === "qa-no-events-0001" ? [] : sourceRows.filter(matches);
  const summary = {
    searchProducts: {
      flights: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && row.product === "FLIGHT").length,
      hotels: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && row.product === "HOTEL").length,
      cars: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && row.product === "CAR").length,
      other: allMatched.filter(row => row.stage === "SEARCH_COMPLETED" && !["FLIGHT", "HOTEL", "CAR"].includes(row.product)).length,
    },
    searches: allMatched.filter(row => row.stage === "SEARCH_COMPLETED").length,
    resultsViewed: allMatched.filter(row => row.stage === "RESULTS_VIEWED").length,
    providerHandoffs: allMatched.filter(row => row.stage === "PROVIDER_HANDOFF_STARTED").length,
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
  const rows = readMode === "all"
    ? [...allMatched].sort((a,b) => (filters.order === "oldest" ? a.at - b.at : b.at - a.at) || a.id.localeCompare(b.id))
    : filters.order === "oldest"
      ? (selected < 0 ? [] : ascendingPages[selected]?.rows ?? [])
      : (cursor === "older-qa-page" ? olderRows : currentRows);
  const nextCursor = readMode === "all" ? null : filters.order === "oldest"
    ? (selected >= 0 ? ascendingPages[selected + 1]?.cursor ?? null : null)
    : (!cursor && olderRows.length ? "older-qa-page" : null);
  return { status: "ok", data: {
    id, kind, title: kind === "guest" ? "Guest visitor" : id === "qa-long-identity-0001" ? "Alexandria Olufunmilayo Adekunle-Wellington" : "QA registered customer",
    email: kind === "guest" ? null : id === "qa-protected-admin-0001" ? "protected.qa@example.invalid" : id === "qa-long-identity-0001" ? "alexandria.olufunmilayo.adekunle-wellington@example.invalid" : "customer.qa@example.invalid",
    role: kind === "guest" ? null : "USER",
    status: kind === "guest" ? "Anonymous" : "ACTIVE",
    firstSeenAt: time(39), lastSeenAt: time(48), environment: "staging",
    source: kind === "guest" ? "visitor" : "account",
    events: rows,
    summary,
    nextCursor,
  } };
}
