import { HOMEPAGE_REFRESH_MARKET_CODES } from "@/lib/market/resolveMarket";
import type { HomepageCmsSection } from "@/lib/adminHomepageCms";

type RawQuery = Record<string, string | string[] | undefined>;
const statuses = new Set(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]);
const supportedMarkets = new Set<string>(HOMEPAGE_REFRESH_MARKET_CODES);

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function optionalContext(input: RawQuery, params: URLSearchParams, options: { faq?: boolean } = {}) {
  const status = one(input.status).trim().toUpperCase();
  if (statuses.has(status)) params.set("status", status);

  // Pagination cursors are opaque base64url values; do not carry arbitrary URLs.
  const cursor = one(input.cursor).trim();
  if (cursor.length <= 2048 && /^[A-Za-z0-9_-]+$/.test(cursor)) params.set("cursor", cursor);

  // These search controls are local to the list, but are restored after returning
  // from an editor when present in its URL.
  const query = one(input.q).trim();
  if (query && query.length <= 160 && !/[\x00-\x1f\x7f]/.test(query)) params.set("q", query);
  if (options.faq) {
    const category = one(input.category).trim();
    if (category && category.length <= 80 && !/[\x00-\x1f\x7f]/.test(category)) params.set("category", category);
  }
}

/** Only known Content routes can be return destinations; no user-supplied URLs. */
export function homepageCmsListNavigation(
  section: HomepageCmsSection,
  input: RawQuery,
  fallbackMarket = "ALL",
) {
  const requestedMarket = one(input.market).trim().toUpperCase();
  const validFallback = fallbackMarket === "ALL" || supportedMarkets.has(fallbackMarket) ? fallbackMarket : "ALL";
  const market = section === "hotel-destinations"
    ? "GLOBAL"
    : requestedMarket === "ALL" || supportedMarkets.has(requestedMarket) ? requestedMarket : validFallback;
  const params = new URLSearchParams({ market });
  optionalContext(input, params);
  // Homepage CMS directories all render one complete list; stale paged links
  // must never persist after returning from an editor.
  params.delete("cursor");
  const fromOverview = one(input.from) === "overview";
  if (fromOverview) params.set("from", "overview");
  return {
    market,
    query: params.toString(),
    listHref: `/admin/content/homepage/${section}?${params.toString()}`,
    backHref: fromOverview ? "/admin/content/homepage" : "/admin/content",
    backLabel: fromOverview ? "Back to homepage content" : "Back to Content",
  };
}

export function faqCmsListNavigation(input: RawQuery) {
  const params = new URLSearchParams();
  optionalContext(input, params, { faq: true });
  const query = params.toString();
  return { query, listHref: "/admin/content/faqs" + (query ? "?" + query : "") };
}

export function contentEditorHref(path: string, query: string) {
  return path + (query ? "?" + query : "");
}
