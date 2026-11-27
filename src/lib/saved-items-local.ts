const SAVED_ITEMS_STORAGE_KEY = "kurioticket_saved_items_v1";
const LEGACY_SAVED_ITEMS_STORAGE_KEY = "kurioticket_saved_trips_v1";
function getStorage() {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}
export function readSavedItemIds(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const current = storage.getItem(SAVED_ITEMS_STORAGE_KEY);
    const legacy = current ? null : storage.getItem(LEGACY_SAVED_ITEMS_STORAGE_KEY);
    const parsed: unknown = JSON.parse(current ?? legacy ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((id): id is string => typeof id === "string");
    if (legacy) {
      try { storage.setItem(SAVED_ITEMS_STORAGE_KEY, JSON.stringify(ids)); storage.removeItem(LEGACY_SAVED_ITEMS_STORAGE_KEY); }
      catch { /* Readable saved items remain available when migration cannot persist. */ }
    }
    return ids;
  } catch { return []; }
}
export function writeSavedItemIds(ids: string[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(SAVED_ITEMS_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
    return true;
  } catch { return false; }
}
export function toggleSavedItemId(ids: string[], id: string): string[] { return ids.includes(id) ? ids.filter(itemId => itemId !== id) : [...ids, id]; }
