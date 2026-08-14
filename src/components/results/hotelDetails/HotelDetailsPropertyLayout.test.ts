import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);
const gallerySource = readFileSync(
  new URL("./HotelDetailsGallery.tsx", import.meta.url),
  "utf8",
);
const bookingSource = readFileSync(
  new URL("./HotelDetailsBookingPanel.tsx", import.meta.url),
  "utf8",
);

test("joins one embedded gallery and details summary before the booking sibling", () => {
  assert.equal(clientSource.match(/<HotelDetailsGallery\b/g)?.length, 1);
  assert.equal(clientSource.match(/<HotelDetailsSections\b/g)?.length, 1);
  assert.equal(clientSource.match(/<HotelDetailsBookingPanel\b/g)?.length, 1);
  assert.match(clientSource, /import { Card } from "@\/components\/ui\/Card"/);
  assert.match(
    clientSource,
    /lg:grid-cols-\[minmax\(0,1fr\)_360px\] lg:items-start lg:gap-8/,
  );
  const propertyCard = clientSource.slice(
    clientSource.indexOf('<Card\n              variant="flat"'),
    clientSource.indexOf("<HotelDetailsBookingPanel"),
  );
  assert.ok(propertyCard.indexOf("<HotelDetailsGallery") >= 0);
  assert.ok(
    propertyCard.indexOf("<HotelDetailsSections") >
      propertyCard.indexOf("<HotelDetailsGallery"),
  );
  assert.equal(propertyCard.match(/\bembedded\b/g)?.length, 2);
  assert.match(
    propertyCard,
    /shadow-\[0_12px_32px_-26px_rgba\(2,28,43,0\.32\)\]/,
  );
});

test("retains every booking integration prop and booking-panel contract", () => {
  const bookingCall = clientSource.slice(
    clientSource.indexOf("<HotelDetailsBookingPanel"),
    clientSource.indexOf(
      "/>",
      clientSource.indexOf("<HotelDetailsBookingPanel"),
    ) + 2,
  );
  for (const contract of [
    "priceDetailsAvailable={Boolean(priceDetails)}",
    "totalDisplayPrice={totalDisplayPrice}",
    "nightlyDisplayPrice={nightlyDisplayPrice}",
    "estimatedStayTotalText=",
    "pricePerNightText=",
    "taxesText={taxesText}",
    "priceUnavailableText=",
    "liveRateUnavailableText=",
    "staySummary={staySummary}",
    "changeSearchHref={resultsHref}",
    "changeSearchText=",
    "providerPriceLabel=",
    "providerText=",
    "redirectError={redirectError}",
    "providerEnabled={providerEnabled}",
    "redirecting={redirecting}",
    "continueToProviderText=",
    "onContinue={continueToProvider}",
    "providerDisclaimerText=",
  ])
    assert.ok(bookingCall.includes(contract), contract);

  assert.match(
    bookingCall,
    /providerUnavailableText=\{\s*mode === "guided" \? "" : providerUnavailableText\s*\}/,
  );

  for (const contract of [
    "totalDisplayPrice.formatted",
    "nightlyDisplayPrice.formatted",
    "totalDisplayPrice.providerFormatted",
    "totalDisplayPrice.ariaLabel",
    "nightlyDisplayPrice.ariaLabel",
    "staySummary.dateText",
    "staySummary.nightText",
    "staySummary.occupancyText",
    "changeSearchHref",
    "providerUnavailableText",
    "redirectError",
    "providerEnabled ?",
    "disabled={redirecting}",
    "onClick={onContinue}",
    "lg:sticky",
    "lg:top-24",
  ])
    assert.ok(bookingSource.includes(contract), contract);
});

test("gallery embedded mode shares one JSX body and preserves interactions", () => {
  assert.match(gallerySource, /embedded\?: boolean/);
  assert.match(gallerySource, /embedded = false/);
  assert.match(gallerySource, /const content = \(/);
  assert.match(gallerySource, /if \(embedded\)/);
  assert.equal(gallerySource.match(/<Card\b/g)?.length, 1);
  assert.equal(gallerySource.match(/aspect-\[4\/3\]/g)?.length, 1);
  for (const contract of [
    "onKeyDown={handleGalleryKeyDown}",
    "border-t border-border",
    "aria-pressed={activeIndex === imageIndex}",
    "HotelDetailsGalleryDialog",
    "photoPositionAnnouncement",
    "handlePointerUp",
    "previousPhotoLabel",
    "nextPhotoLabel",
  ])
    assert.ok(gallerySource.includes(contract), contract);
});
