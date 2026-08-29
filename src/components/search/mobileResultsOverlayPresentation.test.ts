import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("mobile Results overlay extends its approved backdrop through the safe area", () => {
  const guard = styles.slice(styles.indexOf(".mobile-results-overlay-root::before"));
  assert.match(guard, /env\(safe-area-inset-top\)/);
  assert.match(guard, /background: rgb\(2 6 23 \/ 0\.35\)/);
  assert.doesNotMatch(guard.slice(0, guard.indexOf("}")), /#fff|white/i);
  assert.match(styles, /html\[data-mobile-results-overlay-open\][\s\S]*?--mobile-results-overlay-canvas/);
});
