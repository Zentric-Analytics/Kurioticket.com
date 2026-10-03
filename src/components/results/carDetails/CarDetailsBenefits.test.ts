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
const cssSource = readFileSync(
  new URL("../../../app/globals.css", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const sectionNavSource = readFileSync(
  new URL("./CarDetailsSectionNav.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

function sourceBetween(source: string, startText: string, endText: string) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert.notEqual(start, -1, `${startText} exists`);
  assert.notEqual(end, -1, `${endText} follows ${startText}`);
  return source.slice(start, end);
}

test("source contract keeps the canonical primary offer as the selection fallback", () => {
  assert.match(
    clientSource,
    /const canonicalPrimaryOffer = suppliedPrimaryOffer \?\? getPrimaryCarOffer\(car\);/,
  );
  assert.match(
    clientSource,
    /comparisonOffers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)[\s\S]*?canonicalPrimaryOffer/,
  );
  assert.doesNotMatch(clientSource, /car\.offers\[0\]/);
});

test("hero omits the duplicate cancellation and taxes benefit cards", () => {
  assert.doesNotMatch(clientSource, /<CarDetailsHero car={car} offer=/);
  for (const removedContract of [
    "data-car-benefits",
    "ReceiptText",
    "ShieldCheck",
    "offer.freeCancellation",
    "offer.taxesAndFeesIncluded",
  ]) {
    assert.ok(
      !heroSource.includes(removedContract),
      `unexpected ${removedContract}`,
    );
  }
});

test("source contract keeps guided summary pricing without a duplicate standalone desktop booking summary", () => {
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
  assert.match(summary, /showRentalBreakdown \? price\(offer\.pricePerDay, offer\.currency\) : null/);
  assert.match(summary, /showRentalBreakdown && daily \? \(/);
  assert.match(summary, /carDetails\.bookingSummary/);
  assert.match(summary, /carDetails\.day/);
  assert.match(summary, /carsResults\.perDay/);
  assert.match(
    summary,
    /<button disabled className="mt-5 w-full rounded-lg bg-blue px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-100" > {action.label} <\/button>/,
  );
  assert.doesNotMatch(clientSource, /function DesktopCompactBookingAction/);
  assert.doesNotMatch(clientSource, /data-car-details-desktop-compact-/);
  assert.doesNotMatch(clientSource, /function Term|<Term|<dl/);
});

test("source contract keeps the guided desktop summary and mobile safe-area booking dock without a duplicate standalone bottom bar", () => {
  assert.match(clientSource, /function MobileBookingDock|<MobileBookingDock/);
  assert.match(clientSource, /fixed inset-x-0 bottom-0/);
  assert.match(clientSource, /safe-area-inset-bottom/);
  assert.match(clientSource, /data-mobile-car-booking-dock/);
  assert.match(clientSource, /<main className="flex-1 bg-\[#F5F7FB\] pb-/);

  const summaryRenders = clientSource.match(/<BookingSummary\b/g) ?? [];
  assert.equal(summaryRenders.length, 1);
  assert.match(clientSource, /data-car-details-booking-rail/);
  assert.doesNotMatch(clientSource, /data-car-details-bottom-booking-bar/);
  assert.match(
    clientSource,
    /presentation === "standalone-content" \? "lg:grid-cols-1 lg:gap-0" : "lg:grid-cols-\[minmax\(0,1fr\)_320px\] lg:gap-6 xl:grid-cols-\[minmax\(0,1fr\)_340px\]"/,
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
  const sectionPanels = clientSource.indexOf("data-car-details-section-panels", hero);
  assert.ok(
    hero >= 0 &&
      pickupReturn > hero &&
      sectionPanels > pickupReturn
  );
});

test("standalone details use persistent mobile controls with native-ordered hero content", () => {
  assert.match(heroSource, /data-car-details-image-stage/);
  assert.match(clientSource, /reserveMobileControlSafeZone={presentation === "standalone-content"}/);
  assert.match(heroSource, /data-car-details-mobile-native-image-stage/);
  assert.match(heroSource, /data-car-details-mobile-control-safe-zone/);
  assert.match(heroSource, /h-\[var\(--car-details-mobile-header-boundary\)\]/);
  assert.match(heroSource, /data-car-details-mobile-vehicle-stage/);
  assert.match(heroSource, /h-\[clamp\(11rem,50vw,14rem\)\] pb-3/);
  assert.doesNotMatch(heroSource, /scrollTo\(|scrollIntoView\(/);
  assert.doesNotMatch(heroSource, /data-car-details-mobile-controls/);
  assert.match(clientSource, /data-car-details-mobile-controls/);
  assert.match(clientSource, /pointer-events-none fixed inset-x-0 top-0/);
  assert.match(heroSource, /data-car-details-mobile-identity/);
  assert.match(heroSource, /data-car-details-specifications/);
  assert.match(heroSource, /bg-\[#F5F7FB\]/);
  assert.match(heroSource, /bg-white/);
  assert.match(heroSource, /fit="contain"/);
  assert.doesNotMatch(heroSource, /fit="cover"/);
  assert.match(heroSource, /grid-cols-2/);
  assert.match(clientSource, /data-car-details-mobile-back/);
  assert.match(clientSource, /aria-label="Back to Cars results"/);
  assert.match(clientSource, /or similar/);
  assert.match(clientSource, /useSavedCar\(car, search\)/);
  assert.match(clientSource, /navigator\.share/);
  assert.match(
    clientSource,
    /rounded-full border border-white\/70 bg-white\/85/,
  );
  assert.match(clientSource, /aria-pressed={isSaved}/);
  assert.match(clientSource, /<CarDetailsSectionNav activeTab={activeTab}/);

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  ).replace(/\s+/g, " ");
  assert.match(navSource, /data-car-details-mobile-section-nav/);
  assert.match(navSource, /data-car-details-section-nav/);
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(navSource, /mobileCompare/);
  assert.match(navSource, /role="tablist"/);
  assert.match(navSource, /ArrowLeft/);
  assert.match(navSource, /ArrowRight/);
  for (const panel of ["compare", "pickup", "location"]) {
    assert.match(clientSource, new RegExp(`id="car-${panel}-panel"`));
    assert.match(
      clientSource,
      new RegExp(`data-car-details-scroll-section="${panel}"`),
    );
  }
  assert.match(
    clientSource,
    /className={activeTab !== "compare" \? "hidden" : ""}/,
  );
  assert.match(
    clientSource,
    /className={activeTab !== "pickup" \? "hidden" : ""}/,
  );
  assert.match(
    clientSource,
    /className={activeTab !== "location" \? "hidden" : ""}/,
  );
  assert.match(clientSource, /data-car-details-desktop-tab-panels/);
  assert.match(clientSource, /data-car-details-flight-style-panel/);
  assert.match(
    clientSource,
    /lg:max-w-\[900px\][^"]*lg:bg-white[^"]*lg:px-5/,
  );
  assert.doesNotMatch(clientSource, /data-car-details-desktop-linear-sections/);
  assert.doesNotMatch(clientSource, /data-car-details-scroll-section="rental"/);
  assert.doesNotMatch(navSource, /\{ id: "rental", label: labels\.rental \}/);
  assert.match(navSource, /const mobileTabs = tabs;/);
  assert.match(
    clientSource,
    /car-details-desktop-section-heading-type hidden lg:block lg:text-\[16px\] lg:font-semibold lg:leading-6/,
  );
  assert.match(clientSource, /formatCarDate\(search\.pickupDate, locale\)/);
  assert.match(clientSource, /data-mobile-car-deal-list/);
  assert.match(clientSource, /Pickup requirements/);
  assert.match(clientSource, /data-car-location-section/);
});

test("desktop Pickup/Return avoids nested card-on-card treatment", () => {
  const pickup = sourceBetween(
    clientSource,
    "function DesktopPickupReturnOverview",
    "function DesktopCarHireLocationOverview",
  );
  assert.match(pickup, /data-car-details-flight-panel="pickup"/);
  assert.match(pickup, /max-w-\[900px\] py-5/);
  assert.match(
    pickup,
    /data-car-details-desktop-pickup-columns[\s\S]*?divide-x divide-\[#D8E1EC\][\s\S]*?border-y border-\[#D8E1EC\]/,
  );
  assert.doesNotMatch(
    pickup,
    /rounded-\[22px\]|shadow-\[0_6px_18px|data-car-details-inner-surface/,
  );
  assert.doesNotMatch(clientSource, /function DesktopRentalDetails/);
});

test("desktop overview and linear sections use only existing car and offer data", () => {
  assert.doesNotMatch(clientSource, /data-car-details-desktop-selected-deal/);
  assert.doesNotMatch(clientSource, /function StandaloneDesktopDealSummary/);
  assert.match(clientSource, /compactBookingProviderName\(offer\)/);
  assert.match(clientSource, /offer\.freeCancellation/);
  assert.match(clientSource, /offer\.taxesAndFeesIncluded/);
  assert.match(clientSource, /offer\.payAtPickup/);
  assert.match(clientSource, /data-car-details-desktop-pickup-overview/);
  assert.match(clientSource, /data-car-details-desktop-location-overview/);
  assert.doesNotMatch(clientSource, /data-car-details-desktop-location-card/);
  assert.match(clientSource, /data-car-details-desktop-location-map/);
  assert.match(clientSource, /data-car-details-desktop-location-details/);
  assert.match(clientSource, /carDetails\.pickupLocationDetails/);
  assert.match(clientSource, /carDetails\.confirmPickupDetails/);
  assert.match(clientSource, /car\.pickupInstructions \? <li>\{car\.pickupInstructions\}<\/li> : null/);
  const desktopLocation = sourceBetween(
    clientSource,
    "function DesktopCarHireLocationOverview",
    "function CarHeroActions",
  );
  assert.match(desktopLocation, />Location<\/h2>/);
  assert.match(desktopLocation, /Open in Maps/);
  assert.match(desktopLocation, /\["map", "streetview"\] as const/);
  assert.match(desktopLocation, /buildGoogleCarStreetViewEmbedUrl/);
  assert.match(desktopLocation, /search\.pickupLocationTarget\?\.coordinates/);
  assert.match(desktopLocation, /Street View unavailable/);
  assert.doesNotMatch(desktopLocation, /Car hire location|pickupTypeLabels\[car\.pickupType\]|car\.sandboxPresentation\?\.pickupLabel/);
  assert.doesNotMatch(desktopLocation, /carDetails\.getDirections/);
  assert.match(
    desktopLocation,
    /className="mt-5 border-t border-\[#D8E1EC\] pb-1 pt-5" data-car-details-desktop-location-details/,
  );
  assert.doesNotMatch(
    desktopLocation,
    /rounded-\[14px\] border border-slate-200 bg-white p-4 shadow-/,
  );
  assert.doesNotMatch(clientSource, /data-car-details-desktop-rental-details/);
  assert.doesNotMatch(clientSource, /function DesktopRentalDetails/);
  assert.doesNotMatch(clientSource, /car\.depositAmount|car\.excessAmount/);
  assert.match(clientSource, /car\.requiredDocuments\.some/);
  assert.doesNotMatch(clientSource, /car\.includedItems\.map/);
  assert.doesNotMatch(clientSource, /car\.importantInformation\.map/);
  assert.doesNotMatch(clientSource, />Included<|>Important information</);
  assert.match(clientSource, /car\.sandboxPresentation[\s\S]*?unavailableOfferLabel/);
  assert.match(clientSource, /unavailableBookingMessage/);
  assert.doesNotMatch(clientSource, /"KAYAK sandbox", "Simulated inventory — no real booking"/);
  assert.doesNotMatch(clientSource, /vehicle condition as expected|recommended by|collision damage protection/i);
});

test("standalone desktop Cars Details uses a deliberate non-faint typography hierarchy", () => {
  assert.match(clientSource, /presentation === "guided-content" \? "mt-6" : "car-details-standalone-typography"/);
  for (const className of [
    "car-details-desktop-section-heading-type",
    "car-details-desktop-item-heading-type",
    "car-details-desktop-provider-type",
    "car-details-desktop-primary-copy-type",
    "car-details-desktop-secondary-copy-type",
    "car-details-desktop-strong-copy-type",
    "car-details-desktop-benefit-type",
  ]) {
    assert.match(clientSource, new RegExp(className));
  }
  assert.match(heroSource, /car-details-desktop-amenity-type/);
  assert.match(
    cssSource,
    /\.car-details-standalone-typography \.car-details-desktop-section-heading-type \{[^}]*font-size: 16px !important;[^}]*font-weight: 700 !important;[^}]*color: #0f172a !important;[^}]*font-variation-settings: "wght" 700;/,
  );
  assert.match(
    cssSource,
    /\.car-details-standalone-typography \.car-details-desktop-primary-copy-type \{[^}]*font-size: 14px !important;[^}]*font-weight: 500 !important;[^}]*color: #334155 !important;[^}]*font-variation-settings: "wght" 500;/,
  );
  assert.match(
    cssSource,
    /\.car-details-standalone-typography \.car-details-desktop-secondary-copy-type \{[^}]*font-size: 14px !important;[^}]*font-weight: 500 !important;[^}]*color: #475569 !important;[^}]*font-variation-settings: "wght" 500;/,
  );
  assert.match(
    cssSource,
    /\.car-details-standalone-typography \.car-details-desktop-benefit-type \{[^}]*font-size: 13px !important;[^}]*font-weight: 600 !important;[^}]*color: #475569 !important;[^}]*font-variation-settings: "wght" 600;/,
  );
  assert.match(
    cssSource,
    /\.car-details-standalone-typography \.car-details-desktop-amenity-type \{[^}]*font-size: 13px !important;[^}]*font-weight: 600 !important;[^}]*color: #334155 !important;[^}]*font-variation-settings: "wght" 600;/,
  );
});
test("standalone car details use polished Flight-style panel headings", () => {
  assert.match(clientSource, /<CarDetailsSectionNav activeTab={activeTab}/);
  assert.match(clientSource, /compare: "Compare deals"/);
  assert.match(clientSource, /pickup: copy\("carDetails\.pickupReturn"\)/);
  assert.match(clientSource, /location: copy\("carDetails\.location"\)/);
  assert.doesNotMatch(clientSource, /showSectionHeading={false}/);
  assert.match(clientSource, /showDesktopOfferList/);

  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparisonSection",
    "function CarLocationSection",
  );
  assert.match(comparison, /showSectionHeading \? \(/);
  assert.match(comparison, /Compare deals/);
  assert.match(
    comparison,
    /lg:text-\[16px\] lg:font-semibold lg:leading-6 lg:tracking-\[-0\.1px\] lg:text-\[#192024\]/,
  );
  assert.match(comparison, /data-desktop-car-deal-list/);
  assert.match(
    comparison,
    /className="mt-4 hidden w-full max-w-\[640px\] space-y-2 lg:block"/,
  );
  assert.match(
    comparison,
    /data-car-details-flight-panel=\{showDesktopOfferList \? "compare" : undefined\}/,
  );
  assert.doesNotMatch(
    comparison,
    /data-car-details-layered-surface=\{showDesktopOfferList/,
  );

  const pickup = sourceBetween(
    clientSource,
    "function DesktopPickupReturnOverview",
    "function DesktopCarHireLocationOverview",
  );
  assert.match(pickup, /data-car-details-flight-panel="pickup"/);
  assert.match(pickup, /border-y border-\[#D8E1EC\]/);

  const location = sourceBetween(
    clientSource,
    "function DesktopCarHireLocationOverview",
    "function CarHeroActions",
  );
  assert.match(location, /data-car-details-flight-panel="location"/);
  assert.match(location, /data-car-details-location-identity/);
});

test("standalone desktop overview uses one integrated Flight-inspired hero surface", () => {
  assert.match(heroSource, /data-car-details-layered-surface=\{reserveMobileControlSafeZone \? "hero" : undefined\}/);
  assert.match(
    heroSource,
    /lg:max-w-\[900px\][\s\S]*?lg:rounded-\[22px\][\s\S]*?lg:border-\[#DFE6EF\][\s\S]*?lg:bg-\[#F7F9FC\]/,
  );
  assert.match(
    heroSource,
    /data-car-details-desktop-overview-specifications[\s\S]*?grid-cols-4 gap-x-5 gap-y-2 rounded-\[14px\][\s\S]*?bg-white\/75[\s\S]*?px-4 py-3/,
  );
  assert.doesNotMatch(heroSource, /data-car-details-desktop-overview-summary/);
});

test("desktop car details center the hero and keep Back Save and Share inside it", () => {
  assert.match(heroSource, /data-car-details-desktop-overview/);
  assert.match(heroSource, /data-car-details-desktop-overview-image/);
  assert.match(heroSource, /data-car-details-desktop-overview-identity/);
  assert.match(heroSource, /data-car-details-desktop-overview-specifications/);
  assert.ok(
    heroSource.indexOf("data-car-details-desktop-overview-image") <
      heroSource.indexOf("data-car-details-desktop-overview-identity"),
    "desktop car image renders before the centered identity",
  );
  assert.ok(
    heroSource.indexOf("data-car-details-desktop-overview-identity") <
      heroSource.indexOf("data-car-details-desktop-overview-specifications"),
    "desktop amenities render after the car identity",
  );
  assert.match(heroSource, /data-car-details-desktop-integrated-controls/);
  assert.match(clientSource, /data-car-details-desktop-hero-controls/);
  assert.match(clientSource, /\{desktopBackControl\}/);
  assert.match(
    clientSource,
    /data-car-details-utility-placement="hero"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.doesNotMatch(clientSource, /data-car-details-desktop-controls/);
  assert.doesNotMatch(clientSource, /data-car-details-utility-placement="tabs"/);
  assert.doesNotMatch(clientSource, /desktopSectionBarStuck/);
  assert.doesNotMatch(heroSource, /data-car-details-desktop-overview-summary/);
  assert.doesNotMatch(clientSource, /function StandaloneDesktopDealSummary/);

  const sandboxStart = clientSource.indexOf(
    'car.inventorySource === "kayak-sandbox"',
  );
  const heroStart = clientSource.indexOf("<CarDetailsHero");
  assert.ok(
    sandboxStart >= 0 && heroStart > sandboxStart,
    "KAYAK and Kurioticket continue through the same integrated desktop hero",
  );
});

test("desktop Cars sticky tabs use the same in-place tab model as Flights", () => {
  assert.match(sectionNavSource, /data-car-details-flight-style-tabs/);
  assert.match(sectionNavSource, /lg:sticky lg:top-0/);
  assert.match(sectionNavSource, /role="tablist"/);
  assert.match(sectionNavSource, /role="tab"/);
  assert.match(sectionNavSource, /aria-selected=\{selected\}/);
  assert.match(sectionNavSource, /aria-controls=\{`car-desktop-\$\{tab\.id\}-panel`\}/);
  assert.match(sectionNavSource, /min-h-11 flex-1/);
  assert.match(sectionNavSource, /border-b-\[3px\]/);
  assert.match(sectionNavSource, /border-\[#075EE8\] text-\[#07133B\]/);
  assert.doesNotMatch(
    sectionNavSource,
    /desktopStuck|desktopBackControl|desktopUtilityActions|data-car-details-desktop-sticky-actions/,
  );
  assert.match(clientSource, /data-car-details-desktop-tab-panels/);
  assert.doesNotMatch(clientSource, /data-car-details-desktop-linear-sections/);
  assert.doesNotMatch(clientSource, /scrollIntoView/);
});

test("desktop Cars keeps Save and Share inside the hero while Compare deals owns booking information", () => {
  assert.match(clientSource, /data-car-details-desktop-hero-controls/);
  assert.match(
    clientSource,
    /data-car-details-desktop-hero-controls[\s\S]*?data-car-details-utility-placement="hero"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.doesNotMatch(clientSource, /data-car-details-utility-placement="tabs"/);
  assert.doesNotMatch(clientSource, /DesktopCompactBookingAction/);
  assert.doesNotMatch(clientSource, /data-car-details-desktop-selected-deal/);
  assert.doesNotMatch(clientSource, /data-car-details-desktop-overview-cta/);

  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparisonSection",
    "function CarLocationSection",
  );
  assert.match(comparison, /data-desktop-car-deal-list/);
  assert.match(comparison, /data-car-details-desktop-deal-provider/);
  assert.match(comparison, /data-car-details-desktop-deal-total/);
  assert.match(comparison, /data-car-details-desktop-deal-benefits/);
  assert.match(comparison, /data-car-details-desktop-deal-cta/);
  assert.match(comparison, /offer\.totalPrice/);
  assert.match(comparison, /copy\("carDetails\.continueDeal"\)/);
  assert.match(comparison, /<CarOfferProviderBrand/);
  assert.match(
    clientSource,
    /offer\.bookingProviderLogoUrl \|\|[\s\S]*?car\.inventorySource === "kurioticket-static-cars"[\s\S]*?kurioticket-logo-primary-light-bg\.svg/,
  );

  assert.doesNotMatch(clientSource, /data-car-details-bottom-booking-bar/);
  assert.match(clientSource, /data-mobile-car-booking-dock/);
  assert.equal(clientSource.match(/<BookingSummary\b/g)?.length, 1);
});
test("desktop Pickup/Return and Location use one flat Flights-style panel hierarchy", () => {
  assert.match(clientSource, /data-car-details-desktop-tab-panels/);
  const pickup = sourceBetween(
    clientSource,
    "function DesktopPickupReturnOverview",
    "function DesktopCarHireLocationOverview",
  );
  assert.match(pickup, /data-car-details-flight-panel="pickup"/);
  assert.match(pickup, /max-w-\[900px\] py-5/);
  assert.match(
    pickup,
    /data-car-details-desktop-pickup-columns[\s\S]*?border-y border-\[#D8E1EC\]/,
  );
  assert.doesNotMatch(pickup, /rounded-\[22px\]|data-car-details-inner-surface/);

  const location = sourceBetween(
    clientSource,
    "function DesktopCarHireLocationOverview",
    "function CarHeroActions",
  );
  assert.match(location, /data-car-details-flight-panel="location"/);
  assert.match(location, /data-car-details-location-identity/);
  assert.match(location, /border-b border-\[#D8E1EC\]/);
  assert.match(
    location,
    /className="mt-5 border-t border-\[#D8E1EC\] pb-1 pt-5" data-car-details-desktop-location-details/,
  );
  assert.doesNotMatch(location, /data-car-details-layered-surface="location"/);
});

test("desktop Pickup and return removes pickup type and duplicated pickup-instructions copy", () => {
  const pickup = sourceBetween(
    clientSource,
    "function DesktopPickupReturnOverview",
    "function DesktopCarHireLocationOverview",
  );
  assert.doesNotMatch(pickup, /pickupTypeLabels|sandboxPresentation\?\.pickupLabel/);
  assert.doesNotMatch(pickup, /carDetails\.pickupInstructions|car\.pickupInstructions/);
  assert.match(pickup, /carDetails\.pickup/);
  assert.match(pickup, /carDetails\.return/);

  const location = sourceBetween(
    clientSource,
    "function DesktopCarHireLocationOverview",
    "function CarHeroActions",
  );
  assert.match(location, /data-car-details-desktop-location-details/);
  assert.match(location, /carDetails\.pickupLocationDetails/);
  assert.match(location, /car\.pickupInstructions/);
  assert.match(location, /carDetails\.confirmPickupDetails/);
});

test("Location map card keeps a balanced mobile viewport and fixed directions row", () => {
  const location = sourceBetween(
    clientSource,
    "function CarLocationSection",
    "function BookingSummary",
  );

  assert.match(location, /data-car-location-map-card/);
  assert.match(
    location,
    /mt-4 flex flex-col overflow-hidden rounded-\[14px\] border border-slate-200 bg-white/,
  );
  assert.match(
    location,
    /className="block h-\[216px\] w-full shrink-0 border-0 sm:h-\[220px\] lg:h-\[320px\]"/,
  );
  assert.match(
    location,
    /className="focus-ring flex h-11 shrink-0 items-center justify-between border-t border-slate-200 px-4 text-sm font-bold leading-5 text-\[#075EE8\]/,
  );
  assert.match(location, /<ExternalLink size={16} className="shrink-0"/);
  assert.doesNotMatch(location, /h-\[200px\] w-full border-0/);
  assert.doesNotMatch(location, /flex min-h-11 items-center justify-between/);
});

test("Location tab timeline mirrors Pickup and return pins and icons", () => {
  const location = sourceBetween(
    clientSource,
    "function CarLocationSection",
    "function BookingSummary",
  );
  const timeline = sourceBetween(
    location,
    "data-car-location-timeline",
    "carDetails.pickupLocationDetails",
  );

  assert.match(timeline, /relative border-s-2 border-blue-200 ps-5/);
  assert.match(
    timeline,
    /absolute -start-\[7px\] top-1 size-3 rounded-full bg-\[#004BB8\]/,
  );
  assert.match(
    timeline,
    /<MapPin size={16} className="shrink-0 text-\[#004BB8\]" aria-hidden="true" \/>/,
  );
  assert.match(
    timeline,
    /<Clock3 size={16} className="shrink-0" aria-hidden="true" \/>/,
  );
  assert.match(timeline, /<time dateTime={`\$\{date\}T\$\{time\}`}>/);
  assert.doesNotMatch(timeline, /relative flex w-9 shrink-0 justify-center/);
  assert.doesNotMatch(timeline, /bg-\[#075EE8\]/);
});

test("mobile price comparison retains the existing per-day selection card", () => {
  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparison",
    "function CarLocationSection",
  );
  for (const icon of ["ShieldCheck", "Fuel", "Gauge"]) {
    assert.match(comparison, new RegExp(`Icon: ${icon}`));
  }
  assert.match(
    comparison,
    /mt-3 flex min-w-0 items-end gap-2\.5/,
  );
  assert.match(
    comparison,
    /flex-1 flex-wrap items-center gap-x-2\.5 gap-y-\[7px\]/,
  );
  assert.match(
    comparison,
    /col-span-2 mt-5 flex min-w-0 items-end gap-x-4 overflow-visible/,
  );
  assert.match(comparison, /flex-1 flex-nowrap items-end gap-x-4 overflow-x-auto/);
  assert.doesNotMatch(comparison, /overflow-y-hidden pb-1/);
  assert.match(
    comparison,
    /min-h-9 shrink-0 flex-col items-end justify-end overflow-visible/,
  );
  assert.match(comparison, /carsResults\.perDay/);
  assert.match(comparison, /min-h-4[^\"]*overflow-visible[^\"]*leading-4/);
  assert.match(comparison, /font-extrabold leading-5 tracking-tight/);
  assert.doesNotMatch(comparison, /leading-none/);
  assert.match(
    comparison,
    /text-\[10px\] font-medium leading-\[13px\] text-\[#075EE8\]/,
  );
  assert.match(comparison, /text-xs font-medium leading-4 text-\[#075EE8\]/);
  assert.match(comparison, /className="shrink-0 text-slate-600"/);
  assert.match(comparison, /carsResults\.fullToFull/);
  assert.doesNotMatch(comparison, /carDetails\.estimatedCataloguePrice/);
  assert.doesNotMatch(comparison, /border-t border-slate-100/);
  assert.doesNotMatch(comparison, /feesIncludedShort/);
  assert.doesNotMatch(comparison, /row-start-4/);
});


test("desktop Compare deals includes the active deal first and keeps alternatives below it", () => {
  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparisonSection",
    "function CarLocationSection",
  );
  assert.match(
    comparison,
    /const desktopOrderedOffers = selectedOffer \? \[ selectedOffer, \.\.\.offers\.filter\(\(offer\) => offer\.id !== selectedOffer\.id\), \] : offers;/,
  );
  assert.match(
    comparison,
    /showDesktopOfferList && desktopOrderedOffers\.length/,
  );
  assert.match(
    comparison,
    /desktopOrderedOffers\.map\(\(offer\) =>/,
  );
  assert.match(
    comparison,
    /data-selected={selected \? "true" : "false"}/,
  );
  assert.match(
    comparison,
    /onClick=\{\(\) => onSelectOffer\(offer\.id\)\}/,
  );
  assert.doesNotMatch(comparison, /desktopAlternativeOffers/);
});

test("local Cars provider logos use a direct eager img with fixed brand dimensions", () => {
  const providerBrand = sourceBetween(
    clientSource,
    "function CarOfferProviderBrand",
    "const unavailableOfferLabel",
  );
  assert.match(providerBrand, /const localBrandLogo = logoUrl\.startsWith\("\/"\)/);
  assert.match(providerBrand, /h-6 w-\[112px\]/);
  assert.match(providerBrand, /h-5 w-\[96px\]/);
  assert.match(providerBrand, /<img[^>]*src=\{logoUrl\}[^>]*loading="eager"[^>]*decoding="sync"/);
  assert.match(providerBrand, /data-car-offer-provider-brand-image="local"/);
  assert.match(providerBrand, /data-car-offer-provider-brand-image="remote"/);
});

test("Kurioticket deal branding does not depend only on inventorySource", () => {
  const providerBrand = sourceBetween(
    clientSource,
    "function CarOfferProviderBrand",
    "const unavailableOfferLabel",
  );
  assert.match(
    providerBrand,
    /providerName\.trim\(\)\.toLowerCase\(\) === "kurioticket"/,
  );
  assert.match(
    providerBrand,
    /offer\.bookingProviderName\.trim\(\)\.toLowerCase\(\) === "kurioticket"/,
  );
  assert.match(
    providerBrand,
    /offer\.bookingProviderName\.trim\(\)\.toLowerCase\(\) === "kurioticket static fixture"/,
  );
  assert.match(providerBrand, /kurioticket-logo-primary-light-bg\.svg/);
});

test("desktop Compare deals wires each provider row to its own logo total benefits and Continue deal action", () => {
  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparisonSection",
    "function CarLocationSection",
  );
  const desktop = sourceBetween(
    comparison,
    "data-desktop-car-deal-list",
    "{selectedOffer ? (",
  );

  assert.match(desktop, /data-car-details-desktop-deal-row/);
  assert.match(desktop, /data-car-details-desktop-deal-provider/);
  assert.match(desktop, /<CarOfferProviderBrand/);
  assert.match(desktop, /providerName={providerName}/);
  assert.match(desktop, /data-car-details-desktop-deal-total/);
  assert.match(desktop, /data-car-details-desktop-deal-benefits/);
  assert.match(desktop, /data-car-details-desktop-deal-cta/);
  assert.match(desktop, /offer\.totalPrice/);
  assert.match(desktop, /compactBookingProviderName\(offer\)/);
  assert.match(desktop, /offer\.freeCancellation/);
  assert.match(desktop, /offer\.payAtPickup/);
  assert.match(desktop, /offer\.taxesAndFeesIncluded/);
  assert.match(desktop, /onClick=\{\(\) => onSelectOffer\(offer\.id\)\}/);
  assert.match(desktop, /href=\{offerAction\.href\}/);
  assert.match(desktop, /target="_blank"/);
  assert.match(desktop, /rel="noopener noreferrer"/);
  assert.match(desktop, /referrerPolicy="no-referrer"/);
  assert.doesNotMatch(desktop, /offer\.pricePerDay|carsResults\.perDay/);
  assert.match(desktop, /min-h-\[92px\][^"]*rounded-xl[^"]*px-4 py-3/);
  assert.match(desktop, /min-h-9 min-w-\[104px\][^"]*px-3 text-\[12px\] font-semibold/);
  assert.match(comparison, /max-w-\[640px\]/);

  assert.match(
    clientSource,
    /const actionForOffer = \(offer: CarOffer\): CarDetailsPrimaryAction =>[\s\S]*?sandboxBookingUrl\(offer\.bookingUrl\)/,
  );
  assert.match(
    clientSource,
    /<CarPriceComparisonSection[\s\S]*?actionForOffer=\{actionForOffer\}/,
  );
});

test("desktop KAYAK booking summary keeps the secure handoff and Continue deal label", () => {
  const summary = clientSource.slice(
    clientSource.indexOf("function BookingSummary"),
    clientSource.indexOf("function MobileBookingDock"),
  );
  const sandboxStart = summary.indexOf('action.kind === "sandbox-handoff"');
  const unsupportedStart = summary.indexOf(
    'action.kind === "standalone-disabled-provider"',
  );
  assert.ok(sandboxStart >= 0 && unsupportedStart > sandboxStart);

  const sandboxDesktop = summary.slice(sandboxStart, unsupportedStart);
  assert.match(sandboxDesktop, /<a[\s\S]*?href={action\.href}/);
  assert.match(sandboxDesktop, /target="_blank"/);
  assert.match(sandboxDesktop, /rel="noopener noreferrer"/);
  assert.match(sandboxDesktop, /referrerPolicy="no-referrer"/);
  assert.match(sandboxDesktop, /\{action\.label\}/);
  assert.doesNotMatch(sandboxDesktop, /<button|disabled/);

  assert.match(
    clientSource,
    /const standaloneSandbox =[\s\S]*?presentation === "standalone-content"[\s\S]*?car\.inventorySource === "kayak-sandbox"/,
  );
  assert.match(
    clientSource,
    /selectedSandboxHref[\s\S]*?kind: "sandbox-handoff"[\s\S]*?label: copy\("carDetails\.continueDeal"\),[\s\S]*?href: selectedSandboxHref/,
  );
});

test("source contract keeps unsupported mobile deals inert while KAYAK opens securely in a new tab", () => {
  const mobileDock = clientSource.slice(
    clientSource.indexOf("function MobileBookingDock"),
  );
  const sandboxStart = mobileDock.indexOf('action.kind === "sandbox-handoff"');
  const unsupportedStart = mobileDock.indexOf(
    'action.kind === "standalone-disabled-provider"',
  );
  assert.ok(sandboxStart >= 0 && unsupportedStart > sandboxStart);

  const sandboxMobile = mobileDock.slice(sandboxStart, unsupportedStart);
  assert.match(sandboxMobile, /<a href={action\.href}/);
  assert.match(sandboxMobile, /target="_blank"/);
  assert.match(sandboxMobile, /rel="noopener noreferrer"/);
  assert.match(sandboxMobile, /referrerPolicy="no-referrer"/);
  assert.match(sandboxMobile, /bg-blue/);
  assert.match(sandboxMobile, /text-white/);
  assert.match(sandboxMobile, /copy\("carDetails\.continueDeal"\)/);
  assert.doesNotMatch(sandboxMobile, /<button| disabled/);

  const unsupportedMobile = mobileDock.slice(unsupportedStart);
  assert.match(
    unsupportedMobile,
    /<button disabled className="[^"]*bg-blue[^"]*text-white[^"]*disabled:opacity-100[^"]*" > [\s\S]*?<\/button>/,
  );
  assert.doesNotMatch(
    unsupportedMobile.slice(0, unsupportedMobile.indexOf("</button>")),
    /href|onClick|bookingUrl/,
  );
  assert.match(clientSource, /label: copy\("carDetails\.continueDeal"\)/);
  assert.match(
    clientSource,
    /selectedSandboxHref[\s\S]*?kind: "sandbox-handoff"[\s\S]*?label: copy\("carDetails\.continueDeal"\),[\s\S]*?href: selectedSandboxHref/,
  );
  assert.match(
    clientSource,
    /const actionForOffer = \(offer: CarOffer\): CarDetailsPrimaryAction =>[\s\S]*?sandboxBookingUrl\(offer\.bookingUrl\)/,
  );
  assert.doesNotMatch(clientSource, /label: copy\("continueToProvider"\)/);
});

test("source contract does not restore removed booking-disabled messaging", () => {
  assert.doesNotMatch(
    clientSource,
    /demo-booking-note|carDetails\.bookingUnavailable|carDetails\.bookingDisabledExplanation/,
  );
});


test("standalone desktop amenities use a compact four-column two-row grid without wrapping", () => {
  assert.match(
    heroSource,
    /specs\.map\(\(\[Icon, label\]\) => \(/,
  );
  assert.match(
    heroSource,
    /lg:max-w-\[820px\][\s\S]*?lg:grid-cols-4[\s\S]*?lg:gap-x-6[\s\S]*?lg:gap-y-2/,
  );
  assert.match(
    heroSource,
    /lg:w-max lg:max-w-full lg:min-h-8 lg:justify-self-center[\s\S]*?lg:whitespace-nowrap/,
  );
  assert.match(
    heroSource,
    /lg:break-normal lg:whitespace-nowrap/,
  );
  assert.doesNotMatch(
    heroSource,
    /index % 2 === 0|lg:justify-self-end|lg:justify-self-start/,
  );
});
test("standalone desktop amenities are grouped into one compact hero information surface", () => {
  assert.match(
    heroSource,
    /data-car-details-desktop-overview-specifications[\s\S]*?rounded-\[14px\][\s\S]*?bg-white\/75/,
  );
  assert.match(
    heroSource,
    /car-details-desktop-amenity-type inline-flex min-h-8 w-full[\s\S]*?px-2 py-1\.5/,
  );
  assert.doesNotMatch(
    heroSource,
    /car-details-desktop-amenity-type[\s\S]*?rounded-\[13px\][\s\S]*?shadow-\[0_2px_7px/,
  );
});

test("Cars Details uses the same dedicated transmission icon at mobile and desktop", () => {
  assert.match(
    heroSource,
    /manual[\s\S]*ManualTransmissionIcon[\s\S]*automatic[\s\S]*AutomaticTransmissionIcon[\s\S]*CarFront/,
  );
  assert.match(
    heroSource,
    /\[transmissionIcon, transmissionLabels\[car\.transmission\]\]/,
  );
  assert.doesNotMatch(
    heroSource,
    /\[CarFront, transmissionLabels\[car\.transmission\]\]/,
  );
  assert.match(
    heroSource,
    /specs\.map\(\(\[Icon, label\]\) => \([\s\S]*?<Icon[\s\S]*?className="shrink-0 text-slate-600"/,
  );
  assert.doesNotMatch(
    heroSource,
    /mobileTransmissionIcon|lg:hidden[\s\S]*?<CarFront[\s\S]*?lg:block/,
  );
});

test("desktop standalone tab panels share one left content rail", () => {
  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparisonSection",
    "function CarLocationSection",
  );
  assert.match(
    comparison,
    /showDesktopOfferList \? "lg:max-w-\[900px\] lg:border-0 lg:bg-transparent lg:px-0 lg:pb-5 lg:pt-5"/,
  );
  assert.match(
    comparison,
    /className="car-details-desktop-section-heading-type hidden lg:block lg:text-\[16px\] lg:font-semibold/,
  );
  assert.match(
    comparison,
    /className="mt-4 hidden w-full max-w-\[640px\] space-y-2 lg:block"/,
  );
  assert.doesNotMatch(comparison, /lg:text-center|lg:justify-center/);

  const pickup = sourceBetween(
    clientSource,
    "function DesktopPickupReturnOverview",
    "function DesktopCarHireLocationOverview",
  );
  assert.match(pickup, /mx-auto w-full max-w-\[900px\] py-5/);

  const location = sourceBetween(
    clientSource,
    "function DesktopCarHireLocationOverview",
    "function CarHeroActions",
  );
  assert.match(location, /mx-auto w-full max-w-\[900px\] py-5/);
});

test("standalone desktop car overview follows image then identity then amenities without a deal-side column", () => {
  assert.match(heroSource, /data-car-details-desktop-overview/);
  assert.match(
    heroSource,
    /hidden lg:flex lg:flex-col lg:items-center lg:px-0 lg:pb-1 lg:pt-0/,
  );
  assert.match(heroSource, /data-car-details-desktop-overview-image/);
  assert.match(heroSource, /data-car-details-desktop-overview-identity/);
  assert.match(heroSource, /data-car-details-desktop-overview-specifications/);
  assert.ok(
    heroSource.indexOf("data-car-details-desktop-overview-image") <
      heroSource.indexOf("data-car-details-desktop-overview-identity"),
  );
  assert.ok(
    heroSource.indexOf("data-car-details-desktop-overview-identity") <
      heroSource.indexOf("data-car-details-desktop-overview-specifications"),
  );
  assert.match(heroSource, /max-w-\[680px\]/);
  assert.match(heroSource, /h-\[250px\]/);
  assert.match(heroSource, /max-w-\[820px\] grid-cols-4 gap-x-5 gap-y-2 rounded-\[14px\]/);
  assert.doesNotMatch(
    heroSource,
    /lg:grid-cols-\[minmax\(0,1fr\)_320px\]|data-car-details-desktop-overview-summary/,
  );
  assert.doesNotMatch(clientSource, /function StandaloneDesktopDealSummary/);
});

