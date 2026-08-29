import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("mobile Results overlay owns the root canvas without safe-area extensions", () => {
  assert.match(styles, /:root\s*\{[\s\S]*?--mobile-results-overlay-canvas:\s*#a6a8ae/);
  assert.match(
    styles,
    /html\[data-mobile-results-overlay-open\],[\s\S]*?background-color:\s*var\(--mobile-results-overlay-canvas\)/,
  );
  assert.doesNotMatch(styles, /\.mobile-results-overlay-root::(?:before|after)/);
  assert.doesNotMatch(styles, /top:\s*calc\(-1\s*\*\s*env\(safe-area-inset-top\)\)/);
});
