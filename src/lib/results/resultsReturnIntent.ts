/** One-time, short-lived navigation intent. Only a user returning from an
 * internal details page may reuse previous results; a new search must still
 * reach providers and create its own SearchHistory record. */
export type ResultsProduct = "flight" | "hotel" | "car";
const PREFIX = "kurioticket:results-return:v1:";
const MAX_AGE_MS = 10 * 60_000;
const PATHS: Record<ResultsProduct, string> = {
  flight: "/flights/results", hotel: "/hotels/results", car: "/cars/results",
};
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isResultsHref(product: ResultsProduct, href: string, base: string) {
  try {
    const destination = new URL(href, base);
    return destination.origin === new URL(base).origin && destination.pathname === PATHS[product];
  } catch { return false; }
}

export function markResultsReturn(
  product: ResultsProduct, href: string,
  storage: StorageLike | null = typeof window === "undefined" ? null : window.sessionStorage,
  now = Date.now(), base = typeof window === "undefined" ? "https://kurioticket.invalid" : window.location.href,
) {
  if (!storage || !isResultsHref(product, href, base)) return;
  try {
    const target = new URL(href, base);
    storage.setItem(PREFIX + product, JSON.stringify({
      pathname: target.pathname, savedAt: now,
      // Don't persist customer search criteria or the location in this marker.
    }));
  } catch { /* Disabled storage must not block navigation. */ }
}

export function takeResultsReturn(
  product: ResultsProduct, href: string,
  storage: StorageLike | null = typeof window === "undefined" ? null : window.sessionStorage,
  now = Date.now(), base = typeof window === "undefined" ? "https://kurioticket.invalid" : window.location.href,
): boolean {
  if (!storage || !isResultsHref(product, href, base)) return false;
  let raw: string | null = null;
  try {
    raw = storage.getItem(PREFIX + product);
    storage.removeItem(PREFIX + product);
    if (!raw) return false;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return false;
    const marker = data as { pathname?: unknown; savedAt?: unknown };
    return marker.pathname === PATHS[product] && typeof marker.savedAt === "number"
      && Number.isFinite(marker.savedAt) && now >= marker.savedAt && now - marker.savedAt <= MAX_AGE_MS;
  } catch { return false; }
}
