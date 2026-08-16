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

test("shared Hotel guests picker uses Kurioticket blue only for its row icons", () => {
  assert.match(guests, /bg-slate-100 text-\[#075EE8\]/);
  assert.match(guests, /<PawPrint[^>]*className=\{cn\("text-\[#075EE8\]"/);
  assert.doesNotMatch(guests, /bg-slate-100 text-slate-800/);
  assert.doesNotMatch(guests, /<PawPrint[^>]*text-slate-700/);
});

test("shared Hotel Pet-friendly switch keeps its thumb inside both density tracks", () => {
  assert.match(guests, /compact \? "h-\[26px\] w-\[46px\]" : "h-\[30px\] w-\[52px\]"/);
  assert.match(guests, /compact \? "h-5 w-5" : "h-6 w-6"/);
  assert.match(guests, /petFriendly \? "end-\[3px\]" : "start-\[3px\]"/);
  assert.match(guests, /transition-\[inset\]/);
  assert.doesNotMatch(guests, /translate-x-\[23px\]|translate-x-\[25px\]/);
  assert.match(guests, /role="switch" aria-checked=\{petFriendly\} aria-label=\{strings\.petFriendly\}/);
});

test("shared Hotel guests picker offers compact density without changing its default", () => {
  assert.match(guests, /density\?: "default" \| "compact"/);
  assert.match(guests, /density = "default"/);
  for (const compactToken of ["min-h-[86px]", "h-11 w-11", "h-6 w-6", "text-[15px]", "text-[12px] leading-[16px]", "text-[16px]", "h-[38px] w-[38px]", "min-h-[74px]", "h-5 w-5", "h-[26px] w-[46px]"]) {
    assert.ok(guests.includes(compactToken), `compact density should include ${compactToken}`);
  }
  assert.match(guests, /compact \? "h-11 w-11" : "h-\[52px\] w-\[52px\]"/);
  assert.match(guests, /compact \? "min-h-\[86px\][^"]*" : "min-h-\[104px\]/);
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
