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
const gallerySource = readFileSync(
  new URL("./HotelDetailsGallery.tsx", import.meta.url),
  "utf8",
);

test("renders the approved standalone section order", () => {
  const contracts = [
    "<HotelDetailsGallery",
    "data-hotel-amenities-strip",
    "hotel-about-heading",
    "data-hotel-review-summary",
    "<HotelLocationSection",
    "data-hotel-rate-section",
    "<RelatedHotelsSection",
  ];
  let previous = -1;
  for (const contract of contracts) {
    const index = source.indexOf(contract);
    assert.ok(index > previous, contract);
    previous = index;
  }
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_334px\]/);
  const mainGridEnd = source.indexOf("data-mobile-hotel-stay-dock");
  assert.ok(mainGridEnd > source.indexOf("data-standalone-stay-summary"));
  assert.match(source, /data-standalone-hotel-main-grid/);
  assert.match(source, /data-standalone-stay-summary/);
});

test("mobile gallery uses a truthful hero, controls, counter, and five-slot thumbnail strip while desktop keeps mosaic", () => {
  for (const contract of [
    "data-hotel-mobile-thumbnail-strip",
    "activePosition} / {usableIndices.length",
    "mobileThumbnailIndices = usableIndices.slice(0, 5)",
    "mobileRemainingCount",
    "onPrevious",
    "onNext",
    "lg:hidden",
    "hidden h-[300px]",
    "lg:grid",
  ]) assert.ok(gallerySource.includes(contract), contract);
  assert.doesNotMatch(gallerySource, /1 \/ 29|\+25/);
});

test("mobile stay dock is fixed once, owns the safe area, and preserves desktop stay summary", () => {
  assert.equal(source.match(/data-mobile-hotel-stay-dock/g)?.length, 1);
  assert.match(source, /fixed inset-x-0 bottom-0/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /pb-\[calc\(8\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /hidden min-w-0 self-start lg:block/);
  for (const contract of ["props.staySummary.nightText", "props.staySummary.dateText", "props.staySummary.occupancyText", "props.totalDisplayPrice.formatted", "props.nightlyDisplayPrice.formatted"]) assert.ok(source.includes(contract), contract);
});

test("review and rate modules remain truthful and do not manufacture blueprint claims", () => {
  for (const contract of ["props.reviewScore", "props.reviewLabel", "props.reviewCountText", "props.labels.reviewUnavailable", "props.labels.planningEstimate", "props.planningPriceText", 'props.perNightText.replace("{{price}}", props.nightlyDisplayPrice.formatted)']) assert.ok(source.includes(contract), contract);
  assert.match(clientSource, /reviewScale === 5 \? ` \/ \$\{reviewScale\}` : ""/);
  assert.doesNotMatch(source, /Booking\.com|Expedia|Hotels\.com|100\+ sites|Cleanliness|Emily R\.|Free cancellation/);
});

test("standalone route hides travel navigation without changing AppHeader defaults", () => {
  const headerCall = pageSource.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(headerCall, /hideDesktopTravelNav/);
  assert.match(headerCall, /hideMobileCategoryTabs/);
  assert.doesNotMatch(headerCall, /compactDesktopNav/);
});

test("standalone mobile surface is full bleed while its content and desktop shell stay padded", () => {
  for (const contract of [
    'max-w-[1400px] px-0 lg:px-7',
    'data-hotel-details-page-shell',
    'px-4 lg:px-0',
    'mx-4 mt-3',
    'mx-4 mt-4',
  ]) assert.ok(clientSource.includes(contract) || source.includes(contract), contract);
  assert.doesNotMatch(clientSource, /max-w-\[1400px\] px-4 sm:px-6 lg:px-7/);
});

test("hotel details route keeps AppHeader and omits the global Footer", () => {
  assert.match(pageSource, /import \{ AppHeader \}/);
  assert.match(pageSource, /<AppHeader/);
  assert.doesNotMatch(pageSource, /import \{ Footer \}|<Footer\s*\/>/);
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
