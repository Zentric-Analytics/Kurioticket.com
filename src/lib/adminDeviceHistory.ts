import { adminCalendarDayStart, adminCalendarNextDayStart, adminTodayStart } from "./adminTimeZone";

export const DEVICE_HISTORY_PAGE_SIZE = 20;
export const deviceHistoryRanges = ["all", "today", "7d", "30d", "custom"] as const;
export type DeviceHistoryRange = (typeof deviceHistoryRanges)[number];
export type DeviceHistoryQuery = {
  range: DeviceHistoryRange;
  page: number;
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
  const from = raw.from ?? "";
  const to = raw.to ?? "";
  if (range === "custom") {
    if (typeof from !== "string" || typeof to !== "string"
      || !validUtcDay(from) || !validUtcDay(to) || from > to)
      return { ok: false, error: "Choose valid inclusive From and To dates." };
    return { ok: true, query: { range, page, from, to } };
  }
  // Date inputs may retain values when switching from Custom to a preset.
  // They are ignored unless Custom was explicitly selected.
  return { ok: true, query: { range: range as DeviceHistoryRange, page } };
}

/** Today means local midnight through the current observation, not a rolling 24 hours. */
export function deviceTodayWindow(now = new Date(), timeZone = "UTC") {
  return { gte: adminTodayStart(now, timeZone), lte: now };
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
  const start = adminCalendarDayStart(query.from!, timeZone);
  const afterEnd = adminCalendarNextDayStart(query.to!, timeZone);
  return { gte: start, lt: afterEnd, lte: now };
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
  if (activityReturn) params.set("activityReturn", activityReturn);
  return basePath + "?" + params.toString();
}
