import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
);
const routeSource = readFileSync(
  new URL("../../../app/cars/details/[id]/page.tsx", import.meta.url),
  "utf8",
);
const flightSource = readFileSync(
  new URL("../FlightDetailsClient.tsx", import.meta.url),
  "utf8",
);
const hotelSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

const mainWrapper = '<main className="flex-1 bg-surface-muted/40">';
const whiteSection = '<section className="border-b border-border bg-white">';
const successfulSection =
  '<section className="border-b border-border bg-white lg:pb-14">';

function assertOrdered(source: string, parts: string[]) {
  let previous = -1;
  for (const part of parts) {
    const current = source.indexOf(part);
    assert.ok(current > previous, `${part} follows the preceding wrapper`);
    previous = current;
  }
}

function assertNoForbiddenBackgroundTreatments(wrapper: string) {
  for (const treatment of [
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
    assert.doesNotMatch(wrapper, new RegExp(treatment));
  }
}

test("reference details pages retain the shared background architecture", () => {
  for (const source of [flightSource, hotelSource]) {
    assert.match(source, /<main className="flex-1 bg-surface-muted\/40">/);
    assert.match(source, /border-b border-border bg-white/);
  }
});

test("successful Cars Details uses a full-width white section inside the muted main", () => {
  assertOrdered(clientSource, [
    mainWrapper,
    successfulSection,
    '<div className="page-shell py-5 sm:py-7">',
  ]);
  assert.doesNotMatch(
    clientSource,
    /<main className="[^"]*lg:pb-14[^"]*">/,
  );
  assert.doesNotMatch(clientSource, /flex-1 bg-\[#f6f8fb\] lg:pb-14/);
  assert.match(clientSource, /page-shell py-5 sm:py-7/);
  assertNoForbiddenBackgroundTreatments(
    clientSource.slice(
      clientSource.indexOf(mainWrapper),
      clientSource.indexOf('<div className="page-shell py-5 sm:py-7">'),
    ),
  );
});

test("successful Cars Details retains layout, content, and price contracts", () => {
  for (const contract of [
    "DetailsBackLink",
    "resultsHref",
    "CarDetailsHero",
    "BookingSummary",
    "primaryOffer",
    "lg:grid-cols-[minmax(0,1fr)_320px]",
    "xl:grid-cols-[minmax(0,1fr)_340px]",
    "lg:sticky",
    "lg:top-24",
    "offer.pricePerDay",
    "offer.totalPrice",
    "offer.currency",
    "formatDisplayPrice",
    "daily.formatted",
    "total.formatted",
    "daily.title",
    "total.title",
    "daily.ariaLabel",
    "total.ariaLabel",
    'dir="ltr"',
  ]) {
    assert.ok(clientSource.includes(contract), `${contract} remains present`);
  }
});

test("unavailable Cars Details uses the same edge-to-edge white architecture", () => {
  assertOrdered(routeSource, [
    mainWrapper,
    whiteSection,
    '<div className="page-shell py-20">',
  ]);
  assert.doesNotMatch(routeSource, /flex-1 bg-\[#f6f8fb\] py-20/);
  assertNoForbiddenBackgroundTreatments(
    routeSource.slice(
      routeSource.indexOf(mainWrapper),
      routeSource.indexOf('<div className="page-shell py-20">'),
    ),
  );
});

test("unavailable content and route behavior contracts remain present", () => {
  for (const contract of [
    'role="status"',
    "max-w-xl",
    "rounded-xl",
    "border-slate-200",
    "bg-white",
    "p-10",
    "Car unavailable",
    "This vehicle cannot be displayed for the current search.",
    "Back to Cars results",
    "resultsHref",
    "getCarDetails",
    "CarDetailsClient",
    "AppHeader",
    "Footer",
    "pickupLocation",
    "dropoffLocation",
    "pickupDate",
    "pickupTime",
    "dropoffDate",
    "dropoffTime",
    "driverAge",
  ]) {
    assert.ok(routeSource.includes(contract), `${contract} remains present`);
  }
});
