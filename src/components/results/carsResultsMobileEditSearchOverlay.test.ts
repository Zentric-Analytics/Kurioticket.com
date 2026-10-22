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
  assert.match(sheet, /browserCanvasColor="#ffffff"/);
  assert.match(sheet, /\n\s*freezeBodyPosition\n/);
  assert.doesNotMatch(sheet, /freezeBodyPosition=\{false\}|backdropClassName|safe-area-inset-top/);
  assert.doesNotMatch(sheet, /bottomSurfaceContinuation/);
  assert.match(sheet, /closing=\{mobileSearchClosing\}/);
  assert.match(sheet, /onCloseAnimationComplete=\{cancelMobileSearchDrawer\}/);
  assert.match(source, /mobileSearchCloseTimerRef/);
});

test("Cars Edit car search keeps the floating footprint with the Hotels flat surface", () => {
  assert.match(shellSource, /appearance\?: "default" \| "carsResultsEdit"/);
  assert.match(
    shellSource,
    /mobile-results-sheet-cars-edit-surface mx-3 mb-3 max-h-\[88dvh\] w-\[calc\(100%_-_24px\)\]/,
  );
  assert.match(
    shellSource,
    /carsResultsEdit[\s\S]*?rounded-\[24px\] border-0 bg-\[#F5F7FB\] shadow-none/,
  );
  assert.doesNotMatch(
    shellSource,
    /mobile-results-sheet-cars-edit-surface mx-0 mb-0 w-full/,
  );
  assert.doesNotMatch(
    shellSource,
    /carsResultsEdit[^\n]*rounded-t-\[22px\]/,
  );
  assert.match(
    shellSource,
    /paddingBottom: "max\(20px, env\(safe-area-inset-bottom, 0px\)\)"/,
  );
  assert.match(shellSource, /bg-\[#F5F7FB\]/);
  assert.match(
    shellSource,
    /pointer-events-none absolute inset-x-12 top-1\/2 -translate-y-1\/2 text-center text-\[19px\] font-semibold leading-\[24px\] tracking-normal/,
  );
  assert.match(shellSource, /relative min-h-\[52px\] justify-center/);
  assert.match(shellSource, /carsResultsEdit && "absolute right-0"/);
  assert.match(cssSource, /rgba\(8, 18, 35, 0\.52\)/);
  assert.match(cssSource, /animation-duration: 280ms/);
  assert.match(cssSource, /animation-duration: 240ms/);
});
