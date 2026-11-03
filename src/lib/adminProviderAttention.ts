/** Provider-health history is observational; older windows never imply a live incident. */
export const providerHealthWindows = [
  { hours: 24, label: "Last 24 hours" },
  { hours: 72, label: "Last 3 days" },
  { hours: 168, label: "Last 7 days" },
] as const;

export function parseProviderHealthHours(value: string | string[] | undefined): number {
  return typeof value === "string" && (value === "24" || value === "72" || value === "168")
    ? Number(value) : 24;
}

export type ProviderHealthRange = { from: Date; to: Date; fromDate: string; toDate: string };

/** Date-only inputs are interpreted as complete UTC calendar days. Bounded to
 * 90 days to avoid unbounded telemetry scans. Presets keep their rolling hours. */
export function parseProviderHealthRange(
  raw: Record<string, string | string[] | undefined>,
  now: Date = new Date(),
): { hours: number; range: ProviderHealthRange | null; error: string | null } {
  const hours = parseProviderHealthHours(raw.hours);
  if (raw.period !== "custom") return { hours, range: null, error: null };
  const start = raw.from;
  const end = raw.to;
  if (typeof start !== "string" || typeof end !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return { hours, range: null, error: "Select both dates and apply the custom range." };
  }
  const from = new Date(start + "T00:00:00.000Z");
  const to = new Date(end + "T23:59:59.999Z");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) ||
      from.toISOString().slice(0, 10) !== start ||
      to.toISOString().slice(0, 10) !== end ||
      to < from || end > now.toISOString().slice(0, 10) ||
      to.getTime() - from.getTime() > 90 * 86_400_000) {
    return { hours, range: null, error: "Choose a valid date range of up to 90 days, ending no later than today." };
  }
  return { hours, range: { from, to: to > now ? now : to, fromDate: start, toDate: end }, error: null };
}

export function providerHealthRangeHref(
  product: string,
  range: ProviderHealthRange | null,
  hours: number,
) {
  if (!range) return providerHealthHref(hours, product);
  const params = new URLSearchParams({ period: "custom", from: range.fromDate, to: range.toDate });
  if (product !== "all") params.set("product", product);
  return "/admin/providers?" + params.toString();
}

export function providerHealthHref(hours: number, product: string) {
  const params = new URLSearchParams();
  if (product !== "all") params.set("product", product);
  if (hours !== 24) params.set("hours", String(hours));
  const query = params.toString();
  return "/admin/providers" + (query ? "?" + query : "");
}

/** Show the exact provider and reporting interval in Search Activity.
 * Search Activity filters by SearchHistory.createdAt (not ApiProviderLog.createdAt).
 * Its provider filter requires execution evidence, but it is NOT an exact list
 * of provider calls in the health window and does not prove search failure. */
export function providerSearchActivityHref(input: {
  provider: string;
  product?: string;
  hours: number;
  until: Date;
}) {
  const params = new URLSearchParams();
  params.set("range", "custom");
  params.set("from", new Date(input.until.getTime() - input.hours * 3_600_000).toISOString());
  params.set("to", input.until.toISOString());
  params.set("provider", input.provider);
  if (input.product) params.set("product", input.product);
  return "/admin/searches/activity?" + params.toString();
}
