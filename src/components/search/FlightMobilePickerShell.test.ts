import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/search/FlightMobilePickerShell.tsx",
  "utf8",
);

test("navigation headers show Cancel by default for airport pickers", () => {
  assert.match(source, /showCancelAction\?: boolean/);
  assert.match(source, /showCancelAction = true/);
  assert.match(source, /showCancelAction \? \(\s*<button/);
  assert.match(source, /\{t\.cancel\}/);
});

test("navigation headers use a non-interactive spacer when Cancel is suppressed", () => {
  assert.match(
    source,
    /<span\s+aria-hidden="true"\s+className="min-h-10"\s+data-mobile-picker-header-spacer\s*\/>/,
  );
  assert.match(source, /grid-cols-\[1fr_auto_1fr\]/);
  assert.doesNotMatch(
    source,
    /data-mobile-picker-header-spacer[^>]*(?:role=|tabIndex=|onClick=|aria-label=)/,
  );
});

test("white surface is opt-in and preserves the default Cars Results Edit surface", () => {
  assert.match(source, /surfaceVariant\?: "default" \| "white"/);
  assert.match(source, /surfaceVariant = "default"/);
  assert.match(source, /const whiteSurface = surfaceVariant === "white"/);
  assert.ok(
    (source.match(/carsResultsEdit && !whiteSurface && "bg-\[#F5F7FB\]"/g) ?? [])
      .length >= 3,
  );
});

test("close restores the page once and instantly before unmounting the shell", () => {
  assert.match(source, /scrollX: number/);
  assert.match(source, /scrollY: number/);
  assert.match(source, /scrollBehavior: string/);
  assert.match(source, /snapshot\.root\.style\.scrollBehavior = "auto"/);
  assert.match(source, /behavior: "instant" as ScrollBehavior/);
  assert.match(
    source,
    /const launcherElement = restorePagePosition\(\);[\s\S]*?await waitForNextPaint\(\);[\s\S]*?onClose\(\)/,
  );
  assert.doesNotMatch(source, /onClose\(\);\s*restorePagePosition\(/);
  assert.match(source, /scrollLockSnapshotRef\.current = null/);
  assert.match(source, /launcherElement\?\.focus\(\{ preventScroll: true \}\)/);
});

test("Cars Main keeps an opaque full-screen cover while keyboard content follows the visual viewport", () => {
  assert.match(source, /followVisualViewport\?: boolean/);
  assert.match(source, /const carsMainVisualViewport = carsMain && followVisualViewport/);
  assert.match(source, /!carsMainVisualViewport/);
  assert.match(source, /const viewport = window\.visualViewport/);
  assert.match(source, /top: `\$\{viewport\.offsetTop\}px`/);
  assert.match(source, /height: `\$\{viewport\.height\}px`/);
  assert.match(source, /viewport\.addEventListener\("resize", syncViewport/);
  assert.match(source, /viewport\.addEventListener\("scroll", syncViewport/);

  const shellStart = source.indexOf("data-flight-mobile-picker-shell");
  const dialogStart = source.indexOf('id={dialogId}', shellStart);
  const outerShell = source.slice(shellStart, dialogStart);
  assert.doesNotMatch(outerShell, /style=\{carsMain[^\n]*carsMainViewportStyle/);
  assert.match(outerShell, /fixed inset-0 z-\[2147483647\]/);
  assert.doesNotMatch(outerShell, /h-\[100dvh\]/);

  const dialog = source.slice(dialogStart, source.indexOf("data-mobile-picker-header", dialogStart));
  assert.match(dialog, /style=\{carsMainVisualViewport \? carsMainViewportStyle : undefined\}/);
  assert.match(dialog, /carsMainVisualViewport && "bottom-auto"/);
  assert.match(dialog, /carsMain && "absolute h-full"/);
});
