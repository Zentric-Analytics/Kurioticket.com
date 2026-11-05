import type { AdminAlertCandidate } from "./adminAlertCore";

export const SEARCH_WINDOW_MS = 15 * 60 * 1_000;
export const ADMIN_SECURITY_WINDOW_MS = 24 * 60 * 60 * 1_000;
export const SEARCH_MIN_ATTEMPTS = 20;
export const SEARCH_MIN_FAILURES = 5;
export type SearchProduct = "FLIGHT" | "HOTEL" | "CAR";
export type SearchWindow = { total: number; failed: number; latestFailureAt: string | null };
export type CountSignal = { count: number; latestAt: string | null };
export type ExpandedAlertSnapshot = {
  environment: "staging" | "production";
  searches: Array<{ product: SearchProduct; enabled: boolean; previous: SearchWindow; current: SearchWindow }> | null;
  // These account/support records have no environment column. They describe the
  // current canonical database, not an invented per-environment customer cohort.
  support: Record<"OPEN" | "WAITING_ON_TEAM", CountSignal> | null;
  users: CountSignal | null;
};

const products = ["FLIGHT", "HOTEL", "CAR"] as const;
const productLabels = { FLIGHT: "Flight", HOTEL: "Hotel", CAR: "Car" } as const;
const safeCount = (value: number) => Number.isSafeInteger(value) && value >= 0;
function timestampIn(value: string | null, from: number, to: number) {
  if (!value) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms >= from && ms <= to;
}
function validCountSignal(signal: CountSignal, from: number, to: number) {
  return safeCount(signal.count) && (signal.count === 0 || timestampIn(signal.latestAt, from, to));
}
function validWindow(window: SearchWindow, from: number, to: number) {
  return safeCount(window.total) && safeCount(window.failed) && window.failed <= window.total &&
    (window.failed === 0 || timestampIn(window.latestFailureAt, from, to));
}
function degraded(window: SearchWindow) {
  return window.total >= SEARCH_MIN_ATTEMPTS && window.failed >= SEARCH_MIN_FAILURES && window.failed * 4 >= window.total;
}

/** Pure rules. A false state means verified recovery; absent state means unknown.
 * The service replaces provisional tokens with persisted occurrence tokens, so
 * polling/count changes do not continuously reset acknowledgement.
 */
export function deriveExpandedAdminAlerts(snapshot: ExpandedAlertSnapshot, databaseConnected: boolean, now = new Date()): {
  candidates: AdminAlertCandidate[];
  states: Record<string, boolean>;
} {
  const candidates: AdminAlertCandidate[] = [];
  const states: Record<string, boolean> = {};
  if (!databaseConnected) return { candidates, states };
  const until = now.getTime();
  if (!Number.isFinite(until)) throw new Error("Invalid alert observation time.");
  const prefix = `expanded.${snapshot.environment}`;
  function add(input: Omit<AdminAlertCandidate, "signalToken">) {
    candidates.push({ ...input, signalToken: input.key });
    states[input.key] = true;
  }
  function telemetry(source: "search" | "support" | "users", available: boolean) {
    const key = `${prefix}.${source}.telemetry`;
    states[key] = !available;
    if (!available) add({
      key, severity: "WARNING", source: source === "search" ? "SEARCH" : source === "support" ? "SUPPORT" : "USERS",
      title: `${source === "search" ? "Search" : source === "support" ? "Support" : "Administrator security"} monitoring unavailable`,
      message: "The authoritative monitoring records could not be verified. Missing data is not being reported as zero or healthy.",
      actionHref: source === "search" ? "/admin/searches/activity" : source === "support" ? "/admin/support" : "/admin/users?role=ADMIN&status=ACTIVE",
    });
  }
  const searches = snapshot.searches;
  const searchAvailable = searches !== null && searches.length === products.length &&
    products.every(product => searches.filter(row => row.product === product).length === 1) &&
    searches.every(row => typeof row.enabled === "boolean" &&
      validWindow(row.previous, until - 2 * SEARCH_WINDOW_MS, until - SEARCH_WINDOW_MS - 1) &&
      validWindow(row.current, until - SEARCH_WINDOW_MS, until));
  telemetry("search", searchAvailable);
  if (searchAvailable && searches) {
    for (const row of searches) {
      const key = `${prefix}.search.${row.product}`;
      const active = row.enabled && degraded(row.previous) && degraded(row.current);
      states[key] = active;
      if (!active) continue;
      const critical = row.previous.failed * 4 >= row.previous.total * 3 && row.current.failed * 4 >= row.current.total * 3;
      const params = new URLSearchParams({ product: row.product, status: "FAILED", environment: snapshot.environment,
        range: "custom", from: new Date(until - 2 * SEARCH_WINDOW_MS).toISOString(), to: now.toISOString() });
      add({ key, severity: critical ? "CRITICAL" : "WARNING", source: "SEARCH",
        title: `${productLabels[row.product]} searches are persistently failing`,
        message: `${row.previous.failed} of ${row.previous.total} searches failed in the previous 15 minutes and ${row.current.failed} of ${row.current.total} in the latest 15 minutes. This reports recorded customer-search impact, not an assumed provider cause.`,
        actionHref: `/admin/searches/activity?${params}`, signalAt: row.current.latestFailureAt });
    }
  }
  const support = snapshot.support;
  const supportAvailable = support !== null && validCountSignal(support.OPEN, 0, until) && validCountSignal(support.WAITING_ON_TEAM, 0, until);
  telemetry("support", supportAvailable);
  if (supportAvailable && support) {
    for (const status of ["OPEN", "WAITING_ON_TEAM"] as const) {
      const signal = support[status];
      const key = `${prefix}.support.${status}`;
      states[key] = signal.count > 0;
      if (!signal.count) continue;
      add({ key, severity: "WARNING", source: "SUPPORT", title: "Urgent support tickets need team attention",
        message: `${signal.count} explicitly urgent ticket(s) in the current database are ${status === "OPEN" ? "open" : "waiting on the team"}. Resolved, closed and customer-waiting tickets are excluded.`,
        actionHref: `/admin/support?priority=URGENT&status=${status}`, signalAt: signal.latestAt });
    }
  }
  const users = snapshot.users;
  const usersAvailable = users !== null && validCountSignal(users, until - ADMIN_SECURITY_WINDOW_MS, until);
  telemetry("users", usersAvailable);
  if (usersAvailable && users) {
    const key = `${prefix}.users.admin-mfa-disabled`;
    states[key] = users.count > 0;
    if (users.count) add({ key, severity: "WARNING", source: "USERS", title: "Administrator two-factor protection was disabled",
      message: `${users.count} active administrator account(s) in the current database have an explicit two-factor disable event within 24 hours and remain disabled. Review whether the change was authorized; this is not evidence of compromise.`,
      actionHref: "/admin/users?role=ADMIN&status=ACTIVE", signalAt: users.latestAt });
  }
  return { candidates, states };
}
