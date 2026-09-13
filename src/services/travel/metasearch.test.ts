import assert from "node:assert/strict";
import test from "node:test";
import { requireProviderBinding, searchAllProviders, type MetasearchProvider, type ResolvedLocation } from "./metasearch";

type Raw = { id: string; price?: number };
type Offer = { id: string; price: number };
const location: ResolvedLocation = { canonicalId: "bos", label: "Boston", bindings: [{ provider: "a", id: "provider-place-41" }] };
const adapter = (id: string, run: MetasearchProvider<null, Raw, Offer>["search"], timeoutMs = 100): MetasearchProvider<null, Raw, Offer> => ({
  id, vertical: "hotels", timeoutMs, search: run,
  normalize: (raw) => typeof raw.price === "number" ? { id: raw.id, price: raw.price } : null,
});

test("concurrently completes all providers then normalizes, deduplicates and ranks one payload", async () => {
  let releases = 0;
  const slow = adapter("a", async (_query, bindings) => {
    assert.equal(bindings.get("bos"), "provider-place-41");
    await new Promise((resolve) => setTimeout(resolve, 15)); releases += 1;
    return { status: "success", offers: [{ id: "same", price: 80 }, { id: "invalid" }] };
  });
  const fast = adapter("b", async () => { releases += 1; return { status: "success", offers: [{ id: "same", price: 90 }, { id: "cheap", price: 20 }] }; });
  const response = await searchAllProviders(null, [location], [slow, fast], { deadlineMs: 200, dedupeKey: (offer) => offer.id, compare: (a, b) => a.price - b.price });
  assert.equal(releases, 2);
  assert.deepEqual(response.results, [{ id: "cheap", price: 20 }, { id: "same", price: 80 }]);
  assert.deepEqual(response.providers.map(({ status }) => status), ["success", "success"]);
  assert.equal(response.state, "results");
  assert.ok(Object.isFrozen(response) && Object.isFrozen(response.results));
});

test("contains failure and timeout while preserving successful inventory", async () => {
  const good = adapter("good", async () => ({ status: "success", offers: [{ id: "one", price: 5 }] }));
  const failed = adapter("failed", async () => { throw new Error("secret upstream detail"); });
  const timeout = adapter("timeout", async (_q, _b, signal) => new Promise((resolve) => signal.addEventListener("abort", () => resolve({ status: "timeout", offers: [] }), { once: true })), 5);
  const response = await searchAllProviders(null, [], [good, failed, timeout], { deadlineMs: 50, dedupeKey: (offer) => offer.id, compare: () => 0 });
  assert.equal(response.state, "results");
  assert.deepEqual(response.providers.map(({ status }) => status), ["success", "failed", "timeout"]);
  assert.doesNotMatch(JSON.stringify(response), /secret upstream detail/);
});

test("distinguishes truthful no inventory from total provider unavailability", async () => {
  const empty = adapter("empty", async () => ({ status: "success", offers: [] }));
  const down = adapter("down", async () => ({ status: "failed", offers: [] }));
  assert.equal((await searchAllProviders(null, [], [empty], { deadlineMs: 50, dedupeKey: (offer) => offer.id, compare: () => 0 })).state, "no-inventory");
  assert.equal((await searchAllProviders(null, [], [down], { deadlineMs: 50, dedupeKey: (offer) => offer.id, compare: () => 0 })).state, "unavailable");
});

test("provider location bindings fail closed when missing or ambiguous", () => {
  assert.equal(requireProviderBinding(location, "a"), "provider-place-41");
  assert.throws(() => requireProviderBinding(location, "missing"), /unambiguous/);
  assert.throws(() => requireProviderBinding({ ...location, bindings: [...location.bindings, { provider: "a", id: "other" }] }, "a"), /unambiguous/);
});
