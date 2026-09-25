import assert from "node:assert/strict";
import test from "node:test";

import {
  attachFareInformationTouchRail,
  fareInformationGestureAxis,
} from "./useFareInformationTouchRail";

type TestListener = (event: Record<string, unknown>) => void;

function touchList(identifier: number, clientX: number, clientY: number) {
  const touch = { identifier, clientX, clientY };
  return { length: 1, item: (index: number) => index === 0 ? touch : null };
}

function touchRailHarness() {
  const listeners = new Map<string, TestListener>();
  const element = {
    scrollLeft: 40,
    scrollWidth: 500,
    clientWidth: 200,
    addEventListener(type: string, listener: TestListener) {
      listeners.set(type, listener);
    },
    removeEventListener() {},
  };
  const dispatch = (type: string, event: Record<string, unknown>) => listeners.get(type)?.(event);
  return { element, dispatch };
}

test("Fare information touch intent remains pending for sub-threshold movement", () => {
  assert.equal(fareInformationGestureAxis("pending", 1, 0), "pending");
  assert.equal(fareInformationGestureAxis("pending", 1, 1), "pending");
});

test("Fare information touch intent resolves horizontal-dominant movement", () => {
  assert.equal(fareInformationGestureAxis("pending", 12, 3), "horizontal");
  assert.equal(fareInformationGestureAxis("pending", -12, 3), "horizontal");
});

test("Fare information touch intent resolves vertical-dominant movement", () => {
  assert.equal(fareInformationGestureAxis("pending", 3, 12), "vertical");
  assert.equal(fareInformationGestureAxis("pending", 3, -12), "vertical");
});

test("Fare information touch intent stays locked after horizontal wins", () => {
  assert.equal(fareInformationGestureAxis("horizontal", 3, 12), "horizontal");
});

test("Fare information touch intent stays locked after vertical wins", () => {
  assert.equal(fareInformationGestureAxis("vertical", 12, 3), "vertical");
});

test("horizontal Fare information drag owns movement and suppresses its following click", () => {
  const originalWindow = globalThis.window;
  let pageRestore: [number, number] | null = null;
  const testWindow = {
    scrollY: 100,
    scrollX: 0,
    scrollTo(left: number, top: number) {
      pageRestore = [left, top];
      this.scrollY = top;
    },
    matchMedia: () => ({ matches: true }),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: testWindow,
  });
  const { element, dispatch } = touchRailHarness();
  const cleanup = attachFareInformationTouchRail(element as unknown as HTMLElement);
  let movePrevented = false;
  let clickPrevented = false;

  dispatch("touchstart", { touches: touchList(1, 100, 20), timeStamp: 0 });
  testWindow.scrollY = 102;
  dispatch("touchmove", {
    touches: touchList(1, 88, 23),
    timeStamp: 16,
    preventDefault: () => { movePrevented = true; },
  });
  dispatch("click", {
    preventDefault: () => { clickPrevented = true; },
    stopPropagation() {},
  });

  assert.equal(movePrevented, true);
  assert.equal(element.scrollLeft, 52);
  assert.deepEqual(pageRestore, [0, 100]);
  assert.equal(clickPrevented, true);
  cleanup();
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

test("vertical Fare information gesture leaves native page scrolling unprevented and the rail fixed", () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { scrollY: 100, scrollX: 0, scrollTo() {}, matchMedia: () => ({ matches: true }) },
  });
  const { element, dispatch } = touchRailHarness();
  const cleanup = attachFareInformationTouchRail(element as unknown as HTMLElement);
  let movePrevented = false;

  dispatch("touchstart", { touches: touchList(1, 100, 20), timeStamp: 0 });
  dispatch("touchmove", {
    touches: touchList(1, 97, 32),
    timeStamp: 16,
    preventDefault: () => { movePrevented = true; },
  });

  assert.equal(movePrevented, false);
  assert.equal(element.scrollLeft, 40);
  cleanup();
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});
