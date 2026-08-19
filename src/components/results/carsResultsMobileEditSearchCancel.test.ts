import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);

const openDrawer = source.slice(
  source.indexOf("const openMobileSearchDrawer"),
  source.indexOf("const cancelMobileSearchDrawer"),
);
const closeDrawer = source.slice(
  source.indexOf("const cancelMobileSearchDrawer"),
  source.indexOf(
    "useLayoutEffect",
    source.indexOf("const cancelMobileSearchDrawer"),
  ),
);
const scrollLifecycle = source.slice(
  source.indexOf(
    "useLayoutEffect",
    source.indexOf("const cancelMobileSearchDrawer"),
  ),
  source.indexOf("const renderMobileControlsRow"),
);

test("opening mobile Edit Search snapshots every mutable Cars search value", () => {
  assert.match(
    openDrawer,
    /mobileSearchLauncherRef\.current = launcher \?\? null/,
  );
  assert.match(
    openDrawer,
    /mobileSearchScrollLockRef\.current \?\?= lockBodyScroll\(\)/,
  );

  for (const field of [
    "pickupLocation",
    "dropoffLocation",
    "returnToDifferentLocation",
    "pickupDate",
    "dropoffDate",
    "pickupTime",
    "dropoffTime",
    "driverAge",
  ]) {
    assert.match(openDrawer, new RegExp(`\\b${field},`));
    assert.match(closeDrawer, new RegExp(`set\\w+\\(snapshot\\.${field}\\)`));
  }
});

test("cancel restores the snapshot while mobile Search uses submit semantics", () => {
  assert.match(closeDrawer, /if \(snapshot\)/);
  assert.match(
    source,
    /const submitMobileSearch[\s\S]*?event\.preventDefault\(\)/,
  );
  assert.match(
    source,
    /mobileSearchSnapshotRef\.current = null;[\s\S]*?mobileSearchLauncherRef\.current = null;[\s\S]*?setMobileSearchOpen\(false\)/,
  );
  assert.match(source, /onClick=\{\(\) => cancelMobileSearchDrawer\(\)\}/);
});

test("a committed Results navigation remounts client state for the new search", () => {
  assert.match(
    pageSource,
    /<CarsResultsClient\s+key=\{searchIdentity\}\s+values=\{values\}/,
  );
});

test("mobile search restores saved Results scroll and the actual launcher without scrolling", () => {
  const scrollLock = source.slice(
    source.indexOf("function lockBodyScroll"),
    source.indexOf("function isSafelyFocusableElement"),
  );

  assert.match(
    scrollLifecycle,
    /mobileSearchScrollLockRef\.current\?\.restore\(\)/,
  );
  assert.match(
    scrollLock,
    /restoreScroll = true[\s\S]*restoreScroll && window\.scrollY !== scrollY[\s\S]*window\.scrollTo\(0, scrollY\)/,
  );
  assert.match(scrollLock, /bodyElement\.style\.overflow = "hidden"/);
  assert.match(scrollLock, /rootElement\.style\.overflow = "hidden"/);
  assert.match(scrollLock, /overscrollBehavior = "none"/);
  assert.match(scrollLock, /if \(restored\) return;[\s\S]*restored = true/);
  assert.doesNotMatch(scrollLock, /style\.position = "fixed"/);
  assert.doesNotMatch(scrollLock, /style\.top = `-\$\{scrollY\}px`/);
  assert.doesNotMatch(scrollLock, /behavior: "smooth"/);
  assert.match(scrollLifecycle, /isSafelyFocusableElement\(launcher\)/);
  assert.match(scrollLifecycle, /launcher\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /openMobileSearchDrawer\(event\.currentTarget\)/);
});

test("cancel stabilizes Results before closing the editor and restoring focus", () => {
  const restoreSnapshotIndex = closeDrawer.indexOf(
    "setDriverAge(snapshot.driverAge)",
  );
  const releaseIndex = closeDrawer.indexOf("releaseMobileSearchScrollLock();");
  const closeIndex = closeDrawer.indexOf("setMobileSearchOpen(false)");
  const focusIndex = scrollLifecycle.indexOf(
    "launcher.focus({ preventScroll: true })",
  );

  assert.ok(restoreSnapshotIndex >= 0);
  assert.ok(restoreSnapshotIndex < releaseIndex);
  assert.ok(releaseIndex < closeIndex);
  assert.ok(focusIndex >= 0);
});

test("nested picker Done remains draft state that the editor X can cancel", () => {
  assert.match(source, /onCommit=\{\(nextPickupDate, nextDropoffDate\) =>/);
  assert.match(source, /onCommit=\{\(nextPickupTime, nextDropoffTime\) =>/);
  assert.match(source, /onCommit=\{setDriverAge\}/);
  assert.doesNotMatch(
    source.match(
      /<MobileDatePickerDialog[\s\S]*?<div\n        className=\{cn\(/,
    )?.[0] ?? "",
    /cancelMobileSearchDrawer/,
  );
});
