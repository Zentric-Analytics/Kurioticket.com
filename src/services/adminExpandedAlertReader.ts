import type { PrismaClient } from "../generated/prisma/client";
import { featureControlRegistry } from "../lib/feature-controls/registry";
import { ADMIN_SECURITY_WINDOW_MS, SEARCH_WINDOW_MS, type ExpandedAlertSnapshot, type SearchProduct, type SearchWindow } from "./adminExpandedAlertCore";

export type ExpandedAlertDatabase = Pick<PrismaClient, "$transaction" | "supportTicket" | "userSecuritySettings">;
const products = ["FLIGHT", "HOTEL", "CAR"] as const;
const keys = { FLIGHT: "FLIGHT_SEARCH_ENABLED", HOTEL: "HOTEL_SEARCH_ENABLED", CAR: "CAR_SEARCH_ENABLED" } as const;
type Group = { type: string; status: string; _count: { _all: number }; _max: { createdAt: Date | null } };
function count(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid monitoring aggregate.");
  return value;
}
function windows(groups: Group[]) {
  const result = Object.fromEntries(products.map(product => [product, { total: 0, failed: 0, latestFailureAt: null }])) as Record<SearchProduct, SearchWindow>;
  for (const group of groups) {
    if (!products.includes(group.type as SearchProduct) || !["SUCCESS", "PARTIAL", "FAILED"].includes(group.status)) throw new Error("Unknown search-monitoring classification.");
    const target = result[group.type as SearchProduct];
    const n = count(group._count._all);
    target.total = count(target.total + n);
    if (group.status === "FAILED") {
      target.failed = count(target.failed + n);
      target.latestFailureAt = group._max.createdAt?.toISOString() ?? null;
    }
  }
  return result;
}

/** Aggregate only: no customer identity, content, secrets, or raw errors leave
 * this reader. Sources fail independently. Queries do not call providers or
 * bootstrap/change feature settings. Accounts/support are current-DB scoped;
 * search history and feature flags are explicitly deployment scoped.
 */
export async function readExpandedAdminAlertSignals(database: ExpandedAlertDatabase | null, environment: "staging" | "production", now = new Date()): Promise<ExpandedAlertSnapshot> {
  const empty: ExpandedAlertSnapshot = { environment, searches: null, support: null, users: null };
  if (!database) return empty;
  const until = now.getTime();
  if (!Number.isFinite(until)) return empty;
  const [searches, support, users] = await Promise.all([
    database.$transaction(async tx => {
      const shared = { type: { in: [...products] }, query: { path: ["environment"], equals: environment } };
      const [previousRows, currentRows, flags] = await Promise.all([
        tx.searchHistory.groupBy({ by: ["type", "status"], where: { ...shared, createdAt: { gte: new Date(until - 2 * SEARCH_WINDOW_MS), lt: new Date(until - SEARCH_WINDOW_MS) } }, _count: { _all: true }, _max: { createdAt: true } }),
        tx.searchHistory.groupBy({ by: ["type", "status"], where: { ...shared, createdAt: { gte: new Date(until - SEARCH_WINDOW_MS), lte: now } }, _count: { _all: true }, _max: { createdAt: true } }),
        tx.featureFlag.findMany({ where: { environment: environment === "staging" ? "STAGING" : "PRODUCTION", key: { in: Object.values(keys) } }, select: { key: true, enabled: true } }),
      ]);
      const previous = windows(previousRows); const current = windows(currentRows);
      return products.map(product => {
        const definition = featureControlRegistry[keys[product]];
        const flag = flags.find(row => row.key === keys[product]);
        return { product, enabled: flag?.enabled ?? (environment === "staging" ? definition.defaultStaging : definition.defaultProduction), previous: previous[product], current: current[product] };
      });
    }, { isolationLevel: "RepeatableRead" }).catch(() => null),
    database.supportTicket.groupBy({
      by: ["status"], where: { priority: "URGENT", status: { in: ["OPEN", "WAITING_ON_TEAM"] }, createdAt: { lte: now } },
      _count: { _all: true }, _max: { updatedAt: true },
    }).then(groups => {
      const result: NonNullable<ExpandedAlertSnapshot["support"]> = { OPEN: { count: 0, latestAt: null }, WAITING_ON_TEAM: { count: 0, latestAt: null } };
      for (const group of groups) {
        if (group.status !== "OPEN" && group.status !== "WAITING_ON_TEAM") throw new Error("Unknown support-monitoring classification.");
        result[group.status] = { count: count(group._count._all), latestAt: group._max.updatedAt?.toISOString() ?? null };
      }
      return result;
    }).catch(() => null),
    database.userSecuritySettings.aggregate({
      where: { twoFactorEnabled: false, twoFactorDisabledAt: { gte: new Date(until - ADMIN_SECURITY_WINDOW_MS), lte: now }, user: { role: "ADMIN", status: "ACTIVE" } },
      _count: { _all: true }, _max: { twoFactorDisabledAt: true },
    }).then(result => ({ count: count(result._count._all), latestAt: result._max.twoFactorDisabledAt?.toISOString() ?? null })).catch(() => null),
  ]);
  return { environment, searches, support, users };
}
