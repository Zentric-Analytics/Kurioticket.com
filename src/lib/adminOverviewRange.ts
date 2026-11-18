const DAY_MS = 24 * 60 * 60 * 1000;

export type OverviewRange = "24h" | "7d" | "30d" | "custom";
export type OverviewCustomDates = { fromDate: string; toDate: string };
export type OverviewPeriod =
  | { range: Exclude<OverviewRange, "custom"> }
  | ({ range: "custom" } & OverviewCustomDates);

function utcDay(value: string) {
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(value + "T00:00:00Z") : NaN;
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
}

export function validOverviewCustomDates({ fromDate, toDate }: OverviewCustomDates, today: string) {
  const from = utcDay(fromDate);
  const to = utcDay(toDate);
  return from <= to && toDate <= today && to - from < 90 * DAY_MS;
}

export function resolveOverviewRange(
  raw: { range?: string | string[]; from?: string | string[]; to?: string | string[] } = {},
  now = new Date(),
): { period: OverviewPeriod; from: Date; to: Date; today: string; invalidCustom: boolean } {
  const today = now.toISOString().slice(0, 10);
  if (raw.range === "custom" && typeof raw.from === "string" && typeof raw.to === "string") {
    const period = { range: "custom", fromDate: raw.from, toDate: raw.to } as const;
    if (validOverviewCustomDates(period, today)) {
      const from = new Date(utcDay(period.fromDate));
      const to = new Date(Math.min(now.getTime(), utcDay(period.toDate) + DAY_MS));
      if (from < to) return { period, from, to, today, invalidCustom: false };
    }
  }

  const range = raw.range === "7d" || raw.range === "30d" ? raw.range : "24h";
  const duration = range === "30d" ? 30 * DAY_MS : range === "7d" ? 7 * DAY_MS : DAY_MS;
  return { period: { range }, from: new Date(now.getTime() - duration), to: now, today, invalidCustom: raw.range === "custom" };
}

export function overviewPeriodHref(period: OverviewPeriod) {
  if (period.range === "24h") return "/admin";
  const params = new URLSearchParams({ range: period.range });
  if (period.range === "custom") {
    params.set("from", period.fromDate);
    params.set("to", period.toDate);
  }
  return "/admin?" + params.toString();
}
