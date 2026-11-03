/** Use the server-generated attribution boundaries, not an independently
 * recomputed "last N days" window, when drilling into handoff records. */
export function referralHandoffHref(input: {
  start: string;
  end: string;
  environment: "staging" | "production";
  provider?: string;
  product?: "flight" | "hotel";
  correlation?: "exact" | "unavailable";
}) {
  const params = new URLSearchParams({
    environment: input.environment,
    from: input.start,
    to: input.end,
  });
  if (input.provider) params.set("provider", input.provider);
  if (input.product) params.set("product", input.product.toUpperCase());
  if (input.correlation) params.set("correlation", input.correlation);
  return "/admin/redirects?" + params.toString();
}

/** Only known list-query fields return to the records page from a detail.
 * Never accept a caller-supplied URL or redirect destination. */
const listKeys = ["environment", "product", "identity", "userId", "visitorId", "provider", "correlation", "from", "to", "cursor", "limit"] as const;
export function handoffListParams(raw: Record<string, string | string[] | undefined>) {
  const result = new URLSearchParams();
  for (const key of listKeys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 2048) result.set(key, value);
  }
  return result;
}
export function handoffReturnHref(raw: Record<string, string | string[] | undefined>) {
  const params = handoffListParams(raw);
  return "/admin/redirects" + (params.size ? "?" + params.toString() : "");
}
