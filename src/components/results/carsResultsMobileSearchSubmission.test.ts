import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { searchCars } from "@/services/travel/carAggregator";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const mobileControls = source.slice(
  source.indexOf('{placement === "mobile" ? (\n              <>'),
  source.indexOf(
    "<SearchDateCell",
    source.indexOf('{placement === "mobile" ? (\n              <>'),
  ),
);
const mobileSubmit = source.slice(
  source.indexOf("const submitMobileSearch"),
  source.indexOf("useLayoutEffect", source.indexOf("const submitMobileSearch")),
);

function submittedLocations({
  pickupLocation,
  dropoffLocation,
  returnToDifferentLocation,
}: {
  pickupLocation: string;
  dropoffLocation: string;
  returnToDifferentLocation: boolean;
}) {
  const data = new FormData();
  data.append("pickupLocation", pickupLocation);
  if (returnToDifferentLocation) {
    data.append("dropoffLocation", dropoffLocation);
    data.append("returnToDifferentLocation", "1");
  }
  return data;
}

test("mobile Search has one authoritative successful control per location", () => {
  assert.equal(mobileControls.match(/name="pickupLocation"/g)?.length, 1);
  assert.equal(mobileControls.match(/name="dropoffLocation"/g)?.length, 1);

  const data = submittedLocations({
    pickupLocation: "Heathrow Airport (LHR)",
    dropoffLocation: "",
    returnToDifferentLocation: false,
  });
  assert.deepEqual(data.getAll("pickupLocation"), ["Heathrow Airport (LHR)"]);
  assert.deepEqual(data.getAll("dropoffLocation"), []);
});

test("different-return Search serializes both current drafts exactly once", () => {
  const data = submittedLocations({
    pickupLocation: "Heathrow Airport (LHR)",
    dropoffLocation: "Manchester Airport (MAN)",
    returnToDifferentLocation: true,
  });
  assert.deepEqual(data.getAll("pickupLocation"), ["Heathrow Airport (LHR)"]);
  assert.deepEqual(data.getAll("dropoffLocation"), [
    "Manchester Airport (MAN)",
  ]);
  assert.deepEqual(data.getAll("returnToDifferentLocation"), ["1"]);
});

test("mobile Search captures the live form before submit-close and router navigation", () => {
  const submitHandler = mobileSubmit;
  const preventDefaultIndex = submitHandler.indexOf("event.preventDefault()");
  const formDataIndex = submitHandler.indexOf(
    "new FormData(event.currentTarget)",
  );
  const hrefIndex = submitHandler.indexOf("buildCarsResultsHref(formData)");
  const closeIndex = submitHandler.indexOf(
    "mobileSearchSnapshotRef.current = null",
  );
  const pendingIndex = submitHandler.indexOf("setIsSearchSubmitting(true)");
  const releaseIndex = submitHandler.indexOf(
    "releaseMobileSearchScrollLock({ restoreScroll: false })",
  );
  const topIndex = submitHandler.indexOf(
    'window.scrollTo({ top: 0, left: 0, behavior: "auto" })',
  );
  const drawerCloseIndex = submitHandler.indexOf("setMobileSearchOpen(false)");
  const navigationIndex = submitHandler.indexOf("router.push(href");

  assert.ok(preventDefaultIndex >= 0);
  assert.ok(preventDefaultIndex < formDataIndex);
  assert.ok(formDataIndex < hrefIndex);
  assert.ok(hrefIndex < closeIndex);
  assert.ok(closeIndex < pendingIndex);
  assert.ok(pendingIndex < releaseIndex);
  assert.ok(releaseIndex < topIndex);
  assert.ok(topIndex < drawerCloseIndex);
  assert.ok(drawerCloseIndex < navigationIndex);
  assert.doesNotMatch(submitHandler, /mode: "cancel"/);
  assert.match(submitHandler, /router\.push\(href, \{ scroll: true \}\)/);
  assert.match(
    submitHandler,
    /releaseMobileSearchScrollLock\(\{ restoreScroll: false \}\)/,
  );
});

test("mobile Search replaces stale Cars results with localized branded loading", () => {
  const pendingBranch = source.slice(
    source.indexOf("if (isSearchSubmitting) {"),
    source.indexOf(
      'return (\n    <main className="flex-1 bg-[#f6f8fb] pb-8">',
      source.indexOf("if (isSearchSubmitting) {") + 1,
    ),
  );

  assert.match(source, /const \[isSearchSubmitting, setIsSearchSubmitting\]/);
  assert.match(pendingBranch, /<BrandedLoading/);
  assert.match(pendingBranch, /variant="fullscreen"/);
  assert.match(pendingBranch, /visual="logoPulse"/);
  assert.match(pendingBranch, /showProgress=\{false\}/);
  assert.doesNotMatch(pendingBranch, /CarsResultsExperience|CarResultCard/);

  for (const key of [
    "carsResults.loading.title",
    "carsResults.loading.checkingCarsAndRates",
    "carsResults.loading.comparingVehiclesAndProviders",
    "carsResults.loading.findingBestAvailableOptions",
    "carsResults.loading.preparingResults",
  ]) {
    assert.match(pendingBranch, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(pendingBranch, /setTimeout|setInterval/);
});

test("same-URL Search closes without entering a permanent pending state", () => {
  const submitHandler = mobileSubmit;

  assert.match(submitHandler, /isSameCarsResultsHref\(href, currentHref\)/);
  assert.match(
    submitHandler,
    /if \(!isSameSearch\) \{[\s\S]*setIsSearchSubmitting\(true\)/,
  );
  assert.match(
    submitHandler,
    /setMobileSearchOpen\(false\)[\s\S]*if \(isSameSearch\) return;[\s\S]*router\.push/,
  );
  assert.match(submitHandler, /if \(isSearchSubmittingRef\.current\) return;/);
});

test("Heathrow mobile draft produces one exact pickup query value", () => {
  const data = submittedLocations({
    pickupLocation: "Heathrow Airport (LHR)",
    dropoffLocation: "",
    returnToDifferentLocation: false,
  });
  const query = new URLSearchParams(data as never);

  assert.deepEqual(query.getAll("pickupLocation"), ["Heathrow Airport (LHR)"]);
});

test("changed server search input replaces inventory search context", async () => {
  const common = {
    pickupDate: "2026-09-10",
    dropoffDate: "2026-09-12",
    pickupTime: "10:00",
    dropoffTime: "10:00",
    driverAge: "18-70",
  };
  const oldInventory = await searchCars({
    ...common,
    pickupLocation: "Old pickup location",
    dropoffLocation: "Old pickup location",
  });
  const newInventory = await searchCars({
    ...common,
    pickupLocation: "Heathrow Airport (LHR)",
    dropoffLocation: "Heathrow Airport (LHR)",
  });

  assert.equal(oldInventory.results[0]?.pickupLocation, "Old pickup location");
  assert.equal(
    newInventory.results[0]?.pickupLocation,
    "Heathrow Airport (LHR)",
  );
  assert.notDeepEqual(newInventory.results, oldInventory.results);
});
