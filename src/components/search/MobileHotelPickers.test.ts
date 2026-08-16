import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const destination = read("./HotelDestinationMobilePicker.tsx");
const guests = read("./MobileHotelGuestsRoomsPicker.tsx");
const shell = read("./FlightMobilePickerShell.tsx");
const home = read("./SearchTabs.tsx");
const standalone = read("./HotelSearchBar.tsx");
const recents = read("../../lib/recent-searches.ts");

test("hotel destination uses draft selection, real recents, and Done-only footer", () => {
  assert.match(destination, /deriveRecentHotelDestinations\(readRecentSearches\(\), 3\)/);
  assert.match(destination, /setDraftValue\(option\.searchValue\)/);
  assert.match(destination, /onChange\(draftValue\.trim\(\)\)/);
  assert.match(destination, /showCancelAction=\{false\}/);
  assert.match(destination, /Building2/);
  assert.doesNotMatch(destination, /hotelDestinationKindLabels/);
  assert.doesNotMatch(destination, />\s*\{t\("clear"\)\}/);
});

test("recent hotel destinations are typed, deduped, ordered, and capped", () => {
  assert.match(recents, /export function deriveRecentHotelDestinations/);
  assert.match(recents, /entry\.type !== "hotel"/);
  assert.match(recents, /seen\.has\(destination\.id\)/);
  assert.match(recents, /Date\.parse\(b\.createdAt\) - Date\.parse\(a\.createdAt\)/);
});

test("shared Hotel guests picker preserves approved sections and limits", () => {
  for (const token of ["UserRound", "Baby", "BedDouble", "PawPrint", 'role="switch"']) assert.match(guests, new RegExp(token));
  assert.match(guests, /max=\{12 - children\}/);
  assert.match(guests, /max=\{12 - adults\}/);
  assert.match(guests, /max=\{6\}/);
  assert.match(guests, /min=\{1\}/);
});

test("homepage and standalone Hotels share draft guest presentation", () => {
  for (const source of [home, standalone]) {
    assert.match(source, /MobileHotelGuestsRoomsPicker/);
    assert.match(source, /draftHotelAdults/);
    assert.match(source, /draftHotelPetFriendly/);
    assert.match(source, /showBackLabel=\{false\}/);
    assert.match(source, /showCancelAction=\{false\}/);
  }
});

test("shell supports navigation labels, arrow-only headers, and real spacers", () => {
  assert.match(shell, /showBackLabel\?: boolean/);
  assert.match(shell, /showCancelAction\?: boolean/);
  assert.match(shell, /data-mobile-picker-header-spacer/);
  assert.doesNotMatch(shell, /opacity-0.*Cancel|visibility-hidden.*Cancel/);
});
