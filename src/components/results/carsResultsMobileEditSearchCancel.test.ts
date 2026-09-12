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
    /mobileSearchScrollLockRef\.current \?\?= acquireMobileResultsScrollLock\(\)/,
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

test("mobile search uses the shared stable Results lock and restores focus without scrolling", () => {
  assert.match(
    scrollLifecycle,
    /mobileSearchScrollLockRef\.current\?\.\(\)/,
  );
  assert.match(
    scrollLockSource,
    /restoreScroll = true[\s\S]*Math\.abs\(window\.scrollY - original\.scrollY\) > 1[\s\S]*window\.scrollTo/,
  );
  assert.match(scrollLockSource, /body\.style\.overscrollBehavior = "none"/);
  assert.match(scrollLockSource, /root\.style\.overscrollBehavior = "none"/);
  assert.doesNotMatch(scrollLockSource, /style\.overflow\s*=/);
  assert.match(scrollLockSource, /if \(released\) return;[\s\S]*released = true/);
  assert.doesNotMatch(scrollLockSource, /style\.position = "fixed"/);
  assert.doesNotMatch(scrollLockSource, /behavior: "smooth"/);
  assert.match(scrollLifecycle, /restoreOverlayLauncherFocus\(launcher, mobileSearchModalityRef\.current\)/);
  assert.match(source, /openMobileSearchDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/);
});

test("cancel stabilizes Results before closing the editor and restoring focus", () => {
  const restoreSnapshotIndex = closeDrawer.indexOf(
    "setDriverAge(snapshot.driverAge)",
  );
  const releaseIndex = closeDrawer.indexOf("releaseMobileSearchScrollLock();");
  const closeIndex = closeDrawer.indexOf("setMobileSearchOpen(false)");
  const focusIndex = scrollLifecycle.indexOf(
    "restoreOverlayLauncherFocus(launcher, mobileSearchModalityRef.current)",
  );

  assert.ok(restoreSnapshotIndex >= 0);
  assert.ok(restoreSnapshotIndex < releaseIndex);
  assert.ok(releaseIndex < closeIndex);
  assert.ok(focusIndex >= 0);
});

test("nested picker Done remains draft state", () => {
  assert.match(source, /onCommit=\{\(nextPickupDate, nextDropoffDate\) =>/);
  assert.match(source, /onCommit=\{\(nextPickupTime, nextDropoffTime\) =>/);
  assert.match(source, /onCommit=\{setDriverAge\}/);
});
