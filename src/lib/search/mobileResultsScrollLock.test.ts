import assert from "node:assert/strict";
import test from "node:test";

import { acquireMobileResultsScrollLock } from "./mobileResultsScrollLock";

function installBrowser({ scrollbarWidth = 0 } = {}) {
  const bodyStyle: Record<string, string> = {
    left: "3px",
    overflow: "clip",
    overscrollBehavior: "contain",
    paddingRight: "7px",
    position: "relative",
    right: "4px",
    top: "5px",
    touchAction: "pan-y",
    width: "98%",
    scrollbarGutter: "stable",
  };
  const rootStyle: Record<string, string> = {
    overflow: "visible",
    overscrollBehavior: "auto",
    touchAction: "auto",
    scrollbarGutter: "both-edges",
  };
  const calls: unknown[][] = [];
  const fakeWindow = {
    innerWidth: 1000,
    scrollX: 12,
    scrollY: 1800,
    getComputedStyle: () => ({ paddingRight: "7px" }),
    scrollTo: (...args: unknown[]) => calls.push(args),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: { style: bodyStyle },
      documentElement: { style: rootStyle, clientWidth: 1000 - scrollbarWidth },
    },
  });
  return { bodyStyle, rootStyle, calls, fakeWindow };
}

test("first acquisition fixes the document, nesting preserves the snapshot, and final release restores exactly", () => {
  const browser = installBrowser({ scrollbarWidth: 15 });
  const originalBody = { ...browser.bodyStyle };
  const originalRoot = { ...browser.rootStyle };
  const first = acquireMobileResultsScrollLock();
  assert.equal(browser.bodyStyle.position, "fixed");
  assert.equal(browser.bodyStyle.top, "-1800px");
  assert.equal(browser.bodyStyle.left, "-12px");
  assert.equal(browser.bodyStyle.right, "0");
  assert.equal(browser.bodyStyle.width, "100%");
  assert.equal(browser.bodyStyle.overflow, "hidden");
  assert.equal(browser.bodyStyle.paddingRight, "7px");
  assert.equal(browser.bodyStyle.overscrollBehavior, "none");
  assert.equal(browser.rootStyle.overflow, "hidden");
  assert.equal(browser.bodyStyle.touchAction, "pan-y");
  assert.equal(browser.bodyStyle.scrollbarGutter, "stable");
  assert.equal(browser.rootStyle.touchAction, "auto");
  assert.equal(browser.rootStyle.scrollbarGutter, "both-edges");

  browser.fakeWindow.scrollY = 2600;
  const nested = acquireMobileResultsScrollLock();
  assert.equal(browser.bodyStyle.top, "-1800px");
  nested();
  assert.equal(browser.bodyStyle.position, "fixed");

  browser.fakeWindow.scrollY = 1800;
  first();
  first();
  assert.deepEqual(browser.bodyStyle, originalBody);
  assert.deepEqual(browser.rootStyle, originalRoot);
  assert.deepEqual(browser.calls, [[{ left: 12, top: 1800, behavior: "auto" }]]);
});

test("corrects genuine viewport drift exactly once on final release", () => {
  const browser = installBrowser();
  const release = acquireMobileResultsScrollLock();
  browser.fakeWindow.scrollX = 20;
  browser.fakeWindow.scrollY = 1803;
  release();
  release();
  assert.deepEqual(browser.calls, [[{ left: 12, top: 1800, behavior: "auto" }]]);
});

test("restoreScroll false survives an earlier nested release and skips final restoration", () => {
  const browser = installBrowser();
  const first = acquireMobileResultsScrollLock();
  const nested = acquireMobileResultsScrollLock();
  first({ restoreScroll: false });
  assert.equal(browser.bodyStyle.position, "fixed");
  nested();
  nested();
  assert.equal(browser.bodyStyle.position, "relative");
  assert.deepEqual(browser.calls, []);
});

test("is safe when browser globals are unavailable", () => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
  assert.doesNotThrow(() => {
    const release = acquireMobileResultsScrollLock();
    release();
    release({ restoreScroll: false });
  });
});

test("a dedicated Results owner is locked in place without creating a document scroll owner", () => {
  const browser = installBrowser();
  const owner = { style: { overflow: "auto" }, scrollTop: 640 } as unknown as HTMLElement;
  const first = acquireMobileResultsScrollLock(owner);
  const nested = acquireMobileResultsScrollLock(owner);
  assert.equal(owner.style.overflow, "hidden");
  assert.equal(browser.bodyStyle.position, "relative");
  assert.equal((owner as unknown as { scrollTop: number }).scrollTop, 640);
  first();
  assert.equal(owner.style.overflow, "hidden");
  nested();
  assert.equal(owner.style.overflow, "auto");
  assert.deepEqual(browser.calls, []);
});
