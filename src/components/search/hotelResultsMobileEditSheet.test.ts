import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const searchBar = read("./HotelSearchBar.tsx");
const sheet = read("./MobileResultsEditSheet.tsx");
const results = read("../results/HotelResultsClient.tsx");

test("Hotel results editor renders three independent canonical field cards", () => {
  assert.match(searchBar, /compact && !mobileResultsSheet \? \(/);
  assert.match(searchBar, /data-hotel-results-edit-fields=/);
  assert.match(searchBar, /className=\{mobileResultsSheet \? "flex flex-col gap-2\.5" : "contents"\}/);
  assert.equal(searchBar.match(/data-hotel-mobile-edit-row=/g)?.length, 3);
  assert.equal(searchBar.match(/min-h-\[70px\] rounded-\[14px\] border-\[#D8E1EC\]/g)?.length, 4);
  assert.doesNotMatch(searchBar, /mobileResultsEditGroupClass/);

  const fieldsStart = searchBar.indexOf("data-hotel-results-edit-fields");
  const destination = searchBar.indexOf("ref={destinationWrapperRef}", fieldsStart);
  const dates = searchBar.indexOf("ref={datesWrapperRef}", destination);
  const guests = searchBar.indexOf("ref={guestsRoomsWrapperRef}", dates);
  const fieldsEnd = searchBar.indexOf("data-hotel-mobile-edit-search-action", guests);
  assert.ok(fieldsStart < destination && destination < dates && dates < guests && guests < fieldsEnd);
  assert.doesNotMatch(searchBar.slice(fieldsStart, fieldsEnd), /type="submit"/);
  assert.match(searchBar.slice(fieldsEnd), /type="submit"/);
});

test("Hotel Results keeps page summaries mounted but omits the sheet summary", () => {
  assert.doesNotMatch(results, /mobileHotelSearchOpen && "hidden"/);
  assert.match(results, /aria-hidden=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(results, /inert=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(results, /mobileHotelSearchOpen && "pointer-events-none"/);
  assert.doesNotMatch(results, /!guided && !mobileHotelSearchOpen \? \(/);
  assert.match(searchBar, /mobileLayout === "controls"/);

  const summary = searchBar.indexOf("{compact && !mobileResultsSheet ? (");
  const form = searchBar.indexOf("<form", summary);
  assert.ok(summary >= 0 && form > summary);
  assert.doesNotMatch(searchBar.slice(form), /\{mobileSearchSummary\}/);
});

test("Hotel results cards place their icons and approved affordances in value rows", () => {
  const destination = searchBar.slice(searchBar.indexOf("ref={destinationWrapperRef}"), searchBar.indexOf("ref={datesWrapperRef}"));
  const dates = searchBar.slice(searchBar.indexOf("ref={datesWrapperRef}"), searchBar.indexOf("ref={guestsRoomsWrapperRef}"));
  const guests = searchBar.slice(searchBar.indexOf("ref={guestsRoomsWrapperRef}"), searchBar.indexOf("data-hotel-mobile-edit-search-action"));

  assert.match(destination, /data-hotel-destination-value=[\s\S]*?<MapPin/);
  assert.doesNotMatch(destination, /ChevronRight/);
  assert.match(destination, /data-hotel-mobile-edit-chevron=[\s\S]*?"false"/);
  assert.match(dates, /grid-cols-\[20px_minmax\(0,1fr\)_16px\][\s\S]*?<Calendar[\s\S]*?<ChevronRight/);
  assert.match(guests, /grid-cols-\[20px_minmax\(0,1fr\)_16px\][\s\S]*?<UserRound[\s\S]*?<ChevronRight/);
  assert.equal((searchBar.match(/<ChevronRight aria-hidden="true" className=/g) ?? []).length, 2);
});

test("Hotel results sheet uses neutral content behind white cards", () => {
  assert.match(results, /className="bg-slate-50"/);
  assert.match(results, /contentClassName="bg-slate-50/);
  assert.match(results, /bottomSurfaceContinuation/);
  assert.match(
    results,
    /bottomSurfaceContinuationClassName="bg-slate-50"/,
  );
  assert.match(sheet, /mobile-results-sheet-content[\s\S]*?bg-inherit/);
  assert.match(sheet, /border-b border-slate-200\/80 bg-white/);
});

test("the shared sheet exclusively owns locking while nested Hotel pickers are open", () => {
  assert.match(results, /nestedLayerOpen=\{mobileHotelNestedLayerOpen\}/);
  assert.match(
    results,
    /onMobileNestedLayerChange=\{setMobileHotelNestedLayerOpen\}/,
  );
  assert.match(
    searchBar,
    /destinationMobilePickerOpen \|\| datesOpen \|\| guestsRoomsOpen/,
  );
  assert.doesNotMatch(results, /mobileHotelSearchScrollLockRef/);
  assert.equal(
    results.match(/acquireMobileResultsScrollLock\(\)/g)?.length,
    1,
    "only the independent Filters drawer should retain Results-owned locking",
  );
});

test("submitting a Hotel results edit closes the sheet before navigation", () => {
  const close = searchBar.indexOf("if (mobileLayout === \"drawer\")");
  const navigation = searchBar.indexOf("router.push(nextUrl)", close);
  assert.ok(close !== -1 && navigation > close);
  assert.match(searchBar.slice(close, navigation), /closeMobileSearchPanel\(\)/);
});

test("results edit sheet retains accessible neutral focus handling", () => {
  assert.match(sheet, /dialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sheet, /role="dialog"[\s\S]*?tabIndex=\{-1\}/);
  assert.doesNotMatch(sheet, /closeRef\.current\?\.focus/);
});
