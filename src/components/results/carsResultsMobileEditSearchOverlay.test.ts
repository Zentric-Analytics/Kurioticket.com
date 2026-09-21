import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Cars mobile Edit Search isolates backdrop motion and closes on animation completion", () => {
  const start = source.indexOf("<MobileResultsEditSheet");
  const end = source.indexOf("</MobileResultsEditSheet>", start);
  const sheet = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(sheet, /isolatedBackdrop/);
  assert.match(sheet, /closing=\{mobileSearchClosing\}/);
  assert.match(sheet, /onCloseAnimationComplete=\{cancelMobileSearchDrawer\}/);
  assert.doesNotMatch(source, /mobileSearchCloseMotionMs|mobileSearchCloseTimerRef/);
});
