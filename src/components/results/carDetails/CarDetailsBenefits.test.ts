import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
);
const heroSource = readFileSync(
  new URL("./CarDetailsHero.tsx", import.meta.url),
  "utf8",
);

function sourceBetween(source: string, startText: string, endText: string) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert.notEqual(start, -1, `${startText} exists`);
  assert.notEqual(end, -1, `${endText} follows ${startText}`);
  return source.slice(start, end);
}

test("source contract keeps getPrimaryCarOffer as the offer source passed to the hero", () => {
  assert.match(clientSource, /const primaryOffer = getPrimaryCarOffer\(car\);/);
  assert.match(
    clientSource,
    /<CarDetailsHero car={car} offer={primaryOffer} text={text} \/>/,
  );
  assert.doesNotMatch(clientSource, /car\.offers\[0\]/);
});

test("source contract maps both positive and negative offer states to localized hero text", () => {
  assert.match(
    heroSource,
    /offer\.freeCancellation \? text\.freeCancellation : text\.nonRefundable/,
  );
  assert.match(
    heroSource,
    /offer\.taxesAndFeesIncluded \? text\.includedShort : text\.notIncluded/,
  );
  for (const key of [
    "cancellation",
    "freeCancellation",
    "nonRefundable",
    "taxesFees",
    "includedShort",
    "notIncluded",
  ]) {
    assert.match(clientSource, new RegExp(`${key}: copy\\("carDetails\\.${key}"\\)`));
  }
});

test("source contract renders no benefit structure when an offer is absent", () => {
  assert.match(heroSource, /{offer && <dl data-car-benefits/);
  assert.doesNotMatch(heroSource, /offer\?\.(freeCancellation|taxesAndFeesIncluded)/);
});

test("source contract places two separate semantic cards beneath amenities", () => {
  const amenities = heroSource.indexOf('<ul className="mt-5 flex flex-wrap gap-2">');
  const benefits = heroSource.indexOf("<dl data-car-benefits");
  assert.ok(amenities >= 0 && benefits > amenities, "benefits follow amenities");

  const benefitSource = sourceBetween(heroSource, "<dl data-car-benefits", "</dl>");
  assert.equal(
    benefitSource.match(/<div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">/g)?.length,
    2,
  );
  assert.equal(benefitSource.match(/<dt /g)?.length, 2);
  assert.equal(benefitSource.match(/<dd /g)?.length, 2);
  assert.match(benefitSource, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.doesNotMatch(benefitSource, /h-\[|min-h-|max-h-|overflow-x/);
});

test("source contract keeps only pricing and the provider CTA in BookingSummary", () => {
  const summary = clientSource.slice(clientSource.indexOf("function BookingSummary"));
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
    /<button disabled className="mt-5 w-full rounded-lg bg-teal-dark px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{copy\("continueToProvider"\)}<\/button>/,
  );
  assert.doesNotMatch(clientSource, /function Term|<Term|<dl/);
});

test("source contract uses one in-flow responsive booking summary", () => {
  assert.doesNotMatch(clientSource, /function MobileBar|<MobileBar/);
  assert.doesNotMatch(clientSource, /fixed inset-x-0 bottom-0|z-30|safe-area-inset-bottom|pb-32/);
  assert.match(clientSource, /<main className="flex-1 bg-surface-muted\/40">/);

  const summaryRenders = clientSource.match(/<BookingSummary\b/g) ?? [];
  assert.equal(summaryRenders.length, 1);
  assert.match(
    clientSource,
    /{primaryOffer && <aside className="self-start lg:sticky lg:top-24"><BookingSummary offer={primaryOffer}/,
  );
  assert.doesNotMatch(clientSource, /<aside className="[^"]*(?:hidden lg:block|\bfixed\b|(?<!lg:)sticky)/);
  assert.match(
    clientSource,
    /grid items-start gap-6 lg:grid-cols-\[minmax\(0,1fr\)_320px\] xl:grid-cols-\[minmax\(0,1fr\)_340px\]/,
  );

  const summary = clientSource.slice(clientSource.indexOf("function BookingSummary"));
  const summaryCard = summary.match(/return <div className="([^"]+)"/)?.[1];
  assert.ok(summaryCard, "BookingSummary card classes exist");
  assert.match(summaryCard, /\bw-full\b/);
  assert.doesNotMatch(summaryCard, /\bsticky\b|\btop-24\b|\bfixed\b|\bbottom-0\b/);

  const hero = clientSource.indexOf("<CarDetailsHero");
  const pickupReturn = clientSource.indexOf('copy("carDetails.pickupReturn")');
  const responsiveSummary = clientSource.indexOf("<BookingSummary");
  assert.ok(hero >= 0 && pickupReturn > hero && responsiveSummary > pickupReturn);
});

test("source contract keeps the single provider CTA disabled, inert, teal, and localized", () => {
  const buttons = clientSource.match(/<button disabled className="[^"]+">{copy\("continueToProvider"\)}<\/button>/g) ?? [];
  assert.equal(buttons.length, 1);
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
