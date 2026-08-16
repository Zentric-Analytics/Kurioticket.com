import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sources = [
  "src/components/search/SearchTabs.tsx",
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "src/components/search/HotelSearchBar.tsx",
  "src/components/search/DealsSearchForm.tsx",
  "src/app/cars/page.tsx",
].map((path) => [path, readFileSync(path, "utf8")] as const);

test("all customer-facing mobile search owners use the shared date dialog", () => {
  for (const [path, source] of sources) {
    assert.match(source, /MobileDatePickerDialog/, path);
  }
  assert.match(sources[0][1], /rangeRequired=\{tripType !== "one-way"\}/);
  assert.match(sources[1][1], /rangeRequired=\{tripType !== "one-way"\}/);
  assert.match(sources[3][1], /carsSearch\.chooseRentalDates/);
  assert.match(sources[4][1], /carsSearch\.chooseRentalDates/);
});

test("mobile date dialogs expose only the shared Done footer", () => {
  const dialog = readFileSync(
    "src/components/search/MobileDateRangePicker.tsx",
    "utf8",
  );
  assert.match(dialog, /onCommit\(draftStart, rangeRequired \? draftEnd : ""\)/);
  assert.doesNotMatch(dialog, />\s*Clear\s*</);
  assert.doesNotMatch(dialog, /ChevronLeft|ChevronRight|previousMonth|nextMonth/);
});

test("desktop calendar implementations remain available beside mobile dialogs", () => {
  assert.match(sources[0][1], /CarsRentalDatePickerContent/);
  assert.match(sources[2][1], /desktopPopoverClassName/);
  assert.match(sources[3][1], /DealsFlightDatesPopover/);
  assert.match(sources[4][1], /sm:block/);
});
