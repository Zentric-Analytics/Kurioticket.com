import type { SandboxOffer } from "@/services/travel/kayakSandbox";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";

/** Exact, tab-local displayed flight inventory for a return from details.
 * Main provider responses continue to live in flightResultsSessionCache;
 * only visible result IDs and KAYAK sandbox offers are stored here.
 * This is never used to authorize booking or extend any provider quote.
 */
const KEY = "kurioticket:flight-results-return-view:v1";
const TTL_MS = 30 * 60_000;
const MAX_RESULT_IDS = 4_000;
const MAX_KAYAK_OFFERS = 500;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function browserStore(): Store | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export type FlightResultsReturnView = {
  version: 1;
  searchKey: string;
  href: string;
  savedAt: number;
  validUntil: number;
  resultIds: string[];
  sortMode: string;
  kayakOffers: SandboxOffer[];
  kayakCriteria: Record<string, string>;
};

export function writeFlightResultsReturnView(
  value: Omit<FlightResultsReturnView, "version" | "savedAt">,
  store: Store | null = browserStore(), now = Date.now(),
) {
  if (!store || value.validUntil <= now || !Number.isFinite(value.validUntil)
    || !value.searchKey || !value.href.startsWith("/flights/results?")
    || value.resultIds.length === 0 || value.resultIds.length > MAX_RESULT_IDS
    || value.kayakOffers.length > MAX_KAYAK_OFFERS
    || value.resultIds.some(id => typeof id !== "string" || !id || id.length > 512)) return;
  try {
    // Never write raw provider credentials, internal refs or an arbitrary URL.
    const safeOffers = value.kayakOffers.map(offer => {
      const testUrl = sandboxBookingUrl(offer.testUrl);
      if (!testUrl) return null;
      return { ...offer, testUrl };
    });
    if (safeOffers.some(offer => !offer)) return;
    const snapshot: FlightResultsReturnView = {
      ...value, kayakOffers: safeOffers as SandboxOffer[],
      version: 1, savedAt: now,
      validUntil: Math.min(value.validUntil, now + TTL_MS),
    };
    store.setItem(KEY, JSON.stringify(snapshot));
  } catch { /* Private mode / quota must not block opening details. */ }
}

export function readFlightResultsReturnView(
  searchKey: string, href: string,
  store: Store | null = browserStore(), now = Date.now(),
): FlightResultsReturnView | null {
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const snapshot = data as Partial<FlightResultsReturnView>;
    if (snapshot.version !== 1 || snapshot.searchKey !== searchKey
      || snapshot.href !== href || typeof snapshot.savedAt !== "number"
      || !Number.isFinite(snapshot.savedAt) || typeof snapshot.validUntil !== "number"
      || !Number.isFinite(snapshot.validUntil) || now < snapshot.savedAt
      || now >= snapshot.validUntil || now - snapshot.savedAt > TTL_MS
      || !Array.isArray(snapshot.resultIds) || snapshot.resultIds.length === 0
      || snapshot.resultIds.length > MAX_RESULT_IDS
      || snapshot.resultIds.some(id => typeof id !== "string" || !id || id.length > 512)
      || typeof snapshot.sortMode !== "string"
      || !Array.isArray(snapshot.kayakOffers) || snapshot.kayakOffers.length > MAX_KAYAK_OFFERS
      || !snapshot.kayakOffers.every(offer => offer && typeof offer === "object"
        && typeof offer.id === "string"
        && typeof offer.testUrl === "string"
        && sandboxBookingUrl(offer.testUrl) === offer.testUrl)
      || !snapshot.kayakCriteria || typeof snapshot.kayakCriteria !== "object"
      || Array.isArray(snapshot.kayakCriteria)
      || !Object.values(snapshot.kayakCriteria).every(v => typeof v === "string")) return null;
    return snapshot as FlightResultsReturnView;
  } catch { return null; }
}

/** Read only the flight return view's target; the search-key match is still
 * enforced by FlightResultsClient before the result list is displayed. */
export function peekFlightResultsReturnView(
  href: string, store: Store | null = browserStore(), now = Date.now(),
): FlightResultsReturnView | null {
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const snapshot: unknown = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
    const value = snapshot as Partial<FlightResultsReturnView>;
    if (typeof value.searchKey !== "string") return null;
    return readFlightResultsReturnView(value.searchKey, href, store, now);
  } catch { return null; }
}
