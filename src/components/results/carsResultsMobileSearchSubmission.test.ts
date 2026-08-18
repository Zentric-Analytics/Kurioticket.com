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
