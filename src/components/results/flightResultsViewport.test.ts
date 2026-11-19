import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { observeFlightResultsWindowOffset } from "./flightResultsViewport";

function browser() {
  const body = { style: { position: "", top: "" } };
  const win = Object.assign(new EventTarget(), { scrollY: 1800, setTimeout, clearTimeout });
  let mutation = () => {};
  let disconnected = false;
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, "MutationObserver");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { body } });
  Object.defineProperty(globalThis, "MutationObserver", { configurable: true, value: class {
    constructor(callback: () => void) { mutation = () => { if (!disconnected) callback(); }; }
    observe(target: unknown, options: unknown) { assert.equal(target, body); assert.deepEqual(options, { attributes: true, attributeFilter: ["style"] }); }
    disconnect() { disconnected = true; }
  } });
  const instance = { scrollElement: win, targetWindow: win, options: { horizontal: false, useScrollendEvent: false, isScrollingResetDelay: 150 } } as unknown as Parameters<typeof observeFlightResultsWindowOffset>[0];
  return { body, win, instance, mutation: () => mutation(), restore: () => {
    for (const [name, original] of [["document", originalDocument], ["MutationObserver", originalObserver]] as const) {
      if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name);
    }
  } };
}

test("fixed-body scroll events are ignored and restoration synchronizes geometry before offset without a native event", () => {
  const b = browser();
  const events: unknown[] = [];
  const stop = observeFlightResultsWindowOffset(b.instance, (offset, scrolling) => events.push([offset, scrolling]), () => events.push("geometry"));
  try {
    b.win.dispatchEvent(new Event("scroll"));
    assert.deepEqual(events, [[1800, true]]);
    events.length = 0;
    b.body.style.position = "fixed"; b.body.style.top = "-1800px"; b.win.scrollY = 0; b.mutation();
    b.win.dispatchEvent(new Event("scroll"));
    assert.deepEqual(events, []);
    // A nested picker overwrites the top offset but never ends the outer lock.
    b.body.style.top = "0px"; b.mutation(); b.win.dispatchEvent(new Event("scroll"));
    b.body.style.top = "-1800px"; b.mutation();
    assert.deepEqual(events, []);
    b.body.style.position = ""; b.body.style.top = ""; b.win.scrollY = 1800; b.mutation();
    assert.deepEqual(events, ["geometry", [1800, false]]);
    b.mutation(); assert.equal(events.length, 2);
  } finally { stop?.(); b.restore(); }
});

test("repeated restoration and disposal do not leak observer or scroll subscriptions", () => {
  const b = browser();
  let restored = 0, offsets = 0;
  const stop = observeFlightResultsWindowOffset(b.instance, () => offsets++, () => restored++);
  try {
    for (let index = 0; index < 10; index++) {
      b.body.style.position = "fixed"; b.mutation();
      b.win.scrollY = 0; b.win.dispatchEvent(new Event("scroll"));
      b.body.style.position = ""; b.win.scrollY = 6500; b.mutation();
    }
    assert.equal(restored, 10); assert.equal(offsets, 10);
    stop?.(); b.win.dispatchEvent(new Event("scroll")); b.mutation();
    assert.equal(restored, 10); assert.equal(offsets, 10);
  } finally { stop?.(); b.restore(); }
});

test("submit-style release without restored scroll reports the actual new viewport", () => {
  const b = browser();
  const offsets: number[] = [];
  const stop = observeFlightResultsWindowOffset(b.instance, offset => offsets.push(offset), () => {});
  try {
    b.body.style.position = "fixed"; b.mutation(); b.win.scrollY = 0;
    b.body.style.position = ""; b.mutation();
    assert.deepEqual(offsets, [0]);
  } finally { stop?.(); b.restore(); }
});

test("the viewport adapter is opt-in for the mobile Flight list; other lists retain default observers", () => {
  const list = readFileSync(new URL("./VirtualResultsList.tsx", import.meta.url), "utf8");
  const flights = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
  assert.match(list, /preserveViewportOnScrollLock = false/);
  assert.match(list, /preserveViewportOnScrollLock \? observeFlightOffset : observeWindowOffset/);
  assert.match(list, /preserveViewportOnScrollLock && isResultsBodyFixed\(\)/);
  assert.equal(flights.match(/preserveViewportOnScrollLock/g)?.length, 1);
  assert.match(flights, /label="Flight results" preserveViewportOnScrollLock rowClassName="pb-3"/);
});
