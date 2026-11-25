import { ADMIN_DEFAULT_TIME_ZONE, adminLocalDate } from "./adminLocalTime";
import { adminCustomDateRange, adminRollingRange, validAdminCustomCalendarDates } from "./adminReportingRanges";

export type OverviewRange = "today" | "24h" | "7d" | "30d" | "custom";
export type OverviewCustomDates = { fromDate: string; toDate: string };
export type OverviewPeriod =
  | { range: Exclude<OverviewRange, "custom"> }
  | ({ range: "custom" } & OverviewCustomDates);

export function validOverviewCustomDates({ fromDate, toDate }: OverviewCustomDates, today: string) {
  return validAdminCustomCalendarDates(fromDate, toDate, today);
}

export function resolveOverviewRange(
  raw: { range?: string | string[]; from?: string | string[]; to?: string | string[] } = {},
  now = new Date(),
  timeZone = ADMIN_DEFAULT_TIME_ZONE,
): { period: OverviewPeriod; from: Date; to: Date; today: string; invalidCustom: boolean } {
  const today = adminLocalDate(now, timeZone);
  if (raw.range === "custom" && typeof raw.from === "string" && typeof raw.to === "string") {
    const period = { range: "custom", fromDate: raw.from, toDate: raw.to } as const;
    const range = adminCustomDateRange(period.fromDate, period.toDate, now, timeZone);
    if (range) return { period, ...range, today, invalidCustom: false };
  }

  const range = raw.range === "24h" || raw.range === "7d" || raw.range === "30d" ? raw.range : "today";
  const { from } = adminRollingRange(range, now, timeZone);
  return { period: { range }, from: new Date(from), to: now, today, invalidCustom: raw.range === "custom" };
}

export function overviewPeriodHref(period: OverviewPeriod) {
  if (period.range === "today") return "/admin";
  const params = new URLSearchParams({ range: period.range });
  if (period.range === "custom") {
    params.set("from", period.fromDate);
    params.set("to", period.toDate);
  }
  return "/admin?" + params.toString();
}
