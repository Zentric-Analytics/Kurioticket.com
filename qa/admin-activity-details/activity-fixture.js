// QA ONLY: deterministic synthetic rows for rendering the actual Admin Activity route.
// Never use this as production data or cite a generated screenshot as a staging result.
const time = minute => new Date("2026-10-22T17:" + String(minute).padStart(2, "0") + ":00.000Z");
const guest = "qa-guest-activity-0001";
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
// This earlier synthetic event must appear on the cursor page ONLY.
const olderRecorded = [
  journey("qa-journey-older", time(29), {
    id: "j-qa-older-search", at: time(29), label: "Search completed",
    detail: "HOTEL · Earlier recorded search · SUCCESS",
    stage: "SEARCH_COMPLETED", product: "HOTEL", searchHistoryId: "qa-older-search",
  }),
];

export async function loadAdminIdentityActivity(kind, id, filters, cursor) {
  if (!/^[a-z0-9_-]{6,80}$/i.test(id)) return { status: "not_found" };
  if (kind === "user" && id === "qa-registered-unavailable-0001") return { status: "unavailable" };
  if (cursor && cursor !== "older-qa-page") return { status: "invalid_cursor" };
  const tabMatch = stage => filters.tab === "all"
    || (filters.tab === "searches" && ["SEARCH_COMPLETED", "RESULTS_VIEWED"].includes(stage))
    || (filters.tab === "selections" && stage === "OFFER_SELECTED")
    || (filters.tab === "handoffs" && stage === "PROVIDER_HANDOFF_STARTED");
  const matches = row => tabMatch(row.stage)
    && (filters.stage === "all" || row.stage === filters.stage)
    && (filters.product === "all" || row.product === filters.product)
    && (!filters.q || (row.detail + row.label).toLowerCase().includes(filters.q.toLowerCase()))
    && (!filters.from || row.at >= new Date(filters.from + "T00:00:00.000Z"))
    && (!filters.to || row.at < new Date(new Date(filters.to + "T00:00:00.000Z").getTime() + 86400000));
  const currentRows = id === "qa-no-events-0001" ? [] : recorded.filter(matches);
  const olderRows = id === "qa-no-events-0001" ? [] : olderRecorded.filter(matches);
  const rows = cursor === "older-qa-page" ? olderRows : currentRows;
  return { status: "ok", data: {
    id, kind, title: kind === "guest" ? "Guest visitor" : "QA registered customer",
    email: kind === "guest" ? null : "customer.qa@example.invalid",
    role: kind === "guest" ? null : "USER",
    status: kind === "guest" ? "Anonymous" : "ACTIVE",
    firstSeenAt: time(39), lastSeenAt: time(48), environment: "staging", events: rows, nextCursor: !cursor && olderRows.length ? "older-qa-page" : null,
  } };
}
