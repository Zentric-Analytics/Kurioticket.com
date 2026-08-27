import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { retainActivePresentationContext } from "./retainedPickerContext";

test("multi-city calendar exit retains the last leg presentation context", () => {
  const flightTwo = { title: "Flight 2 departure date", selected: "2026-09-12", minimum: "2026-09-10", dismissOnBackdropPress: true };
  const clearedFallback = { title: "Choose departure date", selected: "", minimum: "2026-08-27", dismissOnBackdropPress: true };

  assert.deepEqual(retainActivePresentationContext(flightTwo, false, clearedFallback), flightTwo);
  const flightThree = { ...flightTwo, title: "Flight 3 departure date", selected: "2026-09-14" };
  assert.deepEqual(retainActivePresentationContext(flightTwo, true, flightThree), flightThree);

  const calendar = readFileSync("src/features/flow/LocalCalendarModal.tsx", "utf8");
  for (const field of ["title", "selected", "minimum", "dismissOnBackdropPress"]) {
    assert.match(calendar, new RegExp(`presented\\.${field}`));
  }
});

test("Flight airport exit retains origin kind and selection until the next active picker", () => {
  type AirportContext = { kind: "from" | "to" | undefined; selected: { code: string } | undefined };
  const origin: AirportContext = { kind: "from", selected: { code: "JFK" } };
  assert.equal(retainActivePresentationContext(origin, false, { kind: undefined, selected: undefined }).kind, "from");
  assert.equal(retainActivePresentationContext(origin, true, { kind: "to" as const, selected: { code: "LAX" } }).kind, "to");

  const flight = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(flight, /useRetainedPickerContext\(Boolean\(kind\),\{kind,selected\}\)/);
  assert.match(flight, /presented\.kind === "from" \? "Choose origin" : "Choose destination"/);
  assert.match(flight, /presented\.selected\?\.code/);
});

test("Car and Package discriminator copy remains stable through exit", () => {
  assert.equal(retainActivePresentationContext("Choose pick-up location", false, "Choose return location"), "Choose pick-up location");
  assert.equal(retainActivePresentationContext("Choose origin", false, "Choose destination"), "Choose origin");

  const car = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
  assert.match(car, /useRetainedPickerContext\(Boolean\(mode\), \{ mode, selectedValue \}\)/);
  assert.match(car, /presented\.mode === "return"/);
  assert.match(car, /presented\.selectedValue/);

  const packages = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
  assert.match(packages, /useRetainedPickerContext\(visible,title\)/);
  assert.match(packages, /\{presentedTitle\}/);
});
