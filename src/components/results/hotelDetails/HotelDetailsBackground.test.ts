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

const mainClass = 'className="flex-1 bg-surface-muted/40"';
const whiteSection =
  '<section className="border-b border-border bg-white">';
const pageShell =
  '<div className="page-shell py-6 sm:py-8 lg:py-10">';
const directPageShellSection =
  '<section className="page-shell py-6 sm:py-8 lg:py-10">';

function assertBackgroundHierarchy(source: string) {
  const mainIndex = source.indexOf(mainClass);
  const sectionIndex = source.indexOf(whiteSection, mainIndex);
  const shellIndex = source.indexOf(pageShell, sectionIndex);

  assert.ok(mainIndex >= 0, "retains the muted main background");
  assert.ok(sectionIndex > mainIndex, "the white section is inside the main");
  assert.ok(shellIndex > sectionIndex, "the page shell is inside the white section");
  assert.equal(source.includes(directPageShellSection), false);

  const wrapperOpening = source.slice(sectionIndex, shellIndex + pageShell.length);
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

test("uses the successful Flights Details background as the reference", () => {
  assert.ok(flightClientSource.includes(mainClass));
  assert.ok(flightClientSource.includes(whiteSection));
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
  assert.equal(
    hotelStatesSource.match(/flex-1 bg-surface-muted\/40/g)?.length,
    2,
  );
  assert.equal(hotelStatesSource.split(whiteSection).length - 1, 2);
  assert.equal(hotelStatesSource.split(pageShell).length - 1, 2);

  const loadingSource = hotelStatesSource.slice(
    hotelStatesSource.indexOf("export function HotelDetailsLoadingState"),
    hotelStatesSource.indexOf("type HotelDetailsUnavailableStateProps"),
  );
  assertBackgroundHierarchy(loadingSource);

  const unavailableSource = hotelStatesSource.slice(
    hotelStatesSource.indexOf("export function HotelDetailsUnavailableState"),
  );
  assertBackgroundHierarchy(unavailableSource);

  for (const contract of [
    'aria-busy="true"',
    'role="status"',
    'aria-live="polite"',
    "HotelDetailsLoadingState",
    "SkeletonBlock",
    "lg:grid-cols-[minmax(0,1fr)_360px]",
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
