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

test("source contract keeps total pricing and hides the standalone rental breakdown", () => {
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
  assert.match(clientSource, /showRentalBreakdown={presentation !== "standalone-content"}/);
  assert.match(summary, /carDetails\.bookingSummary/);
  assert.match(summary, /carDetails\.day/);
  assert.match(summary, /carsResults\.perDay/);
  assert.match(
    summary,
    /<button disabled className="mt-5 w-full rounded-lg bg-blue px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-100" > {action.label} <\/button>/,
  );
  assert.doesNotMatch(clientSource, /function Term|<Term|<dl/);
});

test("source contract uses a desktop summary and a mobile safe-area booking dock", () => {
  assert.match(clientSource, /function MobileBookingDock|<MobileBookingDock/);
  assert.match(clientSource, /fixed inset-x-0 bottom-0/);
  assert.match(clientSource, /safe-area-inset-bottom/);
  assert.match(clientSource, /data-mobile-car-booking-dock/);
  assert.match(clientSource, /<main className="flex-1 bg-\[#F5F7FB\] pb-/);

  const summaryRenders = clientSource.match(/<BookingSummary\b/g) ?? [];
  assert.equal(summaryRenders.length, 2);
  assert.match(clientSource, /data-car-details-booking-rail/);
  assert.match(clientSource, /data-car-details-bottom-booking-bar/);
  assert.match(clientSource, /className="hidden lg:block"[\s\S]*?data-car-details-bottom-booking-bar/);
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
  const sectionPanels = clientSource.indexOf("data-car-details-section-panels", hero);
  const bottomBar = clientSource.indexOf("data-car-details-bottom-booking-bar", sectionPanels);
  assert.ok(
    hero >= 0 &&
      pickupReturn > hero &&
      sectionPanels > pickupReturn &&
      bottomBar > sectionPanels,
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
  assert.match(navSource, /bg-\[#F5F7FB\].*lg:bg-\[#F5F7FB\]/);
  assert.match(navSource, /mobileCompare/);
  assert.match(navSource, /role="tablist"/);
  assert.match(navSource, /ArrowLeft/);
  assert.match(navSource, /ArrowRight/);
  for (const panel of ["compare", "pickup", "location"]) {
    assert.match(clientSource, new RegExp(`id="car-${panel}-panel"`));
    assert.match(clientSource, new RegExp(`hidden={activeTab !== "${panel}"}`));
  }
  assert.match(clientSource, /hidden text-xs font-bold leading-\[18px\][^"]*lg:block/);
  assert.match(clientSource, /formatCarDate\(search\.pickupDate, locale\)/);
  assert.match(clientSource, /data-mobile-car-deal-list/);
  assert.match(clientSource, /Pickup requirements/);
  assert.match(clientSource, /data-car-location-section/);
});

test("standalone car details keep the tabs but hide duplicate desktop section headings", () => {
  assert.match(clientSource, /<CarDetailsSectionNav activeTab={activeTab}/);
  assert.match(clientSource, /compare: copy\("carDetails\.comparePrices"\)/);
  assert.match(clientSource, /pickup: copy\("carDetails\.pickupReturn"\)/);
  assert.match(clientSource, /location: copy\("carDetails\.location"\)/);

  assert.match(clientSource, /showSectionHeading={false}/);
  assert.match(
    clientSource,
    /showSectionHeading={presentation !== "standalone-content"}/,
  );

  const comparison = sourceBetween(
    clientSource,
    "function CarPriceComparisonSection",
    "function CarLocationSection",
  );
  assert.match(comparison, /showSectionHeading \? \(/);
  assert.match(comparison, /carDetails\.comparePrices/);

  const location = sourceBetween(
    clientSource,
    "function CarLocationSection",
    "function BookingSummary",
  );
  assert.match(location, /showSectionHeading \? \(/);
  assert.match(location, /carDetails\.location/);

  const pickup = sourceBetween(
    clientSource,
    "function PickupReturnSection",
    "function MobileBookingDock",
  );
  assert.match(pickup, /showSectionHeading \? \(/);
  assert.match(pickup, /carDetails\.pickupReturn/);
});

test("desktop car details use the production hero, toolbar context, and balanced amenities", () => {
  assert.match(heroSource, /data-car-details-desktop-centered-image/);
  assert.match(heroSource, /lg:max-w-\[900px\] lg:bg-\[#F5F7FB\]/);
  assert.match(heroSource, /sizes={reserveMobileControlSafeZone \? "900px" : "760px"}/);
  assert.match(heroSource, /data-car-details-desktop-identity-row/);
  assert.match(
    heroSource,
    /!reserveMobileControlSafeZone \? \([\s\S]*?data-car-details-desktop-identity-row/,
  );
  assert.match(heroSource, /data-car-details-desktop-actions/);
  assert.doesNotMatch(heroSource, /data-car-details-desktop-back/);
  assert.doesNotMatch(heroSource, /data-car-details-desktop-hero-actions/);
  assert.match(heroSource, /\[&_h1\]:truncate/);
  assert.match(
    heroSource,
    /data-car-details-specifications[\s\S]*?lg:max-w-\[900px\][\s\S]*?lg:grid-cols-2[\s\S]*?lg:gap-x-16/,
  );
  assert.doesNotMatch(heroSource, /position: fixed !important/);

  assert.match(clientSource, /data-car-details-desktop-sticky-controls/);
  assert.match(clientSource, /data-car-details-desktop-sticky-context/);
  assert.match(
    clientSource,
    /pointer-events-none absolute left-1\/2 top-1\/2 hidden w-\[52%\] max-w-\[34rem\] -translate-x-1\/2 -translate-y-1\/2 text-center lg:block/,
  );
  assert.match(
    clientSource,
    /text-\[15px\] font-extrabold leading-\[19px\] tracking-\[-0\.18px\]/,
  );
  assert.match(
    clientSource,
    /mt-1 truncate text-\[10px\] font-bold uppercase leading-3 tracking-\[0\.14em\]/,
  );
  assert.match(clientSource, /data-car-details-desktop-back-link/);
  assert.match(
    clientSource,
    /size-10 items-center justify-center rounded-full border border-slate-300 bg-\[#E7EBF1\]/,
  );
  assert.match(
    clientSource,
    /desktop \? "size-10 rounded-full border border-slate-300 bg-\[#E7EBF1\]/,
  );
  assert.match(
    clientSource,
    /data-car-details-desktop-sticky-controls[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.match(
    clientSource,
    /presentation === "guided-content"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.doesNotMatch(clientSource, /desktopImageActions=/);

  const sandboxStart = clientSource.indexOf(
    'car.inventorySource === "kayak-sandbox"',
  );
  const heroStart = clientSource.indexOf("<CarDetailsHero");
  assert.ok(
    sandboxStart >= 0 && heroStart > sandboxStart,
    "KAYAK and Kurioticket continue through the same standalone desktop controls",
  );
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

test("price comparison aligns icon benefits and the per-day price on one row", () => {
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
  assert.doesNotMatch(clientSource, /label: copy\("continueToProvider"\)/);
});

test("source contract does not restore removed booking-disabled messaging", () => {
  assert.doesNotMatch(
    clientSource,
    /demo-booking-note|carDetails\.bookingUnavailable|carDetails\.bookingDisabledExplanation/,
  );
});


test("mobile-web car detail transmission uses the dedicated gearbox icon without changing desktop", () => {
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
    /mobileTransmissionIcon[\s\S]*?lg:hidden[\s\S]*?<CarFront[\s\S]*?hidden shrink-0 text-slate-600 lg:block/,
  );
});
