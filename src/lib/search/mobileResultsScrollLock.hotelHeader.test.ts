import assert from "node:assert/strict";
import test from "node:test";

import { acquireMobileResultsScrollLock } from "./mobileResultsScrollLock";

function installBrowser({ mobile = true, hotel = true, sticky = true, headerPresent = true } = {}) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const bodyStyle = { left: "", overflow: "", overscrollBehavior: "", position: "", right: "", top: "", width: "" };
  const rootStyle = { overflow: "", overscrollBehavior: "" };
  const values = new Map<string, [string, string]>([
    ["top", ["var(--header-top)", "important"]],
    ["transition", ["color 150ms", ""]],
  ]);
  const originalProperties = [...values.entries()];
  const calls: unknown[] = [];
  const style = {
    getPropertyValue: (name: string) => values.get(name)?.[0] ?? "",
    getPropertyPriority: (name: string) => values.get(name)?.[1] ?? "",
    setProperty: (name: string, value: string, priority = "") => { values.set(name, [value, priority]); },
    removeProperty: (name: string) => { const value = values.get(name)?.[0] ?? ""; values.delete(name); return value; },
  };
  const header = {
    style,
    getBoundingClientRect: () => ({
      // Emulate the real regression: locking overflow moves the sticky header
      // with the document unless its visual position has been preserved.
      top: rootStyle.overflow === "hidden"
        ? -1800 + (Number.parseFloat(style.getPropertyValue("top")) || 0)
        : 0,
      left: 0, height: 72,
    }),
  };
  const fakeWindow = {
    scrollX: 0, scrollY: 1800,
    matchMedia: () => ({ matches: mobile }),
    getComputedStyle: () => ({ position: sticky ? "sticky" : "relative" }),
    scrollTo: (value: unknown) => { calls.push(value); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: { style: bodyStyle }, documentElement: { style: rootStyle },
      querySelector: (selector: string) => selector === "[data-mobile-web-hotel-results]"
        ? (hotel ? {} : null) : (headerPresent ? header : null),
    },
  });
  const cleanup = () => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  };
  return { header, values, originalProperties, bodyStyle, rootStyle, calls, cleanup };
}

for (const freezeBodyPosition of [false, true]) {
  test(`Hotel navbar stays in flow and at its viewport position with fixed body = ${freezeBodyPosition}`, () => {
    const browser = installBrowser();
    const before = browser.header.getBoundingClientRect();
    const release = acquireMobileResultsScrollLock({ freezeBodyPosition });
    try {
      assert.equal(browser.header.style.getPropertyValue("position"), "relative");
      assert.equal(browser.header.style.getPropertyValue("top"), "1800px");
      assert.equal(browser.header.getBoundingClientRect().top, before.top);
      assert.equal(browser.header.getBoundingClientRect().height, before.height);
      assert.equal(browser.rootStyle.overflow, "hidden");
      assert.equal(browser.bodyStyle.position, freezeBodyPosition ? "fixed" : "");
    } finally {
      release();
      browser.cleanup();
    }
    assert.deepEqual([...browser.values.entries()], browser.originalProperties);
    assert.equal(browser.calls.length, freezeBodyPosition ? 1 : 0);
  });
}

test("nested locks retain the Hotel header snapshot until the final release", () => {
  const browser = installBrowser();
  const first = acquireMobileResultsScrollLock({ freezeBodyPosition: false });
  const second = acquireMobileResultsScrollLock();
  try {
    first();
    first();
    assert.equal(browser.header.style.getPropertyValue("top"), "1800px");
    assert.equal(browser.rootStyle.overflow, "hidden");
    second();
    second();
    assert.deepEqual([...browser.values.entries()], browser.originalProperties);
    assert.equal(browser.rootStyle.overflow, "");
    assert.equal(browser.calls.length, 0);
  } finally { first(); second(); browser.cleanup(); }
});

test("navigation cleanup restores the header even when scroll restoration is disabled", () => {
  const browser = installBrowser();
  const release = acquireMobileResultsScrollLock();
  try {
    release({ restoreScroll: false });
    assert.deepEqual([...browser.values.entries()], browser.originalProperties);
    assert.equal(browser.calls.length, 0);
  } finally { release(); browser.cleanup(); }
});

for (const options of [
  { mobile: false }, { hotel: false }, { sticky: false }, { headerPresent: false },
]) {
  test(`Hotel-only header preservation does not affect other surfaces: ${JSON.stringify(options)}`, () => {
    const browser = installBrowser(options);
    const release = acquireMobileResultsScrollLock({ freezeBodyPosition: false });
    try { assert.deepEqual([...browser.values.entries()], browser.originalProperties); }
    finally { release(); browser.cleanup(); }
    assert.deepEqual([...browser.values.entries()], browser.originalProperties);
  });
}
