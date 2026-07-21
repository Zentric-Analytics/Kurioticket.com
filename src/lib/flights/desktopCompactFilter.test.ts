import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCompactFilterPlacement,
  shouldRenderFlightQualityFilter,
  shouldShowDesktopCompactFilter,
} from "./desktopCompactFilter";

test("desktop compact filter stays hidden below desktop width", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1023,
      sentinelTop: 100,
      topOffset: 116,
    }),
    false,
  );
});

test("desktop compact filter stays hidden when sentinel is below threshold", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1024,
      sentinelTop: 117,
      topOffset: 116,
    }),
    false,
  );
});

test("desktop compact filter appears when sentinel reaches threshold", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1024,
      sentinelTop: 116,
      topOffset: 116,
    }),
    true,
  );
});

test("desktop compact filter appears when sentinel is above threshold", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1366,
      sentinelTop: 24,
      topOffset: 116,
    }),
    true,
  );
});

test("desktop compact filter toggles when scrolling upward across threshold", () => {
  const topOffset = 116;

  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1366,
      sentinelTop: 80,
      topOffset,
    }),
    true,
  );
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1366,
      sentinelTop: 140,
      topOffset,
    }),
    false,
  );
});

test("flight quality filter only renders after truthful options exist", () => {
  assert.equal(
    shouldRenderFlightQualityFilter({ loading: true, optionCount: 0 }),
    false,
  );
  assert.equal(
    shouldRenderFlightQualityFilter({ loading: false, optionCount: 0 }),
    false,
  );
  assert.equal(
    shouldRenderFlightQualityFilter({ loading: false, optionCount: 1 }),
    true,
  );
});

test("compact filter placement hides when disabled before threshold", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: false,
      scrollY: 100,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1500,
    }),
    { state: "hidden" },
  );
});

test("compact filter placement handles invalid measurements safely", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 0,
      desiredTop: 116,
      panelHeight: 0,
      bodyBottomDocument: 900,
    }),
    { state: "hidden" },
  );
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 0,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: -1,
    }),
    { state: "hidden" },
  );
});

test("compact filter placement stays fixed when panel fits above body bottom", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 100,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
    }),
    { state: "fixed" },
  );
});

test("compact filter placement docks when fixed panel would cross body bottom", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 700,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
    }),
    { state: "docked" },
  );
});

test("compact filter placement docks at exact threshold without a prior mode", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 672,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
      bottomGap: 12,
    }),
    { state: "docked" },
  );
});

test("compact filter placement hysteresis prevents fixed and docked flapping", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 673,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
      currentState: "fixed",
      bottomGap: 12,
      dockOverlap: 3,
    }),
    { state: "fixed" },
  );
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 673,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
      currentState: "docked",
      bottomGap: 12,
      undockClearance: 8,
    }),
    { state: "docked" },
  );
});

test("compact filter placement changes fixed to docked once after expansion removes clearance", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 500,
      desiredTop: 116,
      panelHeight: 320,
      bodyBottomDocument: 1000,
      currentState: "fixed",
    }),
    { state: "fixed" },
  );
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 500,
      desiredTop: 116,
      panelHeight: 480,
      bodyBottomDocument: 1000,
      currentState: "fixed",
    }),
    { state: "docked" },
  );
});

test("compact filter placement changes docked to fixed only after renewed hysteresis clearance", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 665,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
      currentState: "docked",
    }),
    { state: "docked" },
  );
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 663,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 1200,
      currentState: "docked",
    }),
    { state: "fixed" },
  );
});

test("compact filter placement hides when body cannot safely contain the panel", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 0,
      desiredTop: 116,
      panelHeight: 500,
      bodyBottomDocument: 500,
    }),
    { state: "hidden" },
  );
});

test("compact filter placement output never contains a continuously changing fixed top", () => {
  const placement = calculateCompactFilterPlacement({
    enabled: true,
    scrollY: 100,
    desiredTop: 116,
    panelHeight: 400,
    bodyBottomDocument: 1200,
  });

  assert.equal(Object.hasOwn(placement, "top"), false);
});

test("compact filter placement remains unchanged while scrolling in normal fixed range", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 100,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 2000,
      currentState: "fixed",
    }),
    calculateCompactFilterPlacement({
      enabled: true,
      scrollY: 250,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottomDocument: 2000,
      currentState: "fixed",
    }),
  );
});
