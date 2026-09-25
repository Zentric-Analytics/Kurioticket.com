import assert from "node:assert/strict";
import test from "node:test";

import { restoreOverlayLauncherFocus } from "@/lib/search/mobileResultsOverlayFocus";
import { acquireMobileResultsScrollLock } from "@/lib/search/mobileResultsScrollLock";
import { beginFlightEditSearchClose } from "./flightEditSearchCloseLifecycle";

function installBrowser() {
  const bodyStyle: Record<string, string> = {
    left: "",
    overflow: "",
    overscrollBehavior: "",
    position: "",
    right: "",
    top: "",
    width: "",
  };
  const rootStyle: Record<string, string> = {
    overflow: "",
    overscrollBehavior: "",
  };
  const scrollCalls: unknown[][] = [];
  const fakeWindow = {
    scrollX: 24,
    scrollY: 840,
    scrollTo: (...args: unknown[]) => scrollCalls.push(args),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: { style: bodyStyle },
      documentElement: { style: rootStyle },
    },
  });
  return { bodyStyle, rootStyle, scrollCalls };
}

test("bottom-sheet close keeps Results locked until unmount and restores once across repeated closes", () => {
  const browser = installBrowser();
  const scheduled: Array<() => void> = [];
  let closeCount = 0;

  const closeOnce = () => {
    const scrollCallCountBeforeClose = browser.scrollCalls.length;
    const releaseLock = acquireMobileResultsScrollLock();
    assert.equal(browser.bodyStyle.position, "fixed");
    assert.equal(browser.bodyStyle.top, "-840px");

    const timer = beginFlightEditSearchClose({
      beginClosing: () => {
        assert.equal(browser.bodyStyle.position, "fixed");
        assert.equal(browser.scrollCalls.length, scrollCallCountBeforeClose);
      },
      finishClose: () => {
        closeCount += 1;
        releaseLock();
      },
      schedule: (callback, delay) => {
        assert.equal(delay, 280);
        scheduled.push(callback);
        return scheduled.length;
      },
    });

    assert.equal(timer, scheduled.length);
    assert.equal(browser.bodyStyle.position, "fixed");
    assert.equal(browser.scrollCalls.length, scrollCallCountBeforeClose);
    scheduled.shift()?.();
    assert.equal(browser.bodyStyle.position, "");
  };

  for (let attempt = 0; attempt < 5; attempt += 1) closeOnce();
  assert.equal(closeCount, 5);
  assert.deepEqual(
    browser.scrollCalls,
    Array.from({ length: 5 }, () => [
      { left: 24, top: 840, behavior: "auto" },
    ]),
  );
  assert.equal(browser.rootStyle.overflow, "");
  assert.equal(browser.rootStyle.overscrollBehavior, "");
});

test("keyboard launcher focus restoration remains scroll-safe", () => {
  let focusOptions: FocusOptions | undefined;
  const launcher = {
    isConnected: true,
    hasAttribute: () => false,
    getAttribute: () => null,
    focus: (options?: FocusOptions) => {
      focusOptions = options;
    },
  } as unknown as HTMLElement;

  assert.equal(restoreOverlayLauncherFocus(launcher, "keyboard"), true);
  assert.deepEqual(focusOptions, { preventScroll: true });
});
