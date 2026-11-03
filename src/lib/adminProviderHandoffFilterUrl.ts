/** Build a standalone handoff-list URL without breaking deep-linked customer scope. */
export type ProviderHandoffFilterValues = {
  product: string;
  identity: string;
  correlation: string;
  provider: string;
  environment: string;
};

export type ProviderHandoffFilterScope = {
  userId: string;
  visitorId: string;
  from: string;
  to: string;
};

/** Changing identity is the only operation that removes pinned user/visitor IDs. */
export function providerHandoffFiltersHref(
  values: ProviderHandoffFilterValues,
  scope: ProviderHandoffFilterScope,
  changeIdentity = false,
) {
  const params = new URLSearchParams();
  if (!changeIdentity) {
    if (scope.userId) params.set("userId", scope.userId);
    if (scope.visitorId) params.set("visitorId", scope.visitorId);
  }
  if (scope.from) params.set("from", scope.from);
  if (scope.to) params.set("to", scope.to);
  if (values.product) params.set("product", values.product);
  if (values.identity && values.identity !== "all") params.set("identity", values.identity);
  if (values.correlation) params.set("correlation", values.correlation);
  if (values.provider.trim()) params.set("provider", values.provider.trim());
  if (values.environment) params.set("environment", values.environment);
  const query = params.toString();
  return "/admin/redirects" + (query ? "?" + query : "");
}


/**
 * Only apply server-backed filter props for our latest navigation when there
 * are no newer local provider keystrokes. Previous responses can finish while
 * a new 300 ms debounce is pending, so accepting them would lose user input.
 */
export function shouldAcceptHandoffFilterResponse(
  initial: ProviderHandoffFilterValues,
  scope: ProviderHandoffFilterScope,
  latestRequestedHref: string | null,
  latestProviderDraft: string,
  externalNavigation = false,
): boolean {
  if (externalNavigation) return true;
  const incomingHref = providerHandoffFiltersHref(initial, scope);
  return (latestRequestedHref === null || incomingHref === latestRequestedHref)
    && latestProviderDraft.trim() === initial.provider.trim();
}


/**
 * Canonicalize a History API URL to its actual record-filter fields. Cursor
 * and limit changes intentionally do not change the filter context.
 */
export function providerHandoffHistoryFilterHref(search: string): string {
  const params = new URLSearchParams(search);
  return providerHandoffFiltersHref({
    product: params.get("product") || "",
    identity: params.get("identity") || "all",
    correlation: params.get("correlation") || "",
    provider: params.get("provider") || "",
    environment: params.get("environment") || "",
  }, {
    userId: params.get("userId") || "",
    visitorId: params.get("visitorId") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  });
}
