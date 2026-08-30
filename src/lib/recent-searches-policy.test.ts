import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCarRecentSearch,
  clearRecentSearches,
  fetchBackendRecentSearches,
  isRememberRecentSearchesEnabled,
  mergeRecentSearches,
  normalizeRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  setRememberRecentSearches,
  syncBackendRecentSearch,
  upsertRecentSearch,
  type RecentSearchEntry,
} from "./recent-searches";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });

const hotel = (id: string, createdAt: string): RecentSearchEntry => ({
  id, type: "hotel", createdAt, label: id, subtitle: "dates", href: `/hotels/results?destination=${id}`,
  params: { destination: id, checkIn: "2026-09-01", checkOut: "2026-09-02", guests: 1, rooms: 1 },
});

test.beforeEach(() => storage.clear());

test("retention removes expired/future-clock records, dedupes newest and caps at ten", () => {
  const now = Date.parse("2026-08-30T12:00:00.000Z");
  const entries = Array.from({ length: 13 }, (_, index) => hotel(`h${index}`, new Date(now - index * 1_000).toISOString()));
  entries.push(hotel("h0", new Date(now - 50_000).toISOString()));
  entries.push(hotel("expired", new Date(now - 91 * 86_400_000).toISOString()));
  entries.push(hotel("future", new Date(now + 10 * 60_000).toISOString()));
  const normalized = normalizeRecentSearches(entries, now);
  assert.equal(normalized.length, 10);
  assert.equal(normalized[0].id, "h0");
  assert.ok(!normalized.some((entry) => entry.id === "expired" || entry.id === "future"));
});

test("v1 is read through without rewrite and first mutation writes v2", () => {
  const legacy = hotel("legacy", new Date().toISOString());
  storage.setItem("kurioticket_recent_searches_v1", JSON.stringify([legacy]));
  assert.equal(readRecentSearches()[0]?.id, "legacy");
  assert.equal(storage.getItem("kurioticket_recent_searches_v2"), null);
  upsertRecentSearch(hotel("new", new Date(Date.now() + 1).toISOString()));
  assert.equal(JSON.parse(storage.getItem("kurioticket_recent_searches_v2")!).version, 2);
  assert.ok(storage.getItem("kurioticket_recent_searches_v1"));
});

test("remove and Clear all hide exactly visible legacy items without deleting the legacy key", () => {
  const legacy = hotel("legacy", new Date(Date.now() - 1_000).toISOString());
  storage.setItem("kurioticket_recent_searches_v1", JSON.stringify([legacy]));
  assert.deepEqual(removeRecentSearch("legacy"), []);
  assert.ok(storage.getItem("kurioticket_recent_searches_v1"));
  storage.setItem("kurioticket_recent_searches_v1", JSON.stringify([hotel("other", new Date(Date.now() - 1_000).toISOString())]));
  clearRecentSearches();
  assert.deepEqual(readRecentSearches(), []);
  assert.ok(storage.getItem("kurioticket_recent_searches_v1"));
});

test("remember opt-out stops writes and hides rather than silently deleting history", () => {
  upsertRecentSearch(hotel("kept", new Date().toISOString()));
  setRememberRecentSearches(false);
  assert.equal(isRememberRecentSearchesEnabled(), false);
  assert.deepEqual(readRecentSearches(), []);
  upsertRecentSearch(hotel("ignored", new Date().toISOString()));
  setRememberRecentSearches(true);
  assert.deepEqual(readRecentSearches().map((entry) => entry.id), ["kept"]);
});

test("device opt-out also hides account history and prevents backend sync", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch must not run while opted out");
  };
  try {
    setRememberRecentSearches(false);
    assert.deepEqual(await fetchBackendRecentSearches(), { ok: true, items: [] });
    assert.deepEqual(await syncBackendRecentSearch(hotel("blocked", new Date().toISOString())), { ok: true });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("signed-in display merge is read-only, semantic, newest-first and bounded", () => {
  const account = [hotel("same", "2026-08-30T10:00:00.000Z"), hotel("account", "2026-08-30T09:00:00.000Z")];
  const device = [hotel("same", "2026-08-30T11:00:00.000Z"), hotel("device", "2026-08-30T08:00:00.000Z")];
  const merged = mergeRecentSearches(account, device, Date.parse("2026-08-30T12:00:00.000Z"));
  assert.deepEqual(merged.map((entry) => entry.id), ["same", "account", "device"]);
  assert.equal(merged[0].createdAt, "2026-08-30T11:00:00.000Z");
});

test("car entries preserve query values and truthfully mark unverified text", () => {
  const entry = buildCarRecentSearch({ pickupLocation: "Xylophone Base 47", pickupDate: "2026-09-01", dropoffDate: "2026-09-02", pickupTime: "10:00", dropoffTime: "10:00", driverAge: "30", unverifiedLocation: true });
  assert.equal(entry.type, "car");
  assert.match(entry.subtitle, /Unverified location/);
  assert.equal(new URL(entry.href, "https://example.test").searchParams.get("pickupLocation"), "Xylophone Base 47");
});
