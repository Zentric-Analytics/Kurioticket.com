/**
 * Preserve the selected Search activity scope when opening an individual
 * search. Only known search filters are forwarded; never accept a destination
 * URL from a query string as a return target.
 */
export const searchActivityFilterKeys = [
  "applicationSource",
  "range",
  "environment",
  "product",
  "status",
  "identity",
  "provider",
  "userId",
  "visitorId",
  "from",
  "to",
] as const;

type SearchActivityRawParams = Record<string, string | string[] | undefined>;

/** Translate compatible bookmarks and ask before widening an old identity scope. */
export function resolveSearchActivityLegacyFilters(raw: SearchActivityRawParams) {
  if (raw.applicationSource === "BOT") {
    const href = searchActivityReturnHref({ ...raw, applicationSource: undefined, identity: "bot" });
    if (raw.identity && raw.identity !== "all" && raw.identity !== "bot") {
      return {
        kind: "unsupported" as const,
        href,
        message: "This link combines the former Bot platform filter with another identity. Use the Bot identity filter to see crawler searches.",
        action: "Use Bot identity",
      };
    }
    if (!searchActivityFilterKeys.some(key => Array.isArray(raw[key]))) {
      return { kind: "redirect" as const, href };
    }
  }
  if (raw.identity === "unattributed") {
    return {
      kind: "unsupported" as const,
      href: searchActivityReturnHref({ ...raw, identity: undefined }),
      message: "The Unattributed identity filter has been removed. Clear it to choose All identities, Registered, Guest, or Bot.",
      action: "Clear legacy identity filter",
    };
  }
  return null;
}

/** A filtered URL that is safe to use as the search detail's back destination. */
export function searchActivityReturnHref(raw: SearchActivityRawParams, defaultRange?: string): string {
  const params = new URLSearchParams();
  for (const key of searchActivityFilterKeys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 256) {
      params.set(key, value);
    }
  }
  if (!params.has("range") && defaultRange) params.set("range", defaultRange);
  const query = params.toString();
  return "/admin/searches/activity" + (query ? "?" + query : "");
}

/** Extract the search filters, without its fixed destination, for the Open link. */
export function searchActivityDetailQuery(raw: SearchActivityRawParams, defaultRange?: string): string {
  return searchActivityReturnHref(raw, defaultRange).split("?")[1] ?? "";
}
