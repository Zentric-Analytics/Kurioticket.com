import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("hotel suggestion surfaces share canonical primary and supporting display helpers", () => {
  for (const file of [
    "./HotelDestinationMobilePicker.tsx",
    "./HotelSearchBar.tsx",
    "./SearchTabs.tsx",
    "./DealsSearchForm.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /getHotelDestinationPrimaryLabel/);
    assert.match(source, /getHotelDestinationSupportingLabel/);
  }
});

test("hotel selection continues to submit the legacy searchValue", () => {
  assert.match(read("./useHotelDestinationAutocomplete.ts"), /return suggestion\.searchValue/);
  assert.match(read("./HotelDestinationMobilePicker.tsx"), /onChange\(option\.searchValue\)/);
});

test("selected hotel launchers resolve canonical primary and supporting context", () => {
  assert.match(read("./SearchTabs.tsx"), /getHotelLocationFieldDisplay\(destination/);
  assert.match(read("./HotelSearchBar.tsx"), /getHotelLocationFieldDisplay\(destination/);
  assert.match(read("./DealsSearchForm.tsx"), /getHotelLocationFieldDisplay\(/);
});
