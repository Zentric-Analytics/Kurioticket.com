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

test("source contract removes benefits but preserves Payment in BookingSummary", () => {
  const summary = sourceBetween(
    clientSource,
    "function BookingSummary",
    "function MobileBar",
  );
  assert.doesNotMatch(summary, /carDetails\.cancellation/);
  assert.doesNotMatch(summary, /carDetails\.taxesFees/);
  assert.match(summary, /carDetails\.payment/);
  assert.match(summary, /carsResults\.rentalCompany/);
  assert.match(summary, /carsResults\.bookingProvider/);
});

test("source contract keeps both provider CTAs disabled, inert, teal, and localized", () => {
  const buttons = clientSource.match(/<button disabled className="[^"]+">{copy\("continueToProvider"\)}<\/button>/g) ?? [];
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
