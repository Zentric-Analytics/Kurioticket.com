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
    /\.mobile-results-sheet-bottom-continuation\s*\{[\s\S]*?min-height:\s*2px[\s\S]*?env\(safe-area-inset-bottom, 0px\)[\s\S]*?calc\(100lvh - 100dvh\)/,
  );
  assert.match(
    styles,
    /\.mobile-results-sheet-backdrop-clean\s*\{[\s\S]*?background-color:\s*transparent/,
  );
  assert.doesNotMatch(styles, /mobile-results-sheet-backdrop-clean::before/);
});

test("shared Results sheet motion supports synchronized close and reduced motion", () => {
  assert.match(styles, /@keyframes mobile-results-sheet-backdrop-out/);
  assert.match(styles, /@keyframes mobile-results-sheet-surface-out/);
  assert.match(styles, /\.mobile-results-sheet-backdrop-closing[\s\S]*?200ms ease-out both/);
  assert.match(styles, /\.mobile-results-sheet-surface-closing[\s\S]*?280ms cubic-bezier\(0\.4, 0, 0\.8, 0\.2\) both/);
  assert.match(styles, /\.mobile-results-sheet-bottom-continuation-closing[\s\S]*?280ms cubic-bezier\(0\.4, 0, 0\.8, 0\.2\) both/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?mobile-results-sheet-backdrop-closing[\s\S]*?mobile-results-sheet-surface-closing[\s\S]*?mobile-results-sheet-bottom-continuation-closing[\s\S]*?animation: none/,
  );
});
