import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { variableInitializer } from "@/lib/testing/sourceContract";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);
const scrollLockSource = readFileSync(
  new URL("../../lib/search/mobileResultsScrollLock.ts", import.meta.url),
  "utf8",
);
const sheetSource = readFileSync(
  new URL("../search/MobileResultsEditSheet.tsx", import.meta.url),
  "utf8",
);

const openDrawer = source.slice(
  source.indexOf("const openMobileSearchDrawer"),
  source.indexOf("const cancelMobileSearchDrawer"),
);
const closeDrawer = source.slice(
  source.indexOf("const cancelMobileSearchDrawer"),
  source.indexOf("const requestMobileSearchDrawerClose"),
);
const focusLifecycleStart = source.indexOf(
  'useEffect(() => {\n    if (mobileSearchOpen) return;',
  source.indexOf("const submitMobileSearch"),
);
const focusLifecycle = source.slice(
  focusLifecycleStart,
  source.indexOf(
    '  useEffect(() => {\n    if (typeof window === "undefined")',
    focusLifecycleStart,
  ),
);

test("opening mobile Edit Search snapshots every mutable Cars search value", () => {
  assert.match(
    openDrawer,
    /mobileSearchLauncherRef\.current = launcher \?\? null/,
  );
  assert.doesNotMatch(openDrawer, /acquireMobileResultsScrollLock/);

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
  assert.match(source, /onClose=\{requestMobileSearchDrawerClose\}/);
  const closeRequest = variableInitializer(source, "requestMobileSearchDrawerClose");
  assert.match(closeRequest, /prefers-reduced-motion: reduce/);
  assert.match(closeRequest, /cancelMobileSearchDrawer\(\)/);
  assert.match(closeRequest, /window\.setTimeout\([\s\S]*cancelMobileSearchDrawer\(\)/);
});

test("a committed Results navigation remounts client state for the new search", () => {
  assert.match(
    pageSource,
    /<CarsResultsClient\s+key=\{searchIdentity\}\s+values=\{values\}/,
  );
});

test("mobile Edit Search delegates one fixed-body lock to the shared sheet without manual scroll ownership", () => {
  assert.doesNotMatch(source, /mobileSearchScrollLockRef/);
  const start = source.indexOf('<MobileResultsEditSheet\n        appearance="carsResultsEdit"');
  const end = source.indexOf("</MobileResultsEditSheet>", start);
  const sheet = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(sheet, /\n\s*freezeBodyPosition\n/);
  assert.doesNotMatch(sheet, /freezeBodyPosition=\{false\}|backdropClassName|safe-area-inset-top/);
  assert.match(
    sheetSource,
    /acquireMobileResultsScrollLock\(\{\s*freezeBodyPosition,\s*\}\)/,
  );
  assert.match(
    scrollLockSource,
    /freezeBodyPosition = true[\s\S]*if \(freezeBodyPosition\)[\s\S]*body\.style\.position = "fixed"/,
  );
  assert.match(
    scrollLockSource,
    /shouldRestoreScroll =\s*restoreScrollOnFinalRelease && fixedBodyPositionForActiveLock/,
  );
  assert.doesNotMatch(openDrawer, /acquireMobileResultsScrollLock/);
  assert.doesNotMatch(closeDrawer, /window\.scrollTo|releaseMobileSearchScrollLock/);
  assert.match(
    source,
    /openMobileSearchDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/,
  );
});

test("closing Edit Search restores keyboard launcher focus without owning scroll restoration", () => {
  assert.match(
    focusLifecycle,
    /if \(mobileSearchOpen\) return;[\s\S]*?restoreOverlayLauncherFocus\([\s\S]*?mobileSearchLauncherRef\.current,[\s\S]*?mobileSearchModalityRef\.current/,
  );
  assert.doesNotMatch(
    focusLifecycle,
    /acquireMobileResultsScrollLock|window\.scrollTo/,
  );
});

test("cancel restores draft state without imperatively changing Results scroll", () => {
  const restoreSnapshotIndex = closeDrawer.indexOf(
    "setDriverAge(snapshot.driverAge)",
  );
  const closeIndex = closeDrawer.indexOf("setMobileSearchOpen(false)");

  assert.ok(restoreSnapshotIndex >= 0);
  assert.ok(restoreSnapshotIndex < closeIndex);
  assert.doesNotMatch(closeDrawer, /window\.scrollTo|scrollTop|scrollIntoView/);
  assert.doesNotMatch(focusLifecycle, /mobileSearchScrollLockRef/);
});

test("nested picker Done remains draft state", () => {
  assert.match(source, /onCommit=\{\(nextPickupDate, nextDropoffDate\) =>/);
  assert.match(source, /onCommit=\{\(nextPickupTime, nextDropoffTime\) =>/);
  assert.match(source, /onCommit=\{setDriverAge\}/);
});
