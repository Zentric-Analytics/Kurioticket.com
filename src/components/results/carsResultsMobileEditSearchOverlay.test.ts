import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("../search/MobileResultsEditSheet.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("Cars mobile Edit Search isolates backdrop motion and closes on animation completion", () => {
  const start = source.indexOf("<MobileResultsEditSheet");
  const end = source.indexOf("</MobileResultsEditSheet>", start);
  const sheet = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(sheet, /isolatedBackdrop/);
  assert.match(sheet, /appearance="carsResultsEdit"/);
  assert.match(sheet, /browserCanvasColor="#F5F7FB"/);
  assert.doesNotMatch(sheet, /bottomSurfaceContinuation/);
  assert.match(sheet, /closing=\{mobileSearchClosing\}/);
  assert.match(sheet, /onCloseAnimationComplete=\{cancelMobileSearchDrawer\}/);
  assert.match(source, /mobileSearchCloseTimerRef/);
});

test("Cars Edit Search keeps polished Cars content in an attached mobile-web bottom sheet", () => {
  assert.match(shellSource, /appearance\?: "default" \| "carsResultsEdit"/);
  assert.match(shellSource, /mobile-results-sheet-cars-edit-surface mx-0 mb-0 w-full/);
  assert.match(shellSource, /rounded-t-\[22px\]/);
  assert.doesNotMatch(shellSource, /max-h-\[88dvh\]/);
  assert.doesNotMatch(shellSource, /rounded-\[24px\]/);
  assert.doesNotMatch(shellSource, /mx-3/);
  assert.doesNotMatch(shellSource, /w-\[calc\(100%-24px\)\]/);
  assert.doesNotMatch(shellSource, /mb-\[calc\(12px\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(shellSource, /bg-\[#F5F7FB\]/);
  assert.match(shellSource, /pb-\[max\(20px,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(
    shellSource,
    /text-\[18px\] font-semibold leading-\[23px\]/,
  );
  assert.match(shellSource, /min-h-\[52px\]/);
  assert.match(cssSource, /rgba\(8, 18, 35, 0\.52\)/);
  assert.match(cssSource, /animation-duration: 280ms/);
  assert.match(cssSource, /animation-duration: 240ms/);
});
