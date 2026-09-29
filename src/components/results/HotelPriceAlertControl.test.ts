import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelPriceAlertControl.tsx", import.meta.url),
  "utf8",
);

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

test("web Hotel Price Alert compact row matches the native 48px toggle presentation", () => {
  assert.match(source, /min-h-12/);
  assert.match(source, /h-\[17px\] w-\[17px\]/);
  assert.match(source, /text-\[12\.5px\] font-bold leading-4/);
  assert.match(source, /role="switch"/);
});


test("desktop Hotel Results price-alert row omits only the subtitle", () => {
  const rowStart = source.indexOf('className="hidden rounded-2xl border border-blue-100');
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
  const rowStart = source.indexOf('className="hidden rounded-2xl border border-blue-100');
  const rowEnd = source.indexOf("{status === \"saved\" ? (", rowStart);
  const row = source.slice(rowStart, rowEnd);

  assert.match(row, /px-4 py-2\.5/);
  assert.match(row, /flex min-w-0 items-center gap-3/);
  assert.match(row, /h-8 w-8 shrink-0/);
  assert.match(row, /relative inline-flex h-7 w-12/);
});


test("desktop Hotel Results price-alert card uses the mobile-web alert surface", () => {
  const rowStart = source.indexOf('className="hidden rounded-2xl border border-blue-100');
  const openingTagEnd = source.indexOf(">", rowStart);
  const openingTag = source.slice(rowStart, openingTagEnd);

  assert.match(openingTag, /bg-\[#F0F5FC\]/);
  assert.doesNotMatch(openingTag, /bg-white/);
});
