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

const mainClass = 'className="flex-1 bg-[#f8fafc]"';
const whiteSection = '<section className="border-b border-slate-200/70 py-2 sm:py-2 lg:py-2">';
const fullBleedShell = 'className="mx-auto w-full max-w-[1400px] px-0 lg:px-7"';

function assertBackgroundHierarchy(source: string) {
  const mainIndex = source.indexOf(mainClass);
  const sectionIndex = source.indexOf(whiteSection, mainIndex);
  const shellIndex = source.indexOf(fullBleedShell, sectionIndex);

  assert.ok(mainIndex >= 0, "retains the muted main background");
  assert.ok(sectionIndex > mainIndex, "the white section is inside the main");
  assert.ok(shellIndex > sectionIndex, "the full-bleed shell is inside the white section");

  const wrapperOpening = source.slice(sectionIndex, shellIndex + fullBleedShell.length);
  for (const forbidden of [
    "gradient",
    "bg-surface-subtle",
    "bg-slate-50",
    "shadow-",
    "border-t",
    "border-x",
    "border-2",
    "<hr",
    'role="separator"',
  ]) {
    assert.equal(wrapperOpening.includes(forbidden), false, forbidden);
  }
}

test("keeps Flights Details independently scoped", () => {
  assert.match(flightClientSource, /<main/);
});

test("wraps successful Hotel Details content in the full-width white section", () => {
  assertBackgroundHierarchy(hotelClientSource);

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
    assert.ok(hotelClientSource.includes(contract), contract);
  }
});

test("aligns both Hotel Details page states without changing their contracts", () => {
  assert.equal(hotelStatesSource.match(/flex-1 bg-surface-muted\/40/g)?.length, 2);
  assert.equal(hotelStatesSource.match(/data-hotel-details-state-shell/g)?.length, 2);
  assert.equal(hotelStatesSource.match(/max-w-\[1400px\] px-0/g)?.length, 2);

  const loadingSource = hotelStatesSource.slice(
    hotelStatesSource.indexOf("export function HotelDetailsLoadingState"),
    hotelStatesSource.indexOf("type HotelDetailsUnavailableStateProps"),
  );
  assert.match(loadingSource, /px-0[^"]*lg:px-7/);

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
