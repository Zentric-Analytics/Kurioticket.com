const SAVED_ITEMS_STORAGE_KEY = "kurioticket_saved_items_v1";
const LEGACY_SAVED_ITEMS_STORAGE_KEY = "kurioticket_saved_trips_v1";
function canUseStorage() { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }
export function readSavedItemIds(): string[] {
  if (!canUseStorage()) return [];
  try {
    const current = window.localStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
    const legacy = current ? null : window.localStorage.getItem(LEGACY_SAVED_ITEMS_STORAGE_KEY);
    const parsed: unknown = JSON.parse(current ?? legacy ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((id): id is string => typeof id === "string");
    if (legacy) { window.localStorage.setItem(SAVED_ITEMS_STORAGE_KEY, JSON.stringify(ids)); window.localStorage.removeItem(LEGACY_SAVED_ITEMS_STORAGE_KEY); }
    return ids;
  } catch { return []; }
}
export function writeSavedItemIds(ids: string[]) {
  if (!canUseStorage()) return;
  try { window.localStorage.setItem(SAVED_ITEMS_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids)))); }
  catch { /* Storage can be unavailable in private browsing. */ }
}
export function toggleSavedItemId(ids: string[], id: string): string[] { return ids.includes(id) ? ids.filter(itemId => itemId !== id) : [...ids, id]; }
