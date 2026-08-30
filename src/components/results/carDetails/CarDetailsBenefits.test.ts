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

test("source contract keeps getPrimaryCarOffer as the offer source passed to the hero", () => {
  assert.match(
    clientSource,
    /const primaryOffer = suppliedPrimaryOffer \?\? getPrimaryCarOffer\(car\);/,
  );
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
    assert.match(
      clientSource,
      new RegExp(`${key}: copy\\("carDetails\\.${key}"\\)`),
    );
  }
});

test("source contract renders no benefit structure when an offer is absent", () => {
  assert.match(heroSource, /{offer && \( <dl data-car-benefits/);
  assert.doesNotMatch(
    heroSource,
    /offer\?\.(freeCancellation|taxesAndFeesIncluded)/,
  );
});

test("source contract places two separate semantic cards beneath amenities", () => {
  const amenities = heroSource.indexOf('<ul className="grid grid-cols-2');
  const benefits = heroSource.indexOf("<dl data-car-benefits");
  assert.ok(
    amenities >= 0 && benefits > amenities,
    "benefits follow amenities",
  );

  const benefitSource = sourceBetween(
    heroSource,
    "<dl data-car-benefits",
    "</dl>",
  );
  assert.equal(
    benefitSource.match(
      /<div className="flex min-w-0 items-center gap-2\.5 rounded-\[10px\] bg-slate-50 p-3 sm:gap-3 sm:border sm:border-slate-200">/g,
    )?.length,
    2,
  );
  assert.equal(benefitSource.match(/<dt /g)?.length, 2);
  assert.equal(benefitSource.match(/<dd /g)?.length, 2);
  assert.match(benefitSource, /grid grid-cols-2 gap-2\.5 sm:gap-3/);
  assert.doesNotMatch(benefitSource, /h-\[|min-h-|max-h-|overflow-x/);
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

test("standalone details place the model actions before the image and expose three keyboard tabs", () => {
  const title = clientSource.indexOf("data-car-details-actions");
  const hero = clientSource.indexOf("<CarDetailsHero", title);
  assert.ok(title >= 0 && hero > title);
  assert.match(clientSource, /useSavedCar\(car\.id\)/);
  assert.match(clientSource, /navigator\.share/);
  assert.match(clientSource, /<CarDetailsSectionNav activeTab={activeTab}/);

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  ).replace(/\s+/g, " ");
  for (const label of ["Compare prices", "Pickup & return", "Location"]) {
    assert.match(navSource, new RegExp(label.replace("&", "&")));
  }
  assert.match(navSource, /role="tablist"/);
  assert.match(navSource, /ArrowLeft/);
  assert.match(navSource, /ArrowRight/);
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
