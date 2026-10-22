import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelPriceAlertControl.tsx", import.meta.url),
  "utf8",
);

test("changed hotel alert identity clears prior search state before rendering", () => {
  const body = source.match(/if \(previousLookupKey !== lookupKey\) \{([^}]+)\}/)?.[1];
  assert.ok(body);
  const changes: unknown[] = [];
  new Function("lookupKey", "setPreviousLookupKey", "setAlerts", "setAlertKnown", "setAuthenticated", body)(
    "new-search", ...Array.from({ length: 4 }, () => (value: unknown) => changes.push(value)),
  );
  assert.deepEqual(changes, ["new-search", [], false, null]);
  assert.match(source, /JSON.stringify\(\[hotel.id, search.checkIn, search.checkOut, search.destination, search.guests, search.rooms\]\)/);
  assert.match(source, /await response.json\(\)[\s\S]*if \(controller.signal.aborted\) return;[\s\S]*setAlerts/);
});

test("web Hotel Price Alert uses the native percentage-drop model instead of manual target entry", () => {
  assert.match(source, /hotelAlertPriceBasis/);
  assert.match(source, /HOTEL_ALERT_MIN_DROP_PERCENT/);
  assert.match(source, /HOTEL_ALERT_MAX_DROP_PERCENT/);
  assert.match(source, /HOTEL_ALERT_DEFAULT_DROP_PERCENT/);
  assert.match(source, /type="range"/);
  assert.match(source, /Current total/);
  assert.match(source, /Price drop/);
  assert.match(source, /Drops by/);
  assert.match(source, /Target total/);
  assert.match(source, /hotelAlertDesiredTotal/);
  assert.match(source, /hotelAlertDropPercentForTarget/);
  assert.doesNotMatch(source, /inputMode="decimal"|setTarget\(|const \[target,/);
});

test("web Hotel Price Alert preserves provider currency while showing display currency totals", () => {
  assert.match(source, /providerCurrentTotal/);
  assert.match(source, /providerCurrency/);
  assert.match(source, /displayCurrency/);
  assert.match(source, /formatDisplayPrice/);
  assert.match(source, /buildHotelPriceAlertPayload\([\s\S]*?alertTarget,[\s\S]*?providerCurrency/);
});

test("web Hotel Price Alert uses the mobile overview utility card presentation", () => {
  assert.match(source, /min-h-\[58px\]/);
  assert.match(source, /h-\[18px\] w-\[18px\]/);
  assert.match(source, /text-\[14px\] font-semibold leading-5/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=\{Boolean\(isTracking\)\}/);
  assert.match(source, /disabled=\{compactDisabled\}/);
});


test("desktop Hotel Results price-alert row omits only the subtitle", () => {
  const rowStart = source.indexOf('className={cn("hidden rounded-2xl border border-[#CFE0F8] bg-[#EEF6FF]');
  const rowEnd = source.indexOf("{status === \"saved\" ? (", rowStart);
  const row = source.slice(rowStart, rowEnd);
  const dialogStart = source.indexOf("<dialog", rowEnd);
  const dialogEnd = source.indexOf("</dialog>", dialogStart);
  const dialog = source.slice(dialogStart, dialogEnd);

  assert.match(row, /travel\.account\.hotelAlert\.title/);
  assert.doesNotMatch(row, /travel\.account\.hotelAlert\.body/);
  assert.match(dialog, /travel\.account\.hotelAlert\.body/);
});


test("desktop Hotel Results price-alert row is vertically aligned and compact", () => {
  const rowStart = source.indexOf('className={cn("hidden rounded-2xl border border-[#CFE0F8] bg-[#EEF6FF]');
  const rowEnd = source.indexOf("{status === \"saved\" ? (", rowStart);
  const row = source.slice(rowStart, rowEnd);

  assert.match(row, /px-4 py-2\.5/);
  assert.match(row, /flex min-w-0 items-center gap-3/);
  assert.match(row, /h-8 w-8 shrink-0/);
  assert.match(row, /relative inline-flex h-7 w-12/);
  assert.match(row, /compactDesktop && "sm:inline-flex sm:h-8 sm:items-center sm:rounded-lg sm:border-\[#9299A9\] sm:bg-transparent sm:px-3 sm:py-0 sm:shadow-none"/);
  assert.match(row, /compactDesktop && "sm:h-\[18px\] sm:w-8"/);
});



test("desktop Hotel Track Price surface matches Flight alert colors", () => {
  const rowStart = source.indexOf(
    'className={cn("hidden rounded-2xl border border-[#CFE0F8] bg-[#EEF6FF]',
  );
  const rowEnd = source.indexOf("{status === \"saved\" ? (", rowStart);
  const row = source.slice(rowStart, rowEnd);

  assert.notEqual(rowStart, -1);
  assert.match(row, /border-\[#CFE0F8\]/);
  assert.match(row, /bg-\[#EEF6FF\]/);
  assert.match(
    row,
    /shadow-\[0_10px_26px_-24px_rgba\(15,23,42,0\.45\)\]/,
  );
});
