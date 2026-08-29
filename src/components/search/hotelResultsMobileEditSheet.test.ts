import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchBar = readFileSync(
  new URL("./HotelSearchBar.tsx", import.meta.url),
  "utf8",
);
const sheet = readFileSync(
  new URL("./MobileResultsEditSheet.tsx", import.meta.url),
  "utf8",
);

test("results Hotel editor separates its grouped fields from the search action", () => {
  assert.match(
    searchBar,
    /mobileResultsSheet && "min-h-\[60px\][^"]*hover:bg-slate-50\/70/,
  );
  assert.match(
    searchBar,
    /mobileResultsSheet && "mb-0\.5 normal-case text-\[11px\] font-semibold/,
  );
  assert.match(
    searchBar,
    /data-hotel-mobile-edit-group=\{[\s\S]*?mobileResultsSheet[\s\S]*?mobileResultsEditGroupClass/,
  );
  assert.match(searchBar, /data-hotel-mobile-edit-search-action=/);
  const groupStart = searchBar.indexOf("data-hotel-mobile-edit-group");
  const destination = searchBar.indexOf("ref={destinationWrapperRef}", groupStart);
  const dates = searchBar.indexOf("ref={datesWrapperRef}", destination);
  const guests = searchBar.indexOf("ref={guestsRoomsWrapperRef}", dates);
  const groupEnd = searchBar.indexOf("data-hotel-mobile-edit-search-action", guests);
  assert.ok(groupStart < destination && destination < dates && dates < guests);
  assert.ok(guests < groupEnd, "all three field rows precede the group boundary");
  assert.doesNotMatch(searchBar.slice(groupStart, groupEnd), /type="submit"/);
  assert.match(searchBar.slice(groupEnd), /type="submit"/);
  assert.doesNotMatch(searchBar, /divide-y-0/);
  assert.doesNotMatch(searchBar, /after:inset-x-4 after:bottom-0/);
  assert.match(searchBar, /mobileLandingPresentation \|\| mobileResultsSheet/);
  assert.match(
    searchBar,
    /!mobileLandingPresentation && !mobileResultsSheet && "max-sm:hidden"/,
  );
  assert.match(searchBar, /!mobileResultsSheet \? \([\s\S]*?<ChevronDown/);
  assert.match(searchBar, /dateSummary}[\s\S]*?mobileResultsSheet \? <ChevronRight/);
  assert.match(searchBar, /guestsRoomsSummary}[\s\S]*?mobileResultsSheet \? \([\s\S]*?<ChevronRight/);
  assert.match(
    searchBar,
    /mobileResultsSheet && "mt-0 h-12 shadow-none/,
  );
});

test("submitting a Hotel results edit closes the sheet before navigation", () => {
  const close = searchBar.indexOf("if (mobileLayout === \"drawer\")");
  const navigation = searchBar.indexOf("router.push(nextUrl)", close);

  assert.notEqual(close, -1);
  assert.notEqual(navigation, -1);
  assert.ok(close < navigation);
  assert.match(
    searchBar.slice(close, navigation),
    /closeMobileSearchPanel\(\)/,
  );
});

test("results edit sheet focuses its neutral dialog surface on open", () => {
  assert.match(sheet, /dialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sheet, /role="dialog"[\s\S]*?tabIndex=\{-1\}/);
  assert.doesNotMatch(sheet, /closeRef\.current\?\.focus/);
  assert.match(
    sheet,
    /focus:outline-none focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/35/,
  );
});
