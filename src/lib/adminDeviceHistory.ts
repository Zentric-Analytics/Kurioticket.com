import { adminCalendarRange, adminLocalDate, viewerTodayStart } from "./adminLocalTime";
import { isPageHistoryPlatform, pageHistoryBackHref, type PageHistoryPlatform } from "./adminPageHistory";
import { activityCustomDateBound, validActivityUtcInstant } from "./adminActivityDateQuery";
import { parseActivityFilters, validActivityIdentity, type ActivityFilters } from "./adminIdentityActivity";
import type { IdentityKind } from "./adminIdentityJourney";

export const DEVICE_HISTORY_PAGE_SIZE = 20;
export const deviceHistoryRanges = ["all", "today", "7d", "30d", "custom"] as const;
export type DeviceHistoryRange = (typeof deviceHistoryRanges)[number];
export type DeviceHistoryQuery = {
  range: DeviceHistoryRange;
  page: number;
  platform?: PageHistoryPlatform;
  from?: string;
  to?: string;
};
type RawQuery = Record<string, string | string[] | undefined>;
export type DeviceHistoryParsed =
  | { ok: true; query: DeviceHistoryQuery }
  | { ok: false; error: string };

function validUtcDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const at = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === value;
}

/** Full session history must not silently default an invalid range to all time. */
export function parseDeviceHistoryQuery(raw: RawQuery): DeviceHistoryParsed {
  if (Object.values(raw).some(Array.isArray)) return { ok: false, error: "Repeated filters are not supported." };
  const range = raw.range ?? "all";
  const rawPage = raw.page ?? "1";
  if (typeof range !== "string" || !deviceHistoryRanges.includes(range as DeviceHistoryRange))
    return { ok: false, error: "Unsupported date range." };
  if (typeof rawPage !== "string" || !/^[1-9]\d{0,6}$/.test(rawPage))
    return { ok: false, error: "Invalid history page." };
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page > 1_000_000)
    return { ok: false, error: "History page is out of range." };
  const platform = raw.platform ?? "all";
  if (!isPageHistoryPlatform(platform)) return { ok: false, error: "Unsupported platform." };
  const platformFilter = platform === "all" ? {} : { platform };
  const from = raw.from ?? "";
  const to = raw.to ?? "";
  if (range === "custom") {
    if (typeof from !== "string" || typeof to !== "string"
      || !validUtcDay(from) || !validUtcDay(to) || from > to)
      return { ok: false, error: "Choose valid inclusive From and To dates." };
    return { ok: true, query: { range, page, from, to, ...platformFilter } };
  }
  // Date inputs may retain values when switching from Custom to a preset.
  // They are ignored unless Custom was explicitly selected.
  return { ok: true, query: { range: range as DeviceHistoryRange, page, ...platformFilter } };
}

/** Today runs from local midnight through the current observation. */
export function deviceTodayWindow(now = new Date(), timeZone = "UTC") {
  return { gte: new Date(viewerTodayStart(now, timeZone)), lte: now };
}

/** Inclusive calendar date bounds; data are always limited to observations <= now. */
export function deviceHistoryWindow(query: DeviceHistoryQuery, now = new Date(), timeZone = "UTC") {
  if (query.range === "all") return { lte: now };
  if (query.range === "today") return deviceTodayWindow(now, timeZone);
  if (query.range === "7d" || query.range === "30d") {
    return {
      gte: new Date(now.getTime() - (query.range === "7d" ? 7 : 30) * 86_400_000),
      lte: now,
    };
  }
  const bounds = adminCalendarRange(query.from ?? "", query.to ?? "", timeZone);
  return { gte: bounds?.from ?? now, lt: bounds?.to ?? now, lte: now };
}

export function deviceHistoryHref(
  basePath: string, query: DeviceHistoryQuery, updates: Partial<DeviceHistoryQuery> = {},
  activityReturn?: string,
) {
  const next = { ...query, ...updates };
  const params = new URLSearchParams({ range: next.range, page: String(next.page) });
  if (next.range === "custom" && next.from && next.to) {
    params.set("from", next.from);
    params.set("to", next.to);
  }
  if (next.platform && next.platform !== "all") params.set("platform", next.platform);
  if (activityReturn) params.set("activityReturn", activityReturn);
  return basePath + "?" + params.toString();
}

/** Move only date scopes that the device reader can represent exactly.
 * A legacy sub-day or rolling-24-hour investigation must not become whole
 * calendar days or All time. Its recorded access details remain in Activity.
 */
export function deviceHistoryHrefFromActivity(
  kind: IdentityKind, id: string, filters: ActivityFilters, rawRange: string | undefined,
  returnHref: string, timeZone = "UTC",
): string | undefined {
  if (!validActivityIdentity(kind, id) || !parseActivityFilters({ ...filters }, timeZone).ok) return undefined;
  const range = rawRange || (filters.from || filters.to ? "custom" : "all");
  if (!deviceHistoryRanges.includes(range as DeviceHistoryRange)) return undefined;
  const query: DeviceHistoryQuery = { range: range as DeviceHistoryRange, page: 1 };
  if (range === "custom") {
    if (!filters.from || !filters.to) return undefined;
    const from = activityCustomDateBound(filters.from, "from", timeZone);
    const to = activityCustomDateBound(filters.to, "to", timeZone);
    if (!validActivityUtcInstant(from) || !validActivityUtcInstant(to)) return undefined;
    const fromDay = adminLocalDate(new Date(from), timeZone);
    const toDay = adminLocalDate(new Date(Date.parse(to) - 1), timeZone);
    const bounds = adminCalendarRange(fromDay, toDay, timeZone);
    if (!bounds || bounds.from.toISOString() !== from || bounds.to.toISOString() !== to) return undefined;
    query.from = fromDay;
    query.to = toDay;
  }
  return deviceHistoryHref("/admin/users/" + kind + "/" + encodeURIComponent(id) + "/devices",
    query, {}, pageHistoryBackHref(kind, id, returnHref));
}
