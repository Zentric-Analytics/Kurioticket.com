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
function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function isResultsHref(product: ResultsProduct, href: string, base: string) {
  try {
    const destination = new URL(href, base);
    return destination.origin === new URL(base).origin && destination.pathname === PATHS[product];
  } catch { return false; }
}

export function markResultsReturn(
  product: ResultsProduct, href: string,
  storage: StorageLike | null = browserStorage(),
  now = Date.now(), base = typeof window === "undefined" ? "https://kurioticket.invalid" : window.location.href,
) {
  if (!storage || !isResultsHref(product, href, base)) return;
  try {
    const target = new URL(href, base);
    storage.setItem(PREFIX + product, JSON.stringify({
      pathname: target.pathname,
      // Flight returns must match the exact original results URL (including
      // filters/sort). Otherwise a later deliberate search could consume a
      // stale marker left by a details navigation.
      ...(product === "flight" ? { search: target.search } : {}),
      savedAt: now,
    }));
  } catch { /* Disabled storage must not block navigation. */ }
}

function readReturnMarker(
  product: ResultsProduct, href: string, storage: StorageLike | null,
  now: number, base: string, consume: boolean,
): boolean {
  if (!storage || !isResultsHref(product, href, base)) return false;
  try {
    const raw = storage.getItem(PREFIX + product);
    if (consume) storage.removeItem(PREFIX + product);
    if (!raw) return false;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return false;
    const marker = data as { pathname?: unknown; search?: unknown; savedAt?: unknown };
    const destination = new URL(href, base);
    return marker.pathname === PATHS[product]
      && (product !== "flight" || marker.search === destination.search)
      && typeof marker.savedAt === "number"
      && Number.isFinite(marker.savedAt)
      && now >= marker.savedAt
      && now - marker.savedAt <= (product === "flight" ? 24 * 60 * 60_000 : MAX_AGE_MS);
  } catch { return false; }
}

/** Read the intent without consuming it, for a companion provider component
 * that must decide whether to fetch before FlightResultsClient effects run. */
export function peekResultsReturn(
  product: ResultsProduct, href: string,
  storage: StorageLike | null = browserStorage(),
  now = Date.now(), base = typeof window === "undefined" ? "https://kurioticket.invalid" : window.location.href,
): boolean {
  return readReturnMarker(product, href, storage, now, base, false);
}

export function takeResultsReturn(
  product: ResultsProduct, href: string,
  storage: StorageLike | null = browserStorage(),
  now = Date.now(), base = typeof window === "undefined" ? "https://kurioticket.invalid" : window.location.href,
): boolean {
  return readReturnMarker(product, href, storage, now, base, true);
}
