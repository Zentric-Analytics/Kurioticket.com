import assert from "node:assert/strict";
import test from "node:test";
import { readSavedItemIds, writeSavedItemIds } from "./saved-items-local";

function withStorage(options: { blocked?: boolean; readDenied?: boolean; quota?: boolean; values?: Record<string, string> }, check: (values: Map<string, string>) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map(Object.entries(options.values ?? {}));
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: Object.defineProperty({}, "localStorage", { get() {
      if (options.blocked) throw new DOMException("Fixture storage denied", "SecurityError");
      return {
        getItem(key: string) { if (options.readDenied) throw new DOMException("Fixture read denied", "SecurityError"); return values.get(key) ?? null; },
        setItem(key: string, value: string) { if (options.quota) throw new DOMException("Fixture quota exhausted", "QuotaExceededError"); values.set(key, value); },
        removeItem(key: string) { values.delete(key); },
      };
    } }) });
    check(values);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window");
  }
}

test("saved items tolerate denial of the localStorage getter itself", () => {
  withStorage({ blocked: true }, () => {
    assert.deepEqual(readSavedItemIds(), []);
    assert.doesNotThrow(() => writeSavedItemIds(["fixture-item"]));
  });
});

test("saved item reads tolerate storage read denial and malformed values", () => {
  withStorage({ readDenied: true }, () => assert.deepEqual(readSavedItemIds(), []));
  withStorage({ values: { kurioticket_saved_items_v1: "{malformed" } }, () => assert.deepEqual(readSavedItemIds(), []));
});

test("a full local store does not discard readable legacy saved items or claim migration succeeded", () => {
  withStorage({ quota: true, values: { kurioticket_saved_trips_v1: '["fixture-item"]' } }, values => {
    assert.deepEqual(readSavedItemIds(), ["fixture-item"]);
    assert.equal(values.has("kurioticket_saved_items_v1"), false);
    assert.equal(values.has("kurioticket_saved_trips_v1"), true);
    assert.doesNotThrow(() => writeSavedItemIds(["new-item"]));
    assert.equal(values.has("kurioticket_saved_items_v1"), false);
  });
});

test("normal saved-item migration and deduplicated writes preserve existing keys", () => {
  withStorage({ values: { kurioticket_saved_trips_v1: '["fixture-item",42]' } }, values => {
    assert.deepEqual(readSavedItemIds(), ["fixture-item"]);
    assert.equal(values.get("kurioticket_saved_items_v1"), '["fixture-item"]');
    assert.equal(values.has("kurioticket_saved_trips_v1"), false);
    writeSavedItemIds(["a", "a", "b"]);
    assert.deepEqual(readSavedItemIds(), ["a", "b"]);
  });
});
