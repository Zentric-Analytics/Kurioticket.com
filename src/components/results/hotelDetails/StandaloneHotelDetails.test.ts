import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("renders the approved standalone section order", () => {
  const contracts = [
    "<HotelDetailsGallery",
    "data-hotel-amenities-strip",
    "Property highlight",
    "hotel-about-heading",
    "hotel-location-heading",
  ];
  let previous = -1;
  for (const contract of contracts) {
    const index = source.indexOf(contract);
    assert.ok(index > previous, contract);
    previous = index;
  }
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_334px\]/);
  assert.match(source, /lg:sticky lg:top-24/);
});

test("keeps save, share, gallery, amenity and description controls accessible", () => {
  for (const contract of [
    "aria-pressed={props.isSaved}",
    "navigator.share",
    "navigator.clipboard.writeText",
    "aria-expanded={amenitiesExpanded}",
    "aria-expanded={descriptionExpanded}",
    'role="dialog"',
    'aria-modal="true"',
    'event.key === "Escape"',
  ]) assert.ok(source.includes(contract), contract);
});

test("uses public property metadata and truthful data-dependent claims", () => {
  for (const contract of [
    "propertyDetails?.description",
    "propertyDetails.latitude",
    "propertyDetails.longitude",
    "props.reviewScore ?",
    "props.taxesText || props.planningPriceText",
    "props.roomChoices.length",
  ]) assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(source, /1,248 reviews|Free cancellation|Best price guarantee|Taxes and fees included/);
});

test("standalone pricing and search context are supplied by existing client pipelines", () => {
  for (const contract of [
    "totalDisplayPrice={totalDisplayPrice}",
    "nightlyDisplayPrice={nightlyDisplayPrice}",
    "resultsHref={resultsHref}",
    "staySummary={staySummary}",
    "roomOptions.map",
    "formatDisplayPrice",
  ]) assert.ok(clientSource.includes(contract), contract);
});
