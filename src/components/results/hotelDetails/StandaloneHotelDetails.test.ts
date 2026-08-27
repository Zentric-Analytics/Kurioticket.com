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
    "data-hotel-mobile-gallery-unit",
    "mx-3 lg:hidden",
  ])
    assert.ok(gallerySource.includes(contract), contract);
  assert.doesNotMatch(gallerySource, /1 \/ 29|\+25/);
});

test("mobile header owns stay metadata while the two-column dock owns price and CTA", () => {
  assert.equal(source.match(/data-mobile-hotel-stay-dock/g)?.length, 1);
  assert.match(source, /fixed inset-x-0 bottom-0/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /pb-\[calc\(8\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /hidden min-w-0 self-start lg:block/);
  const header = source.slice(
    source.indexOf("data-mobile-property-header"),
    source.indexOf("<HotelDetailsGallery"),
  );
  const dock = source.slice(
    source.indexOf("data-mobile-hotel-stay-dock"),
    source.indexOf("<RelatedHotelsSection"),
  );
  const aside = source.slice(
    source.indexOf("data-standalone-stay-summary"),
    source.indexOf("data-mobile-hotel-stay-dock"),
  );
  for (const contract of [
    "data-mobile-hotel-stay-dates",
    "data-mobile-hotel-stay-guests",
    "props.staySummary.nightText",
    "props.staySummary.dateText",
    "props.staySummary.occupancyText",
  ])
    assert.ok(header.includes(contract), contract);
  for (const contract of [
    "props.totalDisplayPrice.formatted",
    "props.nightlyDisplayPrice.formatted",
    "props.labels.viewRooms",
    "grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)]",
  ])
    assert.ok(dock.includes(contract), contract);
  for (const removed of [
    "props.staySummary.nightText",
    "props.staySummary.dateText",
    "props.staySummary.occupancyText",
    "CalendarDays",
    "<Users",
  ])
    assert.ok(!dock.includes(removed), removed);
  for (const contract of [
    "props.staySummary.nightText",
    "props.staySummary.dateText",
    "props.staySummary.occupancyText",
  ])
    assert.ok(aside.includes(contract), contract);
});

test("mobile property header renders the canonical identity in the approved order", () => {
  const header = source.slice(
    source.indexOf("data-mobile-hotel-identity"),
    source.indexOf("<HotelDetailsGallery"),
  );
  const orderedContracts = [
    "data-mobile-hotel-stay-dates",
    "data-mobile-hotel-stay-guests",
    "data-mobile-hotel-address-row",
    "data-mobile-hotel-classification-stars",
  ];
  let previous = -1;
  for (const contract of orderedContracts) {
    const index = header.indexOf(contract);
    assert.ok(index > previous, contract);
    previous = index;
  }
  for (const contract of [
    "data-property-header-actions",
    "grid-cols-[minmax(0,1fr)_auto]",
    "min-w-0 break-words",
    "aria-pressed={props.isSaved}",
    'className="hidden lg:inline"',
    "data-mobile-hotel-address-row",
    "buildHotelAddress(props.propertyDetails)",
    "buildHotelDirectionsUrl({",
    "hotelName: props.hotelName",
    "propertyDetails: props.propertyDetails",
    "href={directionsUrl}",
    'target="_blank"',
    'rel="noopener noreferrer"',
    "aria-label={`Show directions to ${props.hotelName}`}",
    "min-w-0 break-words",
    "title={canonicalAddress}",
    "data-mobile-property-metadata",
    "grid-cols-[1rem_minmax(0,1fr)]",
    "data-mobile-hotel-address-icon",
    "data-mobile-hotel-classification-icon",
    "<MapPin",
    "<Award",
    "aria-label={props.starRatingAriaLabel}",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(
    header,
    /Show directions|href=\{directionsUrl\}|grid-cols-\[1rem_minmax\(0,1fr\)_auto\]|<Star\b|min-w-0 flex-1 truncate|\btruncate\b/,
  );
  assert.ok(
    source.indexOf("{props.hotelName}") <
      source.indexOf("data-mobile-hotel-stay-dates"),
  );
  assert.ok(
    source.indexOf("data-mobile-hotel-classification-stars") <
      source.indexOf("<HotelDetailsGallery"),
  );
  assert.doesNotMatch(header, /href="#hotel-location"/);
  assert.doesNotMatch(header, /propertyDetails\.neighbourhood/);
});

test("canonical hotel result name flows directly into the standalone title", () => {
  assert.match(
    clientSource,
    /<StandaloneHotelDetails[\s\S]*?hotelName=\{hotel\.name\}/,
  );
  assert.match(source, /<h1[^>]*>[\s\S]*?\{props\.hotelName\}[\s\S]*?<\/h1>/);
  assert.doesNotMatch(source, /hotelName\.(?:slice|split|replace)|slug|alias/i);
});

test("mobile save and share are independent unboxed 44px actions", () => {
  const actions = source.slice(
    source.indexOf("data-property-header-actions"),
    source.indexOf("</header>"),
  );
  assert.equal(actions.match(/<button/g)?.length, 2);
  assert.match(actions, /size-11/);
  assert.equal(actions.match(/size-11/g)?.length, 2);
  assert.match(actions, /justify-end/);
  assert.match(actions, /justify-start/);
  assert.match(actions, /h-5 w-5/);
  assert.match(actions, /border-0 bg-transparent/);
  assert.match(actions, /aria-pressed=\{props\.isSaved\}/);
  assert.doesNotMatch(
    actions.match(/data-property-header-actions[\s\S]*?>/)?.[0] ?? "",
    /border|bg-white|shadow/,
  );
});

test("standalone hotel navigation locally matches the Flight-style mobile treatment", () => {
  const standalone = clientSource.slice(
    clientSource.indexOf('if (mode === "standalone")'),
    clientSource.indexOf("<StandaloneHotelDetails"),
  );
  assert.match(standalone, /data-standalone-hotel-back-link/);
  assert.match(standalone, /text-\[#075EE8\]/);
  assert.match(standalone, /<ArrowLeft className="h-4 w-4"/);
  assert.match(standalone, /min-h-10 items-center gap-2 text-\[13px\] font-semibold/);
  assert.doesNotMatch(standalone, /<DetailsBackLink/);
  assert.match(standalone, /bg-white sm:bg-\[#f8fafc\]/);
  assert.doesNotMatch(standalone, /border-b border-slate/);
});

test("standalone route hides travel navigation without changing AppHeader defaults", () => {
  const headerCall = pageSource.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(headerCall, /hideDesktopTravelNav/);
  assert.match(headerCall, /hideMobileCategoryTabs/);
  assert.doesNotMatch(headerCall, /compactDesktopNav/);
});

test("hotel details route keeps AppHeader and omits the global Footer", () => {
  assert.match(pageSource, /import \{ AppHeader \}/);
  assert.match(pageSource, /<AppHeader/);
  assert.doesNotMatch(pageSource, /import \{ Footer \}|<Footer\s*\/>/);
});

test("removes standalone promotional surfaces and normalizes stay-card flow", () => {
  const stayAside =
    source.match(
      /<aside\s+className="([^"]+)"\s+data-standalone-stay-summary/,
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

test("room dialog releases its body scroll lock through every close path", () => {
  const modal = source.slice(source.indexOf("{roomsOpen ? ("));
  for (const contract of [
    'event.key === "Escape"',
    "setRoomsOpen(false)",
    "onPointerDown={(event) =>",
    "event.target === event.currentTarget",
    "onClick={() => setRoomsOpen(false)}",
    'document.body.style.overflow = "hidden"',
    "document.body.style.overflow = previousOverflow",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(modal, /onMouseDown=/);
});

test("mobile gesture surfaces preserve vertical document scrolling", () => {
  const dock = source.slice(
    source.indexOf("data-mobile-hotel-stay-dock"),
    source.indexOf("<RelatedHotelsSection"),
  );
  assert.doesNotMatch(
    dock,
    /touch-pan-x|touch-action\s*:\s*(?:none|pan-x)|overscroll-(?:none|contain)/,
  );
  assert.match(gallerySource, /style=\{\{ touchAction: "pan-y" \}\}/);
  assert.doesNotMatch(
    gallerySource.slice(
      gallerySource.indexOf("function handlePointerUp"),
      gallerySource.indexOf("function handleGalleryKeyDown"),
    ),
    /preventDefault/,
  );
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
