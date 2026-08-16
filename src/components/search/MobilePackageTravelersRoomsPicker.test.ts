import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync("src/components/search/MobilePackageTravelersRoomsPicker.tsx", "utf8");
const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");
const english = readFileSync("src/lib/i18n/en.ts", "utf8");

test("Packages mobile traveler body matches the approved connected-card hierarchy", () => {
  for (const label of ["adults", "children", "infants", "rooms", "petFriendly"]) assert.match(picker, new RegExp(`strings\\.${label}`));
  for (const copy of ["adultDescription", "childDescription", "infantDescription", "roomDescription", "petDescription"]) assert.match(picker, new RegExp(`strings\\.${copy}`));
  assert.match(picker, /min-h-\[84px\]/);
  assert.match(picker, /h-11 w-11/);
  assert.match(picker, /h-10 w-10/);
  assert.match(picker, /type="checkbox"/);
  assert.doesNotMatch(picker, /Cabin|Economy|Business|First/);
});

test("Packages mobile shell uses exact title, arrow-only header, fixed full-width Done, and canonical commit", () => {
  assert.match(english, /"deals\.mobileTravelersRoomsTitle": "Travelers\/Rooms"/);
  assert.match(english, /Add the number of travelers and rooms\./);
  assert.match(form, /showBackLabel=\{false\}/);
  assert.match(form, /showCancelAction=\{false\}/);
  assert.match(form, /h-\[52px\] w-full rounded-\[9px\]/);
  assert.match(form, /commitTravelers\(true\)/);
  assert.match(form, /<MobilePackageTravelersRoomsPicker/);
});

test("Hotel-only controls remain mode-gated while traveler limits preserve package rules", () => {
  assert.match(picker, /includeHotel \?/);
  assert.match(picker, /includeFlight \? 9 : 12/);
  assert.match(picker, /maximum=\{6\}/);
  assert.match(picker, /Math\.min\(adults/);
});

test("traveler-only mode uses exact copy and omits every Hotel control", () => {
  assert.match(english, /"deals\.mobileTravelersTitle": "Travelers"/);
  assert.match(english, /"deals\.mobileTravelersIntro": "Select the number of travelers"/);
  assert.match(form, /included\.hotel \? t\("deals\.mobileTravelersRoomsTitle"\) : t\("deals\.mobileTravelersTitle"\)/);
  assert.match(form, /included\.hotel \? "deals\.mobileTravelersRoomsIntro" : "deals\.mobileTravelersIntro"/);
  assert.match(picker, /includeHotel \? <div/);
  assert.match(picker, /neutral=\{!includeHotel\}/);
});
