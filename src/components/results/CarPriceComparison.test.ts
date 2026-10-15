import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./CarResultCard.tsx", import.meta.url), "utf8");
const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
const comparison = readFileSync(new URL("./CarPriceComparison.tsx", import.meta.url), "utf8");
const desktop = card.slice(card.indexOf('data-region="heading"'));
const specs = desktop.slice(
  desktop.indexOf("data-car-card-desktop-primary-specs"),
  desktop.indexOf('data-region="pricing"'),
);

test("standalone desktop owns exactly four required primary specifications", () => {
  for (const value of ["car.passengers", "car.bags", "car.doors", "car.transmission"]) {
    assert.match(card, new RegExp(value.replace(".", "\\.")));
  }
  assert.match(specs, /guidedPlanning \? specifications : desktopStandaloneSpecifications/);
  assert.match(card, /guidedPlanning && car\.airConditioning/);
  assert.doesNotMatch(specs, /Air conditioning|Snowflake/);
});

test("provider offers retain all normalized sellers behind a three-row desktop preview", () => {
  assert.match(card, /<CarDealPicker/);
  assert.match(picker, /getCarDealPickerGroups\(car\)/);
  assert.match(picker, /groups\.map\(\(group, index\) =>/);
  assert.doesNotMatch(picker, /groups\.slice\(/);
  assert.match(picker, /const INITIAL_VISIBLE_OFFER_COUNT = 3;/);
  assert.doesNotMatch(picker, /INITIAL_DESKTOP_OFFER_COUNT|INITIAL_MOBILE_OFFER_COUNT/);
  assert.match(picker, /data-car-deal-provider-offers/);
  assert.match(picker, /data-car-deal-provider-offer/);
  assert.doesNotMatch(picker, /data-car-deal-provider-chips|extraCount|Compare providers/);
});

test("provider offers show logo, name, per-day price and a direct provider View deal", () => {
  assert.match(picker, /\/brand\/kurioticket-icon-blue\.svg/);
  assert.match(picker, /group\.logoUrl/);
  assert.match(picker, /title=\{group\.providerName\}/);
  assert.match(picker, /data-car-deal-provider-name/);
  assert.ok(picker.includes('text-[11px] leading-[15px]'));
  assert.ok(picker.includes('text-[12px] leading-[16px]'));
  assert.ok(picker.includes('text-[12px] leading-4'));
  assert.match(picker, /data-car-deal-picker-compact/);
  assert.ok(picker.includes('min-h-9 max-[359px]:grid-cols-1'));
  assert.ok(picker.includes('compact ? "min-h-9" : "min-h-6"'));
  assert.ok(picker.includes('compact ? "h-9 w-8 max-[389px]:w-7" : "h-6 w-7"'));
  assert.ok(picker.includes('max-[409px]:hidden'));
  assert.ok(picker.includes('h-9 w-8 max-[389px]:w-7'));
  assert.match(picker, /Info size=\{compact \? 17 : 16\}/);
  assert.equal((picker.match(/fontSize: 11, lineHeight: "16px", fontWeight: 600/g) ?? []).length, 1);
  assert.match(card, /data-car-card-mobile-offers[\s\S]*flex-\[2\.65\]/);
  assert.match(card, /data-car-card-mobile-pricing[\s\S]*flex-\[1\.1\]/);
  assert.ok(picker.includes('min-w-0 truncate whitespace-nowrap font-semibold'));
  assert.match(picker, /compact \? "gap-0\.5" : "gap-1"/);
  assert.ok(picker.includes('grid-cols-[minmax(0,calc(65%_+_20px))_minmax(0,1fr)]'));
  assert.ok(picker.includes('grid-cols-[minmax(0,calc(50%_+_31px))_minmax(0,1fr)]'));
  assert.match(picker, /const offer = group\.primaryOffer/);
  assert.match(picker, /amount: offer\.pricePerDay/);
  assert.match(picker, /\{formatOfferPrice\(offer\)\}/);
  assert.match(picker, />\/day</);
  assert.match(picker, /data-car-deal-provider-view-deal/);
  assert.match(picker, />\s*View deal\s*</);
});

test("provider View deal validates its own URL and stays isolated from main offer selection", () => {
  assert.match(picker, /const approvedProviderBookingUrl/);
  assert.match(picker, /sandboxBookingUrl\(offer\.bookingUrl\)/);
  assert.match(picker, /url\.protocol !== "https:" \|\| url\.username \|\| url\.password/);
  assert.match(picker, /const bookingHref = approvedProviderBookingUrl\(car, offer\)/);
  assert.match(picker, /href=\{bookingHref\}/);
  assert.match(picker, /target="_blank"/);
  assert.match(picker, /rel="noopener noreferrer"/);
  assert.match(picker, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(picker, /onSelectOffer\(group\.primaryOffer\)/);
  assert.doesNotMatch(picker, /setLocalSelectedOfferId|onDealOfferSelected/);
});

test("inline provider offers do not retain the old comparison overlays", () => {
  assert.ok(picker.includes('min-w-0 items-center'));
  assert.ok(picker.includes('min-h-6'));
  assert.match(picker, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /groups\.length > INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /groups\.length - INITIAL_VISIBLE_OFFER_COUNT/);
  assert.equal((picker.match(/data-car-deal-more-offers/g) ?? []).length, 1);
  assert.match(picker, /data-car-deal-more-slot/);
  assert.match(picker, /data-car-deal-more-offers/);
  assert.match(picker, /data-car-rate-info/);
  assert.match(picker, /data-car-rate-dialog/);
  assert.match(picker, /dialog\.showModal\(\)/);
  assert.match(picker, /getCarRateDisclosureSections\(selectedOffer\)/);
  assert.doesNotMatch(picker, /data-car-rate-terms|CarRateDetails\(/);
  assert.match(picker, /data-car-deal-provider-meta/);
  assert.match(picker, /data-car-deal-provider-action-slot/);
  assert.ok(picker.includes('compact ? "pr-2" : "pr-3"'));
  assert.match(card, /data-car-card-mobile-specs[\s\S]*grid min-w-0 grid-cols-2 gap-x-2/);
  assert.match(card, /data-car-card-mobile-offers[\s\S]*<CarDealPicker/);
  assert.ok(card.indexOf("data-car-card-mobile-specs") < card.indexOf("data-car-card-mobile-lower-band"));
  assert.match(card, /data-car-card-desktop-primary-specs[\s\S]*grid gap-x-5/);
  assert.match(picker, /role="list"/);
  assert.match(picker, /role="listitem"/);
  assert.doesNotMatch(picker, /grid-cols-3|Compare deals/);
  assert.doesNotMatch(
    picker,
    /createPortal|ProviderPreview|ProviderList|data-car-deal-picker-mobile-sheet|data-car-deal-picker-desktop-panel|acquireMobileResultsScrollLock/,
  );
});

test("standalone main View deal remains independently validated", () => {
  assert.match(card, /const approvedProviderBookingUrl/);
  assert.match(card, /sandboxBookingUrl\(offer\.bookingUrl\)/);
  assert.match(card, /url\.protocol !== "https:" \|\| url\.username \|\| url\.password/);
  assert.equal((card.match(/href=\{providerBookingHref\}/g) ?? []).length, 2);
  assert.equal((card.match(/target="_blank"/g) ?? []).length, 2);
  assert.equal((card.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.match(card, /aria-label="Provider booking link unavailable"/);
  assert.doesNotMatch(card, /href="#"/);
});

test("selected provider state remains available to the existing main card View deal", () => {
  assert.match(card, /const \[localSelectedOfferId, setLocalSelectedOfferId\] = useState/);
  assert.match(card, /const selectedOfferId = selectedDealOfferId \?\? localSelectedOfferId/);
  assert.match(card, /car\.offers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)/);
  assert.match(card, /const providerBookingHref = approvedProviderBookingUrl\(car, offer\)/);
  assert.equal((card.match(/href=\{providerBookingHref\}/g) ?? []).length, 2);
  assert.match(desktop, /dailyDisplayPrice\.formatted/);
  assert.doesNotMatch(desktop, /<CarPriceComparison/);
});

test("guided selection and legacy comparison component remain isolated from standalone provider handoff", () => {
  assert.match(desktop, /onClick=\{\(\) => onSelect\(car\)\}/);
  assert.match(card, /href=\{detailsHref\}/);
  assert.match(card, /onClick=\{handleMobileDetailsNavigation\}/);
  assert.match(comparison, /desktopDetailsSelector/);
  assert.doesNotMatch(comparison, /window\.open|router\./);
});

test("Cars rate details match Flight Details white, far-right fact alignment and readable hierarchy", () => {
  const sheet = picker.slice(picker.indexOf('data-car-rate-dialog'));
  for (const token of [
    "bg-white",
    "data-car-rate-fact-row",
    "data-car-rate-fact-value",
    "grid-cols-[minmax(0,42%)_minmax(0,1fr)]",
    "whitespace-pre-wrap text-right",
    "min-w-0 break-words",
    "text-[15px] font-semibold leading-[21px]",
    "divide-y divide-[#E2E8F0]",
    'data-car-rate-section="payment"',
    "Price and payment",
    "disclosureSections.filter(section => section.id !== \"payment\")",
    "data-car-rate-source-note",
  ]) assert.ok(sheet.includes(token), token);
  assert.ok(picker.includes("getCarRateDisclosureSections(selectedOffer)"));
});


test("Cars mobile Rate details fills the viewport with a fixed safe-area header and independent scroll", () => {
  const sheet = picker.slice(picker.indexOf('data-car-rate-dialog'));
  for (const token of [
    "h-[100dvh] max-h-[100dvh]",
    "overflow-hidden",
    "open:flex",
    "rounded-none border-0 bg-white p-0",
    "data-car-rate-header",
    "shrink-0 border-b",
    "pt-[max(14px,env(safe-area-inset-top))]",
    "data-car-rate-scroll",
    "min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto",
    "pb-[max(24px,env(safe-area-inset-bottom))]",
    "md:h-auto md:max-h-[80dvh]",
    "md:w-[540px]",
    "md:rounded-2xl",
    "text-[15px] font-semibold leading-[21px]",
    "Close rate details",
  ]) assert.ok(sheet.includes(token), token);
  assert.doesNotMatch(sheet, /max-h-\[85dvh\]|font-bold uppercase|tracking-\[0\.85px\]/);
  assert.equal((sheet.match(/text-\[15px\] font-semibold leading-\[21px\]/g) ?? []).length, 2);
  assert.ok(sheet.indexOf("data-car-rate-header") < sheet.indexOf("data-car-rate-scroll"));
  assert.ok(sheet.indexOf("data-car-rate-scroll") < sheet.indexOf("data-car-rate-section"));
});


test("Cars Rate details uses borderless close, left-side semantic section icons, and softer right-hand values", () => {
  const iconMapping = picker.slice(picker.indexOf("const rateSectionIcons"), picker.indexOf("function RateSectionIcon"));
  for (const [id, name] of [
    ["payment", "Wallet"],
    ["policies", "ShieldCheck"],
    ["pickup", "MapPin"],
    ["driver", "IdCard"],
    ["vehicle", "CarFront"],
    ["other", "Info"],
  ]) assert.ok(iconMapping.includes(id + ": " + name), id);
  assert.ok(picker.includes('data-car-rate-section-icon={id}'));
  assert.ok(picker.includes('aria-hidden="true" size={17} strokeWidth={1.8}'));
  const sheet = picker.slice(picker.indexOf('data-car-rate-dialog'));
  assert.ok(sheet.includes('<RateSectionIcon id="payment" />'));
  assert.ok(sheet.includes('<RateSectionIcon id={section.id} />'));
  assert.equal((sheet.match(/<h3 className="mb-3 flex min-w-0 items-center gap-2/g) ?? []).length, 2);
  const closeButton = sheet.match(/aria-label="Close rate details"\s+className="([^"]+)"/)?.[1];
  assert.ok(closeButton);
  assert.ok(closeButton.includes("h-11 w-11"));
  assert.equal(closeButton.split(/\s+/).some(token => token === "border" || token.startsWith("border-")), false);
  assert.ok(closeButton.includes("focus-visible:bg-slate-100")); // Keyboard focus stays visible without a blue circle.
  assert.equal((sheet.match(/data-car-rate-fact-value className="[^"]*text-right font-normal text-\[#334155\]/g) ?? []).length, 2);
  assert.ok(sheet.includes('grid-cols-[minmax(0,42%)_minmax(0,1fr)]'));
  assert.ok(sheet.includes("h-[100dvh] max-h-[100dvh]"));
});


test("touch-opened Cars rate details focuses its accessible heading instead of producing a blue close-button halo", () => {
  const sheet = picker.slice(picker.indexOf('data-car-rate-dialog'));
  for (const required of [
    "const dialogHeadingRef = useRef<HTMLHeadingElement>(null)",
    "dialog.showModal();",
    "dialogHeadingRef.current?.focus({ preventScroll: true });",
    "ref={dialogHeadingRef}",
    "data-car-rate-heading=\"true\"",
    "tabIndex={-1}",
    "focus:outline-none",
    "focus-visible:bg-slate-100",
  ]) assert.ok(picker.includes(required), required);
  const closeButton = sheet.match(/aria-label="Close rate details"\s+className="([^"]+)"/)?.[1];
  assert.ok(closeButton);
  assert.ok(closeButton.includes("h-11 w-11"));
  assert.equal(closeButton.includes("focus-visible:ring-"), false);
  assert.equal(closeButton.includes("ring-[#004BB8]"), false);
  assert.ok(sheet.includes('focus:outline-none'));
  const results = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
  assert.match(results, /label="Car results" rowClassName="pb-3\.5 sm:pb-4 focus:outline-none"/);
  assert.match(results, /<CarResultCard/);
  assert.doesNotMatch(card.slice(card.indexOf('data-car-result-card-shell className="w-full"'), card.indexOf("data-car-card-mobile-main")), /ring-2|border-\[#004BB8\]/);
});

test("desktop and mobile web use the same three-offer preview with a reserved disclosure slot", () => {
  const compactSource = picker.slice(picker.indexOf("const INITIAL_VISIBLE_OFFER_COUNT"));
  const toggle = compactSource.slice(compactSource.indexOf("{groups.length > INITIAL_VISIBLE_OFFER_COUNT ? ("));
  assert.match(compactSource, /const INITIAL_VISIBLE_OFFER_COUNT = 3/);
  assert.match(toggle, /Show fewer offers/);
  assert.match(toggle, /aria-expanded=\{expanded\}/);
  assert.match(toggle, /groups\.length - INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(compactSource, /data-car-deal-more-slot className="mt-0\.5 flex min-h-9 items-center md:mt-1 md:min-h-6"/);
  assert.match(compactSource, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
  assert.doesNotMatch(compactSource, /groups\.slice\(/);
  assert.match(compactSource, /groups\.map\(\(group, index\) =>/);
  assert.equal((compactSource.match(/data-car-deal-more-offers/g) ?? []).length, 1);
});

test("Cars inline offer rows place info after provider branding and before price and link on web", () => {
  const offers = picker.slice(picker.indexOf('data-car-deal-provider-offers'), picker.indexOf('{groups.length > INITIAL_VISIBLE_OFFER_COUNT ? ('));
  const logoAt = offers.indexOf('<ProviderMark group={group} compact={compact} />');
  const nameAt = offers.indexOf('data-car-deal-provider-name');
  const infoAt = offers.indexOf('data-car-rate-info');
  const priceAt = offers.indexOf('data-car-deal-provider-price');
  const viewDealAt = offers.indexOf('data-car-deal-provider-view-deal');
  assert.ok(logoAt >= 0 && logoAt < nameAt && nameAt < infoAt && infoAt < priceAt && priceAt < viewDealAt);
  assert.match(offers, /data-car-deal-provider-brand/);
  assert.match(offers, /ml-1\.5 inline-flex shrink-0 items-center/);
  assert.match(offers, /aria-label=\{"Rate information for " \+ group\.providerName/);
  assert.match(offers, /setDetailsKey\(group\.key\)/);
  assert.match(offers, /grid-cols-\[minmax\(0,calc\(65%_\+_20px\)\)_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(offers.slice(offers.indexOf('data-car-deal-provider-action-slot')), /<Info/);
});

test("Cars offers reserve a stable three-row preview without fabricating provider options", () => {
  assert.match(picker, /min-h-\[108px\] md:min-h-\[76px\]/);
  assert.match(picker, /max-\[359px\]:min-h-\[240px\]/);
  assert.match(picker, /data-car-deal-more-slot/);
  assert.match(picker, /flex min-h-9 items-center md:mt-1 md:min-h-6/);
  assert.match(picker, /compact \? "grid-cols-\[minmax/);
  assert.match(picker, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /min-h-9 max-\[359px\]:grid-cols-1/);
  assert.match(picker, /: "grid-cols-\[minmax\(0,calc\(50%_\+_31px\)\)_minmax\(0,1fr\)\] min-h-6"/);
  assert.match(picker, /groups\.map\(\(group, index\) =>/);
  assert.doesNotMatch(picker, /placeholder|Empty provider|ghost rate/i);
});
