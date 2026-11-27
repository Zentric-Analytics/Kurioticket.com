import assert from "node:assert/strict";
import test from "node:test";
import {
  getStoredLocale, getStoredRegion, getStoredCurrency,
  setStoredLocale, setStoredRegion, setStoredCurrency, setStoredDetectedRegion,
} from "./preferences";

type FixtureOptions = {
  cookies?: Record<string, string>;
  stored?: Record<string, string>;
  blockedStorage?: boolean;
  blockedReads?: boolean;
  quota?: boolean;
  blockedCookies?: boolean;
};

function withBrowser(options: FixtureOptions, check: (fixture: { cookies: Map<string, string>; stored: Map<string, string>; writes: string[] }) => void) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const cookies = new Map(Object.entries(options.cookies ?? {}));
  const stored = new Map(Object.entries(options.stored ?? {}));
  const writes: string[] = [];
  const storage = {
    getItem(key: string) { if (options.blockedReads) throw new DOMException("Fixture read denied", "SecurityError"); return stored.get(key) ?? null; },
    setItem(key: string, value: string) { if (options.quota) throw new DOMException("Fixture quota exhausted", "QuotaExceededError"); stored.set(key, value); },
  };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: Object.defineProperty({}, "localStorage", {
      get() { if (options.blockedStorage) throw new DOMException("Fixture storage denied", "SecurityError"); return storage; },
    }) });
    Object.defineProperty(globalThis, "document", { configurable: true, value: Object.defineProperty({}, "cookie", {
      get() { if (options.blockedCookies) throw new DOMException("Fixture cookie denied", "SecurityError"); return [...cookies].map(([name, value]) => `${name}=${value}`).join("; "); },
      set(value: string) { if (options.blockedCookies) throw new DOMException("Fixture cookie denied", "SecurityError"); writes.push(value); const [pair] = value.split(";"); const split = pair.indexOf("="); cookies.set(pair.slice(0, split), pair.slice(split + 1)); },
    }) });
    check({ cookies, stored, writes });
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window");
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument); else Reflect.deleteProperty(globalThis, "document");
  }
}

test("blocked localStorage getter falls back safely and does not prevent cookie preference updates", () => {
  withBrowser({ blockedStorage: true }, ({ cookies, writes }) => {
    assert.equal(getStoredLocale(), "en-us"); assert.equal(getStoredRegion(), null); assert.equal(getStoredCurrency(), null);
    assert.doesNotThrow(() => { setStoredLocale("fr"); setStoredRegion("jp"); setStoredCurrency("eur"); });
    assert.equal(cookies.get("kurioticket_locale"), "fr");
    assert.equal(cookies.get("kurioticket_region_override"), "JP");
    assert.equal(cookies.get("kurioticket_region"), "JP");
    assert.equal(cookies.get("ct_region"), "JP");
    assert.equal(cookies.get("kurioticket_currency"), "EUR");
    assert.ok(writes.every(value => value.endsWith("; path=/; max-age=31536000; samesite=lax")), "existing preference lifetime and scope must stay unchanged");
  });
});

test("valid cookies retain priority even when localStorage is unavailable", () => {
  withBrowser({ blockedStorage: true, cookies: { kurioticket_locale: "fr", kurioticket_region_override: "JP", kurioticket_currency: "EUR" } }, () => {
    assert.equal(getStoredLocale(), "fr"); assert.equal(getStoredRegion(), "JP"); assert.equal(getStoredCurrency(), "EUR");
  });
});

test("malformed encoded cookies fall through to independently valid stored preferences", () => {
  withBrowser({ cookies: { kurioticket_locale: "%E0%A4%A", kurioticket_region_override: "%E0%A4%A", kurioticket_region: "%E0%A4%A", ct_region: "%E0%A4%A", kurioticket_currency: "%E0%A4%A" }, stored: { kurioticket_locale: "fr", kurioticket_region_override: "JP", kurioticket_currency: "EUR" } }, () => {
    assert.equal(getStoredLocale(), "fr"); assert.equal(getStoredRegion(), "JP"); assert.equal(getStoredCurrency(), "EUR");
  });
});

test("blocked storage reads and cookie access use defaults without throwing", () => {
  withBrowser({ blockedReads: true, blockedCookies: true }, () => {
    assert.equal(getStoredLocale(), "en-us"); assert.equal(getStoredRegion(), null); assert.equal(getStoredCurrency(), null);
  });
});

test("quota failures preserve readable preferences and independent cookie writes", () => {
  withBrowser({ quota: true, stored: { kurioticket_locale: "fr", kurioticket_currency: "USD" } }, ({ stored, cookies }) => {
    assert.equal(getStoredLocale(), "fr");
    assert.doesNotThrow(() => { setStoredLocale("de"); setStoredDetectedRegion("GB"); setStoredCurrency("EUR"); });
    assert.equal(stored.get("kurioticket_locale"), "fr", "failed local persistence must not be represented as saved");
    assert.equal(cookies.get("kurioticket_locale"), "de-de");
    assert.equal(cookies.get("kurioticket_currency"), "EUR");
  });
});

test("blocked cookies do not prevent available local preference storage", () => {
  withBrowser({ blockedCookies: true }, ({ stored }) => {
    assert.doesNotThrow(() => { setStoredLocale("fr"); setStoredRegion("JP"); setStoredCurrency("EUR"); });
    assert.equal(getStoredLocale(), "fr"); assert.equal(getStoredRegion(), "JP"); assert.equal(getStoredCurrency(), "EUR");
    assert.equal(stored.get("ct_language"), "fr"); assert.equal(stored.get("ct_region"), "JP");
  });
});

test("normal preferences preserve legacy aliases, precedence, and currency validation", () => {
  withBrowser({ stored: { ct_language: "de", ct_region: "GB" } }, ({ stored, cookies, writes }) => {
    assert.equal(getStoredLocale(), "de-de"); assert.equal(getStoredRegion(), "GB");
    setStoredLocale("fr"); setStoredRegion("jp"); setStoredCurrency(" eur ");
    assert.equal(stored.get("kurioticket_locale"), "fr"); assert.equal(stored.get("ct_language"), "fr");
    for (const key of ["kurioticket_region_override", "kurioticket_region", "ct_region"]) assert.equal(stored.get(key), "JP");
    assert.equal(stored.get("kurioticket_currency"), "EUR");
    const count = writes.length; setStoredCurrency("bad-code"); assert.equal(writes.length, count);
    assert.equal(cookies.get("kurioticket_currency"), "EUR");
  });
});
