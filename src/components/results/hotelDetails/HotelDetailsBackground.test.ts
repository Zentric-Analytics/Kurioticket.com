import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelClientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);
const hotelStatesSource = readFileSync(
  new URL("./HotelDetailsPageStates.tsx", import.meta.url),
  "utf8",
);
const flightClientSource = readFileSync(
  new URL("../FlightDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("keeps Flights Details independently scoped", () => {
  assert.match(flightClientSource, /<main/);
});

test("standalone desktop uses its approved muted canvas while guided details keep their own composition", () => {
  const standalone = hotelClientSource.slice(
    hotelClientSource.indexOf('if (mode === "standalone")'),
    hotelClientSource.indexOf("const detailsContent = ("),
  );
  const mainIndex = standalone.indexOf("<main");
  const shellIndex = standalone.indexOf("data-hotel-details-page-shell");
  const detailsIndex = standalone.indexOf("<StandaloneHotelDetails");
  assert.ok(mainIndex >= 0 && shellIndex > mainIndex && detailsIndex > shellIndex);
  assert.match(standalone, /<main className="[^"]*lg:bg-\[#F7F9FC\]/);
  assert.match(standalone, /w-full/);
  assert.doesNotMatch(standalone.slice(mainIndex, shellIndex), /gradient|shadow-|role="separator"/);

  const guided = hotelClientSource.slice(hotelClientSource.indexOf("const detailsContent = ("));
  for (const contract of [
    "space-y-6 sm:space-y-8 lg:space-y-10",
    "lg:grid-cols-[minmax(0,1fr)_360px]",
    "lg:items-start",
    "lg:gap-8",
    "HotelDetailsHeader",
    "HotelDetailsGallery",
    "HotelDetailsSections",
    "HotelDetailsBookingPanel",
  ]) {
    assert.ok(guided.includes(contract) || hotelClientSource.includes(contract), contract);
  }
  assert.match(guided, /<main className="flex-1 bg-surface-muted\/40"/);
});

test("aligns both Hotel Details page states without changing their contracts", () => {
  assert.equal(hotelStatesSource.match(/flex-1 bg-surface-muted\/40/g)?.length, 1);
  assert.equal(hotelStatesSource.match(/data-hotel-details-state-shell/g)?.length, 2);

  const loadingSource = hotelStatesSource.slice(
    hotelStatesSource.indexOf("export function HotelDetailsLoadingState"),
    hotelStatesSource.indexOf("type HotelDetailsUnavailableStateProps"),
  );
  assert.match(loadingSource, /lg:max-w-\[1080px\] lg:px-\[30px\]/);
  assert.match(loadingSource, /flex-1 bg-white sm:bg-\[#f8fafc\] lg:bg-\[#F7F9FC\]/);

  const unavailableSource = hotelStatesSource.slice(
    hotelStatesSource.indexOf("export function HotelDetailsUnavailableState"),
  );
  assert.match(unavailableSource, /px-0[^"]*lg:px-7/);

  for (const contract of [
    'aria-busy="true"',
    'role="status"',
    'aria-live="polite"',
    "HotelDetailsLoadingState",
    "SkeletonBlock",
    "lg:grid-cols-[minmax(0,1fr)_334px]",
    "lg:sticky",
    "lg:top-24",
    "HotelDetailsUnavailableState",
    "AlertTriangle",
    "max-w-3xl",
    "onRetry",
    "resultsHref",
    "retryText",
    "backToResultsText",
  ]) {
    assert.ok(hotelStatesSource.includes(contract), contract);
  }
});
