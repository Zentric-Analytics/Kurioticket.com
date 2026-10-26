// Synthetic only. Used to render the original pre-change IdentityActivityPanel
// in a sandbox without copying any customer, guest or staging data.
const id = "qa-guest-activity-0001";
const since = new Date("2026-10-22T17:39:00.000Z");
const events = [
  { id: "qa-s-1", visitorId: id, userId: null, type: "FLIGHT", origin: "LOS", destination: "IST", status: "SUCCESS", createdAt: new Date("2026-10-22T17:43:00.000Z") },
  { id: "qa-s-2", visitorId: id, userId: null, type: "HOTEL", origin: null, destination: "Johannesburg", status: "SUCCESS", createdAt: new Date("2026-10-22T17:47:00.000Z") },
];
const handoffs = [
  { id: "qa-r-1", visitorId: id, userId: null, type: "FLIGHT", provider: "Duffel", route: "LOS-IST", createdAt: new Date("2026-10-22T17:46:00.000Z") },
];
const journeyEvents = [
  { id: "qa-j-1", type: "RESULTS_VIEWED", product: "HOTEL", provider: null, createdAt: new Date("2026-10-22T17:48:00.000Z"),
    searchHistoryId: "qa-s-2", redirectLogId: null, journey: { id: "qa-journey-hotel", visitorId: id, startedAt: since },
    searchHistory: events[1], redirectLog: null },
  { id: "qa-j-2", type: "OFFER_SELECTED", product: "FLIGHT", provider: "Jetabroad", createdAt: new Date("2026-10-22T17:45:00.000Z"),
    searchHistoryId: "qa-s-1", redirectLogId: null, journey: { id: "qa-journey-flight", visitorId: id, startedAt: since },
    searchHistory: events[0], redirectLog: null },
];
const db = {
  visitor: { findFirst: async () => ({ id, firstSeenAt: since, lastSeenAt: new Date("2026-10-22T17:48:00.000Z") }) },
  user: { findUnique: async ({ where }) =>
    ["qa-registered-0001", "qa-registered-unavailable-0001", "qa-admin"].includes(where.id)
      ? { id: where.id, email: "customer.qa@example.invalid", role: "USER", status: "ACTIVE" }
      : null },
  searchHistory: { findMany: async () => events },
  redirectLog: { findMany: async () => handoffs },
  analyticsEvent: { findMany: async () => [] },
  journeyEvent: { findMany: async () => journeyEvents },
};
export async function withOptionalDb(work, fallback) {
  try { return await work(db); } catch { return fallback; }
}
