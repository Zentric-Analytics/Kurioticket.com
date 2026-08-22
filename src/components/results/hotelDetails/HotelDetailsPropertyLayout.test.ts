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
const standaloneSource = readFileSync(
  new URL("./StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const locationSource = readFileSync(
  new URL("./HotelLocationSection.tsx", import.meta.url),
  "utf8",
);

test("isolates the approved standalone property composition from guided mode", () => {
  assert.equal(clientSource.match(/<HotelDetailsGallery\b/g)?.length, 1);
  assert.equal(clientSource.match(/<HotelDetailsSections\b/g)?.length, 1);
  assert.equal(clientSource.match(/<HotelDetailsBookingPanel\b/g)?.length, 1);
  assert.equal(clientSource.match(/<StandaloneHotelDetails\b/g)?.length, 1);
  assert.match(clientSource, /if \(mode === "standalone"\)/);
  assert.match(standaloneSource, /data-standalone-hotel-details/);
  assert.match(standaloneSource, /lg:grid-cols-\[minmax\(0,1fr\)_334px\]/);
  assert.match(standaloneSource, /<HotelDetailsGallery[\s\S]*layout="mosaic"/);
  assert.match(standaloneSource, /data-hotel-amenities-strip/);
  for (const contract of [
    "About this property",
    "propertyDetails?.description",
    "HotelLocationSection",
    "Your stay",
    "View room options",
    'role="dialog"',
  ]) assert.ok(clientSource.includes(contract) || standaloneSource.includes(contract), contract);
  assert.match(locationSource, /buildHotelMapEmbedUrl/);
  assert.match(locationSource, /buildHotelDirectionsUrl/);

  const guidedStart = clientSource.indexOf("const detailsContent = (");
  const guidedContent = clientSource.slice(guidedStart);
  assert.match(clientSource, /import { Card } from "@\/components\/ui\/Card"/);
  assert.match(
    guidedContent,
    /lg:grid-cols-\[minmax\(0,1fr\)_360px\] lg:items-start lg:gap-8/,
  );
  assert.ok(guidedContent.indexOf("<HotelDetailsGallery") >= 0);
  assert.ok(
    guidedContent.indexOf("<HotelDetailsSections") >
      guidedContent.indexOf("<HotelDetailsGallery"),
  );
  assert.ok(
    guidedContent.indexOf("<HotelDetailsBookingPanel") >
      guidedContent.indexOf("<HotelDetailsSections"),
  );
});

test("places the guided room selector after the full upper property layout", () => {
  const composition = clientSource.slice(
    clientSource.indexOf("data-hotel-property-booking-layout"),
    clientSource.indexOf(
      "</div>\n    </section>",
      clientSource.indexOf("data-hotel-property-booking-layout"),
    ),
  );

  assert.ok(composition.indexOf("<HotelDetailsBookingPanel") >= 0);
  assert.ok(
    composition.indexOf("{guidedRoomSelector}") >
      composition.indexOf("<HotelDetailsBookingPanel"),
  );
  assert.match(
    clientSource,
    /const guidedRoomSelector =\s*mode === "guided" \? \(\s*<fieldset/,
  );
  assert.equal(clientSource.match(/<fieldset\b/g)?.length, 1);
  assert.equal(clientSource.match(/<GuidedHotelRoomCard\b/g)?.length, 1);
});

test("places the room grid directly after the guided room legend", () => {
  const selectorStart = clientSource.indexOf("data-guided-room-selector");
  const legendStart = clientSource.indexOf("<legend", selectorStart);
  const gridStart = clientSource.indexOf("data-guided-room-grid", legendStart);
  const legendToGrid = clientSource.slice(legendStart, gridStart);

  assert.match(legendToGrid, /deals\.guided\.hotelDetails\.chooseRoom/);
  assert.doesNotMatch(legendToGrid, /<p\b/);
  assert.doesNotMatch(
    clientSource,
    /deals\.guided\.hotelDetails\.planningDisclosure/,
  );
});

test("uses a non-scrolling one, two, then three-column guided room grid", () => {
  const roomGridStart = clientSource.lastIndexOf(
    "<div",
    clientSource.indexOf("data-guided-room-grid"),
  );
  const roomGrid = clientSource.slice(
    roomGridStart,
    clientSource.indexOf("{roomOptions.map", roomGridStart),
  );

  assert.match(roomGrid, /grid-cols-1/);
  assert.match(roomGrid, /md:grid-cols-2/);
  assert.match(roomGrid, /xl:grid-cols-3/);
  assert.doesNotMatch(roomGrid, /overflow-x|snap-|flex-nowrap/);
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
