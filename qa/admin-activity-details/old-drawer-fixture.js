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
// Synthetic same-day sessions validate the compact preview without live data.
const currentDayUtc = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
const dayStart = new Date(currentDayUtc).getTime();
const syntheticSessions = [
  ...Array.from({ length: 4 }, (_, index) => ({
    id: "qa-device-" + index, client: index % 2 ? "MOBILE" : "WEB",
    platform: index % 2 ? "ios" : null,
    deviceLabel: index % 2 ? "iOS device" : "Windows computer",
    browser: index % 2 ? null : "Firefox 160", os: index % 2 ? "iOS" : "Windows",
    locationLabel: null, createdAt: new Date(dayStart + index * 1000),
    lastSeenAt: new Date(dayStart + (index + 1) * 1000),
    expiresAt: new Date(dayStart + 7 * 86_400_000),
    revokedAt: index === 1 || index === 3 ? new Date(dayStart + 5_000) : null,
    revokeReason: index === 1 ? "mobile_logout" : index === 3 ? "password_reset" : null,
  })),
  {
    id: "qa-device-yesterday", client: "WEB", platform: null,
    deviceLabel: "Mac", browser: "Safari 18", os: "macOS",
    locationLabel: null, createdAt: new Date(dayStart - 86_400_000),
    lastSeenAt: new Date(dayStart - 86_400_000),
    expiresAt: new Date(dayStart - 60_000), revokedAt: null, revokeReason: null,
  },
];
function selectSyntheticSessions(where = {}) {
  const dates = where.lastSeenAt ?? {};
  return syntheticSessions.filter(item =>
    (!dates.gte || item.lastSeenAt >= dates.gte)
    && (!dates.lte || item.lastSeenAt <= dates.lte)
    && (!dates.lt || item.lastSeenAt < dates.lt));
}
const db = {
  visitor: { findFirst: async () => ({ id, firstSeenAt: since, lastSeenAt: new Date("2026-10-22T17:48:00.000Z") }) },
  user: { findUnique: async ({ where }) =>
    ["qa-registered-0001", "qa-registered-unavailable-0001", "qa-admin"].includes(where.id)
      ? { id: where.id, email: "customer.qa@example.invalid", role: "USER", status: "ACTIVE" }
      : null },
  accountSession: {
    findMany: async ({ where, take = 20, skip = 0 }) =>
      selectSyntheticSessions(where).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()).slice(skip, skip + take),
    count: async ({ where }) => selectSyntheticSessions(where).length,
  },
  searchHistory: { findMany: async () => events },
  redirectLog: { findMany: async () => handoffs },
  analyticsEvent: { findMany: async () => [] },
  journeyEvent: { findMany: async () => journeyEvents },
};
export async function withOptionalDb(work, fallback) {
  try { return await work(db); } catch { return fallback; }
}

export function getOptionalPrisma(){ return db; }
