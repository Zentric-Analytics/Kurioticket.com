import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("mobile Results overlay gives the backdrop the root canvas and the sheet its lower continuation", () => {
  assert.match(styles, /:root\s*\{[\s\S]*?--mobile-results-overlay-canvas:\s*#a6a8ae/);
  assert.match(
    styles,
    /html\[data-mobile-results-overlay-open\],[\s\S]*?background-color:\s*var\(\s*--mobile-results-overlay-active-canvas,\s*var\(--mobile-results-overlay-canvas\)\s*\)/,
  );
  assert.doesNotMatch(styles, /\.mobile-results-overlay-root::(?:before|after)/);
  assert.doesNotMatch(styles, /top:\s*calc\(-1\s*\*\s*env\(safe-area-inset-top\)\)/);
  assert.match(
    styles,
    /\.mobile-results-sheet-bottom-continuation\s*\{[\s\S]*?env\(safe-area-inset-bottom, 0px\)[\s\S]*?calc\(100lvh - 100dvh\)/,
  );
});
