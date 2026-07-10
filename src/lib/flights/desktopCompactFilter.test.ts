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
      desiredTop: 116,
      panelHeight: 400,
      bodyBottom: 900,
    }),
    { state: "hidden" },
  );
});

test("compact filter placement stays fixed in the normal results range", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottom: 900,
    }),
    { state: "fixed", top: 116 },
  );
});

test("compact filter placement clamps before footer", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottom: 450,
    }),
    { state: "fixed", top: 50 },
  );
});

test("compact filter placement accounts for expanded panel height near footer", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      desiredTop: 116,
      panelHeight: 620,
      bodyBottom: 700,
    }),
    { state: "fixed", top: 80 },
  );
});

test("compact filter placement hides when body is shorter than the panel", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      desiredTop: 116,
      panelHeight: 500,
      bodyBottom: 300,
    }),
    { state: "hidden" },
  );
});

test("compact filter placement handles invalid measurements safely", () => {
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      desiredTop: 116,
      panelHeight: 0,
      bodyBottom: 900,
    }),
    { state: "hidden" },
  );
  assert.deepEqual(
    calculateCompactFilterPlacement({
      enabled: true,
      desiredTop: 116,
      panelHeight: 400,
      bodyBottom: -1,
    }),
    { state: "hidden" },
  );
});
