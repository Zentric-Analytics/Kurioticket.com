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

test("shared Hotel guests picker offers compact density without changing its default", () => {
  assert.match(guests, /density\?: "default" \| "compact"/);
  assert.match(guests, /density = "default"/);
  for (const compactToken of ["min-h-[80px]", "h-10 w-10", "h-[22px] w-[22px]", "text-[14px]", "text-[12px] leading-[16px]", "text-[15px]", "h-9 w-9", "min-h-[70px]", "h-5 w-5", "h-[26px] w-[46px]"]) {
    assert.ok(guests.includes(compactToken), `compact density should include ${compactToken}`);
  }
  assert.match(guests, /compact \? "min-h-\[80px\][^"]*" : "min-h-\[104px\]/);
  assert.match(guests, /compact \? "mt-4" : "mt-7"/);
});

test("compact Hotel guest visuals use blue active accents and neutral disabled controls", () => {
  assert.match(guests, /h-10 w-10 bg-\[#075EE8\]\/\[0\.06\] text-\[#075EE8\]/);
  assert.match(guests, /disabled \? "border-slate-200 text-slate-300" : "border-\[#075EE8\] text-\[#075EE8\]"/);
  assert.doesNotMatch(guests, /compact \? "h-11 w-11"/);
});

test("Hotel pet switch uses contained logical edge positioning in both densities", () => {
  for (const token of ["flex h-11 shrink-0", "h-[26px] w-[46px]", "h-[30px] w-[52px]", "absolute top-[3px]", "h-5 w-5", "h-6 w-6", 'petFriendly ? "end-[3px]" : "start-[3px]"']) {
    assert.ok(guests.includes(token), `pet switch should include ${token}`);
  }
  assert.doesNotMatch(guests, /translate-x-\[(?:23|25)px\]/);
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

test("compact Hotel guest density is scoped to the mobile homepage integration", () => {
  assert.match(home, /density=\{mobileHomepage \? "compact" : undefined\}/);
  assert.doesNotMatch(standalone, /density=/);
});

test("shell supports navigation labels, arrow-only headers, and real spacers", () => {
  assert.match(shell, /showBackLabel\?: boolean/);
  assert.match(shell, /showCancelAction\?: boolean/);
  assert.match(shell, /data-mobile-picker-header-spacer/);
  assert.doesNotMatch(shell, /opacity-0.*Cancel|visibility-hidden.*Cancel/);
});
