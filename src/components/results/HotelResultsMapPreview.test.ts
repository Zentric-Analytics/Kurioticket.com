import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsMapPreview.tsx", import.meta.url),
  "utf8",
);

test("Hotel results map modal locks background document scrolling until close", () => {
  assert.match(source, /const lockBackgroundScroll = \(\) =>/);
  assert.match(source, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.position = "fixed"/);
  assert.match(source, /document\.body\.style\.top = `-\$\{lockedScrollYRef\.current\}px`/);
  assert.match(source, /document\.body\.style\.width = "100%"/);
  assert.match(source, /onClick=\{openMap\}/);
  assert.match(source, /dialog\.addEventListener\("close", handleClose\)/);
  assert.match(source, /window\.scrollTo\(0, lockedScrollYRef\.current\)/);
  assert.match(source, /onClick=\{closeMap\}/);
});

test("Hotel results map modal restores previous inline scroll styles", () => {
  for (const contract of [
    "previousBodyStyle.overflow",
    "previousBodyStyle.position",
    "previousBodyStyle.top",
    "previousBodyStyle.width",
    'previousRootOverflowRef.current ?? ""',
  ]) {
    assert.ok(source.includes(contract), contract);
  }
  assert.match(source, /return \(\) => \{[\s\S]*unlockBackgroundScroll\(\)/);
});
