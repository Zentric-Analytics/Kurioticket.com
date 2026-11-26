import { parseActivityFilters, type ActivityFilters } from "./adminIdentityActivity";
import { normalizeUserActivityQuery, type RawActivityQuery } from "./adminActivityDateQuery";
import { activityJourneyReturnHref } from "./adminActivityJourneyNavigation";
import { isAdminReportingRange, type AdminReportingRange } from "./adminReportingRanges";
import type { ActivityRow, IdentityKind } from "./adminIdentityJourney";

export const PAGE_VIEW_SUMMARY_LIMIT = 1;
export const PAGE_HISTORY_MAX_PAGE = 1_000_000;
export const PAGE_HISTORY_PLATFORMS = [
  { value: "all", label: "All platforms" },
  { value: "desktop", label: "Desktop web" },
  { value: "mobile", label: "Mobile web" },
  { value: "ios", label: "iOS app" },
  { value: "android", label: "Android app" },
] as const;
export type PageHistoryPlatform = (typeof PAGE_HISTORY_PLATFORMS)[number]["value"];
export type PageHistoryQuery = {
  filters: ActivityFilters;
  range: AdminReportingRange;
  platform: PageHistoryPlatform;
  page: number;
};
export function validPageHistoryPage(page: number) {
  return Number.isSafeInteger(page) && page >= 1 && page <= PAGE_HISTORY_MAX_PAGE;
}
export function isPageHistoryPlatform(value: unknown): value is PageHistoryPlatform {
  return PAGE_HISTORY_PLATFORMS.some(option => option.value === value);
}
/** Historical transport labels are retained in storage, even after display normalization. */
export function pageHistoryPlatformValues(platform: PageHistoryPlatform): readonly string[] {
  switch (platform) {
    case "desktop": return ["Desktop web", "Desktop web (reported)"];
    case "mobile": return ["Mobile web", "Mobile web (reported)"];
    case "ios": return ["iOS app", "iOS app (reported)"];
    case "android": return ["Android app", "Android app (reported)"];
    default: return [];
  }
}
export function pageHistoryTransport(platform: PageHistoryPlatform): "web" | "native" | null {
  return platform === "desktop" || platform === "mobile" ? "web"
    : platform === "ios" || platform === "android" ? "native" : null;
}
export function recentPageViews(events: ActivityRow[]) {
  return events.filter(row => row.stage === "PAGE_VIEW" && row.pageView)
    .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, PAGE_VIEW_SUMMARY_LIMIT);
}

export function parsePageHistoryQuery(raw: RawActivityQuery, now: Date, timeZone = "UTC"):
  { ok: true; query: PageHistoryQuery } | { ok: false; error: string } {
  if (Object.values(raw).some(Array.isArray)) return { ok: false, error: "Repeated filters are not supported." };
  const range = typeof raw.range === "string" ? raw.range : "today";
  const platform = raw.platform ?? "all";
  const page = Number(raw.page ?? "1");
  if (!isAdminReportingRange(range)) return { ok: false, error: "Unsupported date range." };
  if (!isPageHistoryPlatform(platform)) return { ok: false, error: "Unsupported platform." };
  if (raw.page !== undefined && (typeof raw.page !== "string" || !/^[1-9]\d{0,6}$/.test(raw.page))) return { ok: false, error: "Invalid history page." };
  if (!validPageHistoryPage(page)) return { ok: false, error: "Invalid history page." };
  if (range === "custom" && !raw.from && !raw.to) return { ok: false, error: "Choose a valid custom date range." };
  // Use the same date semantics as Activity. Freeze the upper bound on all-time
  // views too, so paging links don't drift as new events arrive.
  const normalized = normalizeUserActivityQuery({ range, from: raw.from, to: raw.to, q: raw.q, product: raw.product }, now, timeZone);
  if (!normalized.to && range === "all") normalized.to = now.toISOString();
  const parsed = parseActivityFilters({ ...normalized, tab: "pages", stage: "all", order: "newest" }, timeZone);
  if (!parsed.ok) return parsed;
  return { ok: true, query: { filters: parsed.filters, range, platform, page } };
}

/** Return context cannot navigate to another identity or to an external page. */
export function pageHistoryBackHref(kind: IdentityKind, id: string, incoming: unknown) {
  const path = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  const safe = activityJourneyReturnHref(incoming);
  return safe && (safe === path || safe.startsWith(path + "?") || safe === path + "/all" || safe.startsWith(path + "/all?")) ? safe : path;
}

export function pageHistoryHref(path: string, query: PageHistoryQuery, returnHref: string) {
  const { filters, range, platform, page } = query;
  const params = new URLSearchParams({ range, page: String(page), activityReturn: returnHref });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q) params.set("q", filters.q);
  if (filters.product !== "all") params.set("product", filters.product);
  if (platform !== "all") params.set("platform", platform);
  return path + "?" + params.toString();
}

export function pageHistoryHrefFromActivity(kind: IdentityKind, id: string, filters: ActivityFilters, rawRange: string | undefined, returnHref: string) {
  const path = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/pages";
  const range = rawRange && isAdminReportingRange(rawRange) ? rawRange : filters.from || filters.to ? "custom" : "all";
  return pageHistoryHref(path, { filters: { ...filters, tab: "pages", stage: "all", order: "newest" }, range, platform: "all", page: 1 }, pageHistoryBackHref(kind, id, returnHref));
}
