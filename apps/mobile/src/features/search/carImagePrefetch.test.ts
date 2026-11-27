import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { prefetchCarImagesInBackground } from "./carImagePrefetch";
test("unavailable images cannot hold a ready vehicle list or synchronously invoke native work", async () => {
  let invoked = false;
  const result = prefetchCarImagesInBackground(async () => { invoked = true; await new Promise<void>(() => {}); });
  assert.equal(result, undefined); assert.equal(invoked, false);
  await Promise.resolve(); assert.equal(invoked, true);
});
test("native image exceptions and failed downloads remain optional", async () => {
  assert.doesNotThrow(() => prefetchCarImagesInBackground(() => { throw new Error("synthetic native image failure"); }));
  prefetchCarImagesInBackground(async () => { throw new Error("synthetic unavailable image"); });
  await new Promise<void>(resolve => setImmediate(resolve));
});
test("the actual controller publishes inventory without awaiting optional images", () => {
  const screen = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
  assert.match(screen, /prefetchCarImagesInBackground\(\(\)=>prefetchInitialCarImages\(acceptance\.accepted\)\)/);
  assert.doesNotMatch(screen, /await prefetchInitialCarImages/);
  assert.match(screen, /controller\.signal\.aborted\|\|sequence!==searchSequence\.current/);
  assert.match(screen, /setStatus\(presentation\.status\)/);
});
