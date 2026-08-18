import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

const openDrawer = source.slice(
  source.indexOf("const openMobileSearchDrawer"),
  source.indexOf("const closeMobileSearchDrawer"),
);
const closeDrawer = source.slice(
  source.indexOf("const closeMobileSearchDrawer"),
  source.indexOf(
    "useLayoutEffect",
    source.indexOf("const closeMobileSearchDrawer"),
  ),
);
const scrollLifecycle = source.slice(
  source.indexOf(
    "useLayoutEffect",
    source.indexOf("const closeMobileSearchDrawer"),
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

test("cancel restores the snapshot while Search submits the editor draft", () => {
  assert.match(closeDrawer, /if \(cancelDraft && snapshot\)/);
  assert.match(
    source,
    /onSubmit=\{\(\) => \{\s*closeMobileSearchDrawer\(false\)/,
  );
  assert.match(source, /onClick=\{\(\) => closeMobileSearchDrawer\(\)\}/);
});

test("mobile search restores saved Results scroll and the actual launcher without scrolling", () => {
  assert.match(
    scrollLifecycle,
    /mobileSearchScrollLockRef\.current\?\.restore\(\)/,
  );
  assert.match(scrollLifecycle, /isSafelyFocusableElement\(launcher\)/);
  assert.match(scrollLifecycle, /launcher\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /openMobileSearchDrawer\(event\.currentTarget\)/);
});

test("nested picker Done remains draft state that the editor X can cancel", () => {
  assert.match(source, /onCommit=\{\(nextPickupDate, nextDropoffDate\) =>/);
  assert.match(source, /onCommit=\{\(nextPickupTime, nextDropoffTime\) =>/);
  assert.match(source, /onCommit=\{setDriverAge\}/);
  assert.doesNotMatch(
    source.match(
      /<MobileDatePickerDialog[\s\S]*?<div\n        className=\{cn\(/,
    )?.[0] ?? "",
    /closeMobileSearchDrawer/,
  );
});
