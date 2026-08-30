import assert from "node:assert/strict";
import test from "node:test";

import { acquireMobileResultsScrollLock } from "./mobileResultsScrollLock";

function installBrowser({ scrollbarWidth = 0 } = {}) {
  const bodyStyle: Record<string, string> = {
    overflow: "clip",
    overscrollBehavior: "contain",
    paddingRight: "7px",
    touchAction: "pan-y",
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

test("locks once without changing layout geometry, nests safely, and restores exact styles", () => {
  const browser = installBrowser({ scrollbarWidth: 15 });
  const originalBody = { ...browser.bodyStyle };
  const originalRoot = { ...browser.rootStyle };
  const first = acquireMobileResultsScrollLock();
  assert.equal(browser.bodyStyle.overflow, "clip");
  assert.equal(browser.bodyStyle.paddingRight, "7px");
  assert.equal(browser.bodyStyle.overscrollBehavior, "none");
  assert.equal(browser.rootStyle.overflow, "visible");
  assert.equal(browser.bodyStyle.touchAction, "pan-y");
  assert.equal(browser.bodyStyle.scrollbarGutter, "stable");
  assert.equal(browser.rootStyle.touchAction, "auto");
  assert.equal(browser.rootStyle.scrollbarGutter, "both-edges");

  browser.fakeWindow.scrollY = 2600;
  const nested = acquireMobileResultsScrollLock();
  assert.equal(browser.bodyStyle.paddingRight, "7px");
  nested();
  assert.equal(browser.bodyStyle.overscrollBehavior, "none");

  browser.fakeWindow.scrollY = 1800;
  first();
  first();
  assert.deepEqual(browser.bodyStyle, originalBody);
  assert.deepEqual(browser.rootStyle, originalRoot);
  assert.equal(browser.calls.length, 0);
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
