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
