import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const heroSource = readFileSync(
  new URL("./CarDetailsHero.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

function sourceBetween(source: string, startText: string, endText: string) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert.notEqual(start, -1, `${startText} exists`);
  assert.notEqual(end, -1, `${endText} follows ${startText}`);
  return source.slice(start, end);
}

test("source contract keeps getPrimaryCarOffer as the authoritative pricing offer", () => {
  assert.match(
    clientSource,
    /const primaryOffer = suppliedPrimaryOffer \?\? getPrimaryCarOffer\(car\);/,
  );
  assert.doesNotMatch(clientSource, /car\.offers\[0\]/);
});

test("hero omits the duplicate cancellation and taxes benefit cards", () => {
  assert.doesNotMatch(clientSource, /<CarDetailsHero car={car} offer=/);
  for (const removedContract of [
    "data-car-benefits",
    "ReceiptText",
    "ShieldCheck",
    "offer.freeCancellation",
    "offer.taxesAndFeesIncluded",
  ]) {
    assert.ok(
      !heroSource.includes(removedContract),
      `unexpected ${removedContract}`,
    );
  }
});

test("source contract keeps only pricing and the provider CTA in BookingSummary", () => {
  const summary = clientSource.slice(
    clientSource.indexOf("function BookingSummary"),
  );
  for (const key of [
    "carDetails.cancellation",
    "carDetails.taxesFees",
    "carsResults.rentalCompany",
    "carsResults.bookingProvider",
    "carDetails.payment",
  ]) {
    assert.doesNotMatch(summary, new RegExp(key.replace(".", "\\.")));
  }
  assert.doesNotMatch(summary, /<Term|<dl/);
  assert.match(summary, /offer\.totalPrice/);
  assert.match(summary, /offer\.pricePerDay/);
  assert.match(summary, /carDetails\.bookingSummary/);
  assert.match(summary, /carDetails\.day/);
  assert.match(summary, /carsResults\.perDay/);
  assert.match(
    summary,
    /<button disabled className="mt-5 w-full rounded-lg bg-teal-dark px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" > {action.label} <\/button>/,
  );
  assert.doesNotMatch(clientSource, /function Term|<Term|<dl/);
});

test("source contract uses a desktop summary and a mobile safe-area booking dock", () => {
  assert.match(clientSource, /function MobileBookingDock|<MobileBookingDock/);
  assert.match(clientSource, /fixed inset-x-0 bottom-0/);
  assert.match(clientSource, /safe-area-inset-bottom/);
  assert.match(clientSource, /data-mobile-car-booking-dock/);
  assert.match(clientSource, /<main className="flex-1 bg-white pb-/);

  const summaryRenders = clientSource.match(/<BookingSummary\b/g) ?? [];
  assert.equal(summaryRenders.length, 1);
  assert.match(clientSource, /hidden self-start lg:sticky lg:top-24 lg:block/);
  assert.match(
    clientSource,
    /grid items-start gap-5 lg:grid-cols-\[minmax\(0,1fr\)_320px\].*xl:grid-cols-\[minmax\(0,1fr\)_340px\]/,
  );

  const summary = clientSource.slice(
    clientSource.indexOf("function BookingSummary"),
  );
  const summaryCard = summary.match(/return \( <div className="([^"]+)"/)?.[1];
  assert.ok(summaryCard, "BookingSummary card classes exist");
  assert.match(summaryCard, /\bw-full\b/);
  assert.doesNotMatch(
    summaryCard,
    /\bsticky\b|\btop-24\b|\bfixed\b|\bbottom-0\b/,
  );

  const hero = clientSource.indexOf("<CarDetailsHero");
  const pickupReturn = clientSource.indexOf("pickupSection", hero);
  const responsiveSummary = clientSource.indexOf("<BookingSummary");
  assert.ok(
    hero >= 0 && pickupReturn > hero && responsiveSummary > pickupReturn,
  );
});

test("standalone details separate mobile model actions from the image while retaining the desktop overlay", () => {
  const title = clientSource.indexOf("data-car-details-actions");
  const hero = clientSource.indexOf("<CarDetailsHero");
  assert.ok(hero >= 0 && title > hero);
  assert.match(heroSource, /data-car-details-mobile-header/);
  assert.match(heroSource, /px-4 pb-3 md:hidden/);
  assert.match(heroSource, /absolute inset-x-0 top-0 z-10 hidden bg-gradient-to-b/);
  assert.match(heroSource, /md:block/);
  assert.match(heroSource, /{overlay}/);
  assert.match(clientSource, /useSavedCar\(car\.id\)/);
  assert.match(clientSource, /navigator\.share/);
  assert.match(clientSource, /<CarDetailsSectionNav activeTab={activeTab}/);

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  ).replace(/\s+/g, " ");
  for (const label of ["compare", "pickup", "location"]) {
    assert.match(navSource, new RegExp(`label: labels\\.${label}`));
  }
  assert.match(navSource, /role="tablist"/);
  assert.match(navSource, /ArrowLeft/);
  assert.match(navSource, /ArrowRight/);
  for (const panel of ["compare", "pickup", "location"]) {
    assert.match(clientSource, new RegExp(`id="car-${panel}-panel"`));
    assert.match(clientSource, new RegExp(`hidden={activeTab !== "${panel}"}`));
  }
});

test("price comparison aligns icon benefits and the per-day price on one row", () => {
  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparison",
    "function CarLocationSection",
  );
  for (const icon of ["ShieldCheck", "Fuel", "Gauge"]) {
    assert.match(comparison, new RegExp(`Icon: ${icon}`));
  }
  assert.match(comparison, /flex min-w-0 flex-nowrap items-end gap-x-4/);
  assert.match(comparison, /inline-flex shrink-0 flex-col items-end/);
  assert.match(comparison, /carsResults\.perDay/);
  assert.match(comparison, /carsResults\.fullToFull/);
  assert.doesNotMatch(comparison, /border-t border-slate-100/);
  assert.doesNotMatch(comparison, /feesIncludedShort/);
  assert.doesNotMatch(comparison, /row-start-4/);
});

test("source contract keeps desktop and mobile provider CTAs disabled, inert, teal, and localized", () => {
  const buttons =
    clientSource.match(
      /<button disabled className="[^"]+" > {action.label} <\/button>/g,
    ) ?? [];
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.match(button, /bg-teal-dark/);
    assert.match(button, /text-white/);
    assert.match(button, /disabled:opacity-60/);
    assert.doesNotMatch(button, /bg-slate-200|text-slate-600/);
    assert.doesNotMatch(button, /href|onClick|bookingUrl/);
  }
});

test("source contract does not restore removed booking-disabled messaging", () => {
  assert.doesNotMatch(
    clientSource,
    /demo-booking-note|carDetails\.bookingUnavailable|carDetails\.bookingDisabledExplanation/,
  );
});
