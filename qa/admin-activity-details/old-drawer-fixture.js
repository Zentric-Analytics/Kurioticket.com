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
    (!where.client || item.client === where.client)
    && (!where.platform || item.platform === where.platform)
    && (!dates.gte || item.lastSeenAt >= dates.gte)
    && (!dates.lte || item.lastSeenAt <= dates.lte)
    && (!dates.lt || item.lastSeenAt < dates.lt));
}
// Raw-query fixtures retain the same result shapes as their production readers.
// A device-presence response cannot stand in for a recorded guest location.
const syntheticGuestLocations = [
  { guestId: "12345678-1234-4123-8123-123456789abc", platform: "android" },
  ...["desktop", "mobile", "ios", "android", "web"].map(platform => ({
    guestId: "22345678-1234-4123-8123-123456789abc", platform,
  })),
].map(row => ({ ...row, guestSource: "operational", evidence: "search",
  locationLabel: null, recordedCountryCode: "NG", at: new Date(dayStart), environment: "staging" }));

function syntheticQueryRows(statement) {
  const text = statement?.text;
  const values = statement?.values;
  if (typeof text !== "string" || !Array.isArray(values)) throw new Error("Unsupported synthetic database query");
  const binding = (scope, pattern) => {
    const match = scope.match(pattern);
    return match ? values[Number(match[1]) - 1] : undefined;
  };
  const bindings = (scope, pattern) => {
    const match = scope.match(pattern);
    return match ? [...match[1].matchAll(/\$(\d+)/g)].map(item => values[Number(item[1]) - 1]) : [];
  };
  if (/SELECT\s+DISTINCT\s+ON\s*\("guestId",\s*"guestSource"\)/.test(text) && text.includes(") location_records")) {
    const start = text.indexOf('FROM "SearchHistory" x');
    const end = text.indexOf("UNION ALL", start);
    const search = start >= 0 ? text.slice(start, end >= 0 ? end : undefined) : "";
    if (!search.includes('x."userId" IS NULL AND x."visitorId" IS NULL')
      || !search.includes('NOT EXISTS (SELECT 1 FROM "Visitor" existing')) {
      throw new Error("Unscoped synthetic guest location query");
    }
    const environment = binding(search, /x\."query"->>'environment'\s*=\s*\$(\d+)/);
    const requested = new Set(bindings(search, /x\."query"->>'operationalSessionId'\s+IN\s*\(([^)]+)\)/));
    const platform = binding(search, /END\s*=\s*\$(\d+)/);
    const bounds = [...search.matchAll(/x\."createdAt"\s*(>=|<=|<)\s*\$(\d+)/g)]
      .map(match => ({ operator: match[1], at: values[Number(match[2]) - 1] }));
    if (!bounds.length || bounds.some(bound => !(bound.at instanceof Date))) throw new Error("Missing synthetic guest date scope");
    const selected = syntheticGuestLocations.filter(row => row.environment === environment && requested.has(row.guestId)
      && (!platform || row.platform === platform)
      && bounds.every(bound => bound.operator === ">=" ? row.at >= bound.at : bound.operator === "<=" ? row.at <= bound.at : row.at < bound.at));
    const latest = new Map();
    for (const row of selected) {
      const key = row.guestSource + ":" + row.guestId;
      if (!latest.has(key) || latest.get(key).at < row.at) latest.set(key, row);
    }
    return [...latest.values()].map(({ guestId, guestSource, evidence, locationLabel, recordedCountryCode, at }) =>
      ({ guestId, guestSource, evidence, locationLabel, recordedCountryCode, at }));
  }
  if (text.includes('COALESCE(BOOL_OR(p."accountSessionId" IS NOT NULL), FALSE) AS "online"')
    && text.includes('FROM "AccountSession" s')) {
    const environment = binding(text, /p\."environment"\s*=\s*\$(\d+)/);
    const userId = binding(text, /s\."userId"\s*=\s*\$(\d+)/);
    const requested = new Set(bindings(text, /s\."id"\s+IN\s*\(([^)]+)\)/));
    if (environment !== "staging" || !["qa-registered-0001", "qa-registered-unavailable-0001", "qa-admin"].includes(userId)) return [];
    return [{ id: "qa-device-0", online: true }, { id: "qa-device-2", online: false }].filter(row => requested.has(row.id));
  }
  throw new Error("Unsupported synthetic database query");
}
const db = {
  visitor: { findFirst: async () => ({ id, firstSeenAt: since, lastSeenAt: new Date("2026-10-22T17:48:00.000Z") }) },
  user: { findUnique: async ({ where }) =>
    ["qa-registered-0001", "qa-registered-unavailable-0001", "qa-admin"].includes(where.id)
      ? { id: where.id, email: "customer.qa@example.invalid", role: "USER", status: "ACTIVE" }
      : null },
  $queryRaw: async statement => syntheticQueryRows(statement),
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
