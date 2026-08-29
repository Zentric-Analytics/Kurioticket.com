import assert from "node:assert/strict";
import test from "node:test";

import {
  getOverlayActivationModality,
  restoreOverlayLauncherFocus,
} from "./mobileResultsOverlayFocus";

test("click detail distinguishes pointer and keyboard overlay activation", () => {
  assert.equal(getOverlayActivationModality({ detail: 1 }), "pointer");
  assert.equal(getOverlayActivationModality({ detail: 0 }), "keyboard");
});

test("pointer and programmatic closes never force launcher focus", () => {
  const launcher = {
    isConnected: true,
    hasAttribute: () => false,
    getAttribute: () => null,
    focus: () => assert.fail("focused"),
  } as unknown as HTMLElement;
  assert.equal(restoreOverlayLauncherFocus(launcher, "pointer"), false);
  assert.equal(restoreOverlayLauncherFocus(launcher, "programmatic"), false);
});

test("keyboard close restores launcher focus without scrolling", () => {
  let options: FocusOptions | undefined;
  const launcher = {
    isConnected: true,
    hasAttribute: () => false,
    getAttribute: () => null,
    focus: (value: FocusOptions) => {
      options = value;
    },
  } as unknown as HTMLElement;
  assert.equal(restoreOverlayLauncherFocus(launcher, "keyboard"), true);
  assert.deepEqual(options, { preventScroll: true });
});
