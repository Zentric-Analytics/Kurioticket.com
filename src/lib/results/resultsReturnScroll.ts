import type { ResultsProduct } from "./resultsReturnIntent";

const PREFIX = "kurioticket:results-scroll:v1:";
const MAX_AGE = 10 * 60_000;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function browserStorage(): Store | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

/** A viewport position only, with no passenger or provider data. */
export function rememberResultsScroll(product: ResultsProduct, y: number,
  store: Store | null = browserStorage(),
  now = Date.now()) {
  if (!store || !Number.isFinite(y) || y < 0) return;
  try { store.setItem(PREFIX + product, JSON.stringify({ y, savedAt: now })); } catch { /* private browsing */ }
}

export function takeResultsScroll(product: ResultsProduct,
  store: Store | null = browserStorage(),
  now = Date.now()): number | null {
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + product);
    store.removeItem(PREFIX + product);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const data = value as { y?: unknown; savedAt?: unknown };
    if (typeof data.y !== "number" || !Number.isFinite(data.y) || data.y < 0
      || typeof data.savedAt !== "number" || !Number.isFinite(data.savedAt)
      || now < data.savedAt || now - data.savedAt > MAX_AGE) return null;
    return data.y;
  } catch { return null; }
}
