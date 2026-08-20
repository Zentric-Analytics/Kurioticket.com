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
const pageSource = readFileSync(
  new URL("../../../app/hotels/details/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("renders the approved standalone section order", () => {
  const contracts = [
    "<HotelDetailsGallery",
    "data-hotel-amenities-strip",
    "hotel-about-heading",
    "<HotelLocationSection",
    "<RelatedHotelsSection",
  ];
  let previous = -1;
  for (const contract of contracts) {
    const index = source.indexOf(contract);
    assert.ok(index > previous, contract);
    previous = index;
  }
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_334px\]/);
  const mainGridEnd = source.indexOf("</div>\n\n      <RelatedHotelsSection");
  assert.ok(mainGridEnd > source.indexOf("data-standalone-stay-summary"));
  assert.match(source, /data-standalone-hotel-main-grid/);
  assert.match(source, /data-standalone-stay-summary/);
});

test("standalone route hides travel navigation without changing AppHeader defaults", () => {
  const headerCall = pageSource.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(headerCall, /hideDesktopTravelNav/);
  assert.match(headerCall, /hideMobileCategoryTabs/);
  assert.doesNotMatch(headerCall, /compactDesktopNav/);
});

test("removes standalone promotional surfaces and normalizes stay-card flow", () => {
  const stayAside =
    source.match(
      /<aside className="([^"]+)" data-standalone-stay-summary>/,
    )?.[1] ?? "";
  assert.ok(stayAside);
  assert.doesNotMatch(
    stayAside,
    /(?:^|\s)(?:sticky|fixed|lg:sticky|lg:fixed)(?:\s|$)/,
  );
  for (const removed of [
    "Property highlight",
    "recommendationReasons",
    "Secure Kurioticket experience",
    "Planning estimates",
    "No payment collected",
    "planningTitle",
    "planningBody",
    "paymentTitle",
    "paymentBody",
    "LockKeyhole",
    "ShieldCheck",
  ])
    assert.doesNotMatch(source, new RegExp(removed));
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
    'event.key !== "Tab"',
    "roomDialogRef",
    "trigger?.focus()",
    'document.body.style.overflow = "hidden"',
  ])
    assert.ok(source.includes(contract), contract);
});

test("uses public property metadata and truthful data-dependent claims", () => {
  for (const contract of [
    "propertyDetails?.description",
    "propertyDetails={props.propertyDetails}",
    "props.taxesText || props.planningPriceText",
    "props.roomChoices.length",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(
    source,
    /1,248 reviews|Free cancellation|Best price guarantee|Taxes and fees included/,
  );
});

test("stay summary retains all functional data and pricing contracts", () => {
  for (const contract of [
    "props.staySummary.dateText",
    "props.staySummary.nightText",
    "props.staySummary.occupancyText",
    "props.labels.edit",
    "props.estimatedTotalText",
    "props.totalDisplayPrice.formatted",
    "props.nightlyDisplayPrice.formatted",
    "props.taxesText || props.planningPriceText",
    "props.labels.viewRooms",
    "disabled={!props.roomChoices.length}",
  ])
    assert.ok(source.includes(contract), contract);
});

test("standalone pricing and search context are supplied by existing client pipelines", () => {
  for (const contract of [
    "totalDisplayPrice={totalDisplayPrice}",
    "nightlyDisplayPrice={nightlyDisplayPrice}",
    "resultsHref={resultsHref}",
    "staySummary={staySummary}",
    "roomOptions.map",
    "formatDisplayPrice",
    "relatedHotels={relatedHotels}",
  ])
    assert.ok(clientSource.includes(contract), contract);
});
