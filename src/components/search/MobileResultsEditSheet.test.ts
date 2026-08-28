import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./MobileResultsEditSheet.tsx", import.meta.url), "utf8");

test("mobile Results editor is an accessible rounded bottom sheet", () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /rounded-t-\[22px\]/);
  assert.match(source, /max-h-\[94dvh\]/);
  assert.match(source, /bg-slate-950\/35/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
});

test("sheet owns dismissal and focus while using the shared Results lock", () => {
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /nestedLayerOpen/);
  assert.match(source, /launcher\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /acquireMobileResultsScrollLock\(\)/);
  assert.doesNotMatch(source, /style\.position/);
  assert.doesNotMatch(source, /window\.scrollTo/);
  assert.match(source, /motion-reduce:transition-none/);
});
