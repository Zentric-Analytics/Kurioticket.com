import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync("src/components/results/CarDetailsClient.tsx", "utf8");
const heroSource = readFileSync("src/components/results/carDetails/CarDetailsHero.tsx", "utf8");
const englishSource = readFileSync("src/lib/i18n/en.ts", "utf8");
const bookingSummarySource = clientSource.slice(clientSource.indexOf("function BookingSummary"), clientSource.indexOf("function MobileBar"));
const mobileBarSource = clientSource.slice(clientSource.indexOf("function MobileBar"));

test("source contract maps both offer states to the required localized benefit values", () => {
  assert.match(heroSource, /offer\.taxesAndFeesIncluded \? text\.included : text\.notIncluded/);
  assert.match(heroSource, /offer\.freeCancellation \? text\.freeCancellation : text\.nonRefundable/);
  assert.match(heroSource, /label: text\.taxesFees/);
  assert.match(heroSource, /label: text\.cancellation/);
});

test("source contract returns no benefit items without an offer", () => {
  assert.match(heroSource, /if \(!offer\) return \[\]/);
});

test("source contract keeps primary selection and renders two independent hero cards", () => {
  assert.match(clientSource, /const primaryOffer = getPrimaryCarOffer\(car\)/);
  assert.match(clientSource, /<CarDetailsHero car=\{car\} offer=\{primaryOffer\} text=\{text\} \/>/);
  assert.match(heroSource, /<dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">/);
  assert.match(heroSource, /benefits\.map\(\(benefit\) =>/);
  assert.match(heroSource, /<div key=\{benefit\.key\} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">/);
  assert.match(heroSource, /<dt className=/);
  assert.match(heroSource, /<dd className=/);
});

test("booking summary removes benefits while retaining payment and current desktop CTA", () => {
  assert.doesNotMatch(bookingSummarySource, /carDetails\.cancellation|carDetails\.taxesFees/);
  assert.match(bookingSummarySource, /carDetails\.payment/);
  assert.match(bookingSummarySource, /<button disabled/);
  assert.match(bookingSummarySource, /copy\("continueToProvider"\)/);
  assert.doesNotMatch(bookingSummarySource, /onClick|href|bookingUrl|aria-describedby/);
});

test("mobile CTA remains disabled, non-functional, and unchanged in purpose", () => {
  const mobileCta = mobileBarSource.match(/<button disabled[^>]*>\{copy\("continueToProvider"\)\}<\/button>/)?.[0];
  assert.ok(mobileCta);
  assert.doesNotMatch(mobileCta, /onClick|href|bookingUrl|redirect|aria-label/);
});

test("removed booking-disabled copy is not reintroduced", () => {
  for (const source of [clientSource, englishSource]) {
    assert.doesNotMatch(source, /demo-booking-note|carDetails\.bookingUnavailable|carDetails\.bookingDisabledExplanation/);
  }
});
