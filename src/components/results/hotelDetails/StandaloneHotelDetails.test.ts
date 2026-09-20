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
const mapSource = readFileSync(
  new URL("./HotelDetailsGoogleMap.tsx", import.meta.url),
  "utf8",
);

test("mobile gallery uses a full-bleed hero with controls and counter while desktop keeps its mosaic", () => {
  for (const contract of [
    "activePosition} / {usableIndices.length",
    "onPrevious",
    "onNext",
    "lg:hidden",
    "hidden h-[300px]",
    "lg:grid",
    "data-hotel-mobile-gallery-unit",
    "aspect-[6/5]",
    "rounded-none",
  ])
    assert.ok(gallerySource.includes(contract), contract);
  assert.doesNotMatch(gallerySource, /data-hotel-mobile-thumbnail-strip|mobileThumbnailIndices|mobileRemainingCount|mx-3 lg:hidden/);
  assert.doesNotMatch(gallerySource, /1 \/ 29|\+25/);
});

test("mobile header owns stay metadata while the dock follows the selected rate", () => {
  assert.equal(source.match(/data-mobile-hotel-stay-dock/g)?.length, 1);
  assert.match(source, /fixed inset-x-0 bottom-0/);
  assert.match(source, /env\\(safe-area-inset-bottom\\)/);
  assert.match(source, /bookingActionAvailable \\? "min-w-0 pb-\\[calc\\(7\\.5rem\\+env\\(safe-area-inset-bottom\\)\\)\\]/);
  assert.match(source, /hidden min-w-0 lg:flex lg:flex-col/);

  const headerStart = source.indexOf("data-mobile-property-header");
  const header = source.slice(headerStart, source.indexOf("</header>", headerStart));
  const dock = source.slice(source.indexOf("data-mobile-hotel-stay-dock"), source.indexOf("{roomsOpen ? ("));
  const aside = source.slice(source.indexOf("data-standalone-stay-summary"), source.indexOf("data-mobile-hotel-stay-dock"));

  for (const contract of [
    "data-mobile-hotel-stay-dates",
    "data-mobile-hotel-stay-guests",
    "props.staySummary.nightText",
    "props.staySummary.dateText",
    "props.staySummary.occupancyText",
  ]) assert.ok(header.includes(contract), contract);

  for (const contract of [
    "data-mobile-hotel-selected-rate",
    "mobileDockPrimaryLabel",
    "mobileDockPrimaryPrice",
    "mobileDockProviderName",
    "mobileDockSupportingText",
    "bookingActionLabel",
    "grid-cols-[minmax(0,1fr)_minmax(124px,42%)]",
    "min-[390px]:grid-cols-[minmax(0,1fr)_minmax(140px,0.82fr)]",
  ]) assert.ok(dock.includes(contract), contract);

  for (const removed of [
    "props.staySummary.nightText",
    "props.staySummary.dateText",
    "props.staySummary.occupancyText",
    "CalendarDays",
    "<Users",
  ]) assert.ok(!dock.includes(removed), removed);

  for (const contract of [
    "props.staySummary.nightText",
    "props.staySummary.dateText",
    "props.staySummary.occupancyText",
  ]) assert.ok(aside.includes(contract), contract);
});

test("mobile property identity follows the hero and keeps Hotel facts readable", () => {
  const identityStart = source.indexOf("data-mobile-hotel-identity");
  const header = source.slice(
    identityStart,
    source.indexOf("</header>", identityStart),
  );
  const orderedContracts = [
    "data-mobile-hotel-classification-stars",
    "data-mobile-hotel-review-summary",
    "data-mobile-hotel-address-row",
    "data-mobile-hotel-stay-dates",
    "data-mobile-hotel-stay-guests",
  ];
  let previous = -1;
  for (const contract of orderedContracts) {
    const index = header.indexOf(contract);
    assert.ok(index > previous, contract);
    previous = index;
  }
  for (const contract of [
    "data-mobile-hotel-hero-shell",
    "data-mobile-hotel-hero-actions",
    "aria-label=\"Back to hotel results\"",
    "aria-pressed={props.isSaved}",
    "data-mobile-hotel-address-row",
    "buildHotelAddress(props.propertyDetails)",
    "title={canonicalAddress}",
    "data-mobile-property-metadata",
    "grid-cols-[1rem_minmax(0,1fr)]",
    "data-mobile-hotel-address-icon",
    "<MapPin",
    "aria-label={props.starRatingAriaLabel}",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(
    header,
    /Show directions|href=\{directionsUrl\}|grid-cols-\[1rem_minmax\(0,1fr\)_auto\]|<Award\b|<Star\b/,
  );
  assert.ok(
    source.indexOf("data-mobile-hotel-hero-shell") <
      source.indexOf("data-mobile-property-header"),
  );
  assert.ok(
    source.indexOf("data-mobile-property-header") <
      source.indexOf("<HotelDetailsSectionNav"),
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

test("mobile Back, Save, and Share stay fixed over the Hotel hero as 44px controls", () => {
  const heroActions = source.slice(
    source.indexOf("data-mobile-hotel-hero-actions"),
    source.indexOf("</div>\n            </div>", source.indexOf("data-mobile-hotel-hero-actions")),
  );
  assert.match(heroActions, /aria-label="Back to hotel results"/);
  assert.equal(heroActions.match(/<button/g)?.length, 2);
  assert.equal(heroActions.match(/size-11/g)?.length, 3);
  assert.match(heroActions, /rounded-full/);
  assert.match(heroActions, /bg-white\/95/);
  assert.match(heroActions, /aria-pressed=\{props\.isSaved\}/);
  assert.match(heroActions, /<Heart/);
  assert.match(heroActions, /<Share2/);
});

test("mobile Hotel title uses the full identity width because hero actions are separate", () => {
  const titleRow = source.slice(
    source.indexOf("data-mobile-property-header"),
    source.indexOf("</header>", source.indexOf("data-mobile-property-header")),
  );
  assert.match(titleRow, /grid-cols-1 items-start/);
  assert.match(titleRow, /<h1 className="min-w-0 break-words/);
  assert.doesNotMatch(titleRow, /data-mobile-hotel-hero-actions/);
  assert.doesNotMatch(titleRow, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.doesNotMatch(titleRow, /whitespace-nowrap[^>]*>\s*\{props\.hotelName\}/);
});

test("standalone Hotel navigation uses the hero Back control on mobile and keeps the desktop text link", () => {
  const standalone = clientSource.slice(
    clientSource.indexOf('if (mode === "standalone")'),
    clientSource.indexOf("<StandaloneHotelDetails"),
  );
  assert.match(standalone, /className="hidden lg:block lg:px-0"/);
  assert.match(standalone, /data-standalone-hotel-back-link/);
  assert.match(standalone, /text-\[#075EE8\]/);
  assert.match(standalone, /<ArrowLeft className="h-4 w-4"/);
  assert.doesNotMatch(standalone, /<DetailsBackLink/);
  assert.match(source, /data-mobile-hotel-hero-actions[\s\S]*?aria-label="Back to hotel results"/);
  assert.match(source, /<ArrowLeft className="h-5 w-5"/);
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
    source.indexOf("{roomsOpen ? ("),
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
    "props.labels.continueBooking",
    'bookingContinuation.kind === "unavailable"',
  ])
    assert.ok(source.includes(contract), contract);
});

test("mobile Overview owns Location while desktop compare keeps its side-column map", () => {
  const comparePanel = source.slice(
    source.indexOf('{activeTab === "compare" ? ('),
    source.indexOf('{activeTab === "about" ? ('),
  );
  const aboutPanel = source.slice(
    source.indexOf('{activeTab === "about" ? ('),
    source.indexOf('{activeTab === "reviews" ? ('),
  );
  const stayAside = source.slice(
    source.indexOf("<aside"),
    source.indexOf("</aside>") + "</aside>".length,
  );

  assert.match(comparePanel, /<HotelPriceComparisonSection/);
  assert.doesNotMatch(comparePanel, /data-hotel-mobile-map|<HotelLocationSection/);
  assert.match(comparePanel, /hidden lg:block[\s\S]*?<RelatedHotelsSection/);

  assert.match(aboutPanel, /mobileAfterDescription=[\s\S]*?<HotelLocationSection/);
  assert.match(aboutPanel, /data-hotel-mobile-overview-related[\s\S]*?<RelatedHotelsSection/);

  assert.match(stayAside, /data-hotel-desktop-map/);
  assert.match(stayAside, /className="min-h-0 flex-1 pt-6"/);
  assert.match(stayAside, /fillHeight/);
  assert.match(stayAside, /activeTab === "compare"/);
  assert.equal(source.match(/<HotelDetailsGoogleMap/g)?.length, 1);
  assert.match(mapSource, /lg:h-\[320px\]/);
  assert.doesNotMatch(source, /Show directions|href=\{directionsUrl\}/);
});

test("desktop mosaic gallery uses independent transparent edge controls", () => {
  const mosaic = gallerySource.slice(
    gallerySource.indexOf("const mosaic = ("),
    gallerySource.indexOf("  const hero = ("),
  );
  assert.match(mosaic, /aria-label=\{previousPhotoLabel\}/);
  assert.match(mosaic, /aria-label=\{nextPhotoLabel\}/);
  assert.match(mosaic, /absolute left-0 top-1\/2/);
  assert.match(mosaic, /absolute right-0 top-1\/2/);
  assert.match(mosaic, /pointer-events-none absolute inset-0 z-10 grid grid-cols-\[1\.42fr_1fr\] gap-2/);
  assert.match(mosaic, /relative min-w-0 overflow-hidden rounded-\[10px\]/);
  assert.equal(mosaic.match(/pointer-events-auto absolute/g)?.length, 2);
  assert.match(mosaic, /size-11/);
  assert.match(mosaic, /bg-transparent/);
  const edgeControls = mosaic.slice(mosaic.indexOf("{showGalleryControls ? ("));
  assert.doesNotMatch(edgeControls, /bg-slate-950|rounded-full|rounded-lg/);
});

test("persistent booking actions use the translated continuation copy without support text", () => {
  assert.equal(source.match(/props\.labels\.continueBooking/g)?.length, 2);
  assert.doesNotMatch(source, /props\.labels\.(?:viewRooms|roomSupport)/);
  assert.match(
    clientSource,
    /continueBooking: t\("hotelDetails\.continueBooking"\) \|\| "Continue booking"/,
  );
  assert.doesNotMatch(clientSource, /roomSupport: t\("hotelDetails\.roomOptionsSupport"\)/);

  const desktopAction = source.slice(
    source.indexOf('data-standalone-stay-summary'),
    source.indexOf('data-mobile-hotel-stay-dock'),
  );
  const mobileAction = source.slice(
    source.indexOf('data-mobile-hotel-stay-dock'),
    source.indexOf('{roomsOpen ? ('),
  );
  for (const action of [desktopAction, mobileAction]) {
    assert.match(action, /onClick=\{\(event\) => continueBooking\(event\.currentTarget\)\}/);
    assert.match(action, /props\.labels\.continueBooking/);
    assert.doesNotMatch(action, /roomSupport/);
  }
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
