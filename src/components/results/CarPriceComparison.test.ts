import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./CarResultCard.tsx", import.meta.url), "utf8");
const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
const comparison = readFileSync(new URL("./CarPriceComparison.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
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
  assert.ok(picker.includes('compact ? "text-[12px] leading-4" : "text-[10px] leading-3 lg:text-[12px] lg:leading-4"'));
  assert.ok(picker.includes('compact ? "flex h-9 items-center text-[13px] leading-[17px]"'));
  assert.ok(picker.includes('compact ? "text-[13px] leading-4"'));
  assert.match(picker, /data-car-deal-picker-compact/);
  assert.ok(picker.includes('min-h-9 max-[359px]:grid-cols-1'));
  assert.ok(picker.includes('compact ? "min-h-9" : "min-h-6"'));
  assert.ok(picker.includes('compact ? "h-9 w-8 place-self-center" : "h-6 w-7"'));
  assert.ok(picker.includes('max-[409px]:hidden'));
  assert.ok(picker.includes('h-9 w-8'));
  assert.match(picker, /Info size=\{compact \? 18 : 16\}/);
  assert.equal((picker.match(/fontSize: 11, lineHeight: "16px", fontWeight: 600/g) ?? []).length, 1);
  assert.match(card, /data-car-card-mobile-offers\s+className="w-full min-w-0 px-2 py-1\.5"/);
  assert.doesNotMatch(card, /data-car-card-mobile-pricing/);
  assert.ok(picker.includes('min-w-0 flex-1 truncate whitespace-nowrap font-semibold'));
  assert.match(picker, /compact \? "gap-0\.5" : "gap-1"/);
  assert.ok(picker.includes('grid-cols-[minmax(0,calc(68%_+_20px))_minmax(0,1fr)]'));
  assert.ok(picker.includes('grid-cols-[minmax(0,calc(50%_+_31px))_minmax(0,1fr)]'));
  assert.match(picker, /const offer = group\.primaryOffer/);
  assert.match(picker, /amount: offer\.pricePerDay/);
  assert.match(picker, /\{formatOfferPrice\(offer\)\}/);
  assert.match(picker, />\/day</);
  assert.match(picker, /data-car-deal-provider-view-deal/);
  assert.match(picker, />\s*View deal\s*</);
});

test("mobile provider hierarchy is subtly larger inside the existing fixed-height offer rows", () => {
  const providerMark = picker.slice(picker.indexOf("function ProviderMark"), picker.indexOf("const rateSectionIcons"));
  assert.match(providerMark, /compact \? "h-\[19px\] w-\[19px\] max-w-full object-contain" : "h-4 w-4 max-w-full object-contain lg:h-\[18px\] lg:w-\[18px\]"/);
  assert.match(providerMark, /compact \? "text-\[12px\]" : "text-\[10px\] lg:text-\[11px\]"/);
  const rows = picker.slice(picker.indexOf("data-car-deal-provider-offers"), picker.indexOf("data-car-deal-more-slot"));
  assert.match(rows, /compact \? "grid-cols-\[minmax\(0,calc\(68%_\+_20px\)\)_minmax\(0,1fr\)\] min-h-9 max-\[359px\]:grid-cols-1 max-\[359px\]:py-1"/);
  assert.match(rows, /compact \? "inline-flex h-\[19px\] w-\[19px\] shrink-0 items-center justify-center overflow-hidden"/);
  assert.match(rows, /compact \? "text-\[12px\] leading-4"/);
  assert.match(rows, /Info size=\{compact \? 18 : 16\}/);
  assert.match(rows, /compact \? "flex h-9 items-center text-\[13px\] leading-\[17px\]"/);
  assert.match(rows, /compact \? "text-\[11px\] leading-\[15px\]" : "ml-0\.5 lg:text-\[11px\]"/);
  assert.equal((rows.match(/compact \? "text-\[13px\] leading-4"/g) ?? []).length, 2);
  assert.match(rows, /View deal <ChevronRight size=\{12\}/);
  assert.match(rows, /compact \? "h-9 w-8 place-self-center" : "h-6 w-7"/);
  assert.match(rows, /compact \? "min-h-9" : "min-h-6"/);
  assert.match(picker, /data-car-deal-more-slot className="mt-0\.5 flex min-h-9 items-center md:mt-1 md:min-h-6 lg:mt-1"/);
  assert.match(rows, /"grid-cols-\[minmax\(0,calc\(50%_\+_31px\)\)_minmax\(0,1fr\)\] min-h-6 lg:min-h-\[30px\]"/);
});

test("mobile information glyph and amount/day group share the same row center and baseline", () => {
  const rows = picker.slice(picker.indexOf("data-car-deal-provider-offers"), picker.indexOf("data-car-deal-more-slot"));
  assert.match(rows, /compact \? "h-9 w-8 place-self-center" : "h-6 w-7"/);
  assert.ok(rows.includes('data-car-rate-info-spacer aria-hidden="true" className={compact ? "h-9 w-8 place-self-center" : "h-6 w-7"}'));
  assert.match(rows, /Info size=\{compact \? 18 : 16\}/);
  assert.match(rows, /compact \? "flex h-9 items-center text-\[13px\] leading-\[17px\]" : "text-xs leading-\[14px\] lg:text-\[13px\] lg:leading-\[17px\]"/);
  assert.match(rows, /data-car-deal-price-baseline/);
  assert.match(rows, /compact \? "inline-flex max-w-full items-baseline gap-0\.5 whitespace-nowrap" : "contents"/);
  assert.match(rows, /data-car-deal-price-amount/);
  assert.match(rows, /data-car-deal-provider-per-day/);
  assert.match(rows, /compact \? "text-\[11px\] leading-\[15px\]" : "ml-0\.5 lg:text-\[11px\]"/);
  assert.match(rows, /compact \? "grid-cols-\[minmax\(0,calc\(68%_\+_20px\)\)_minmax\(0,1fr\)\] min-h-9/);
  assert.match(rows, /compact \? "grid-cols-\[minmax\(0,1fr\)_32px_66px\] pr-2"/);
  assert.match(rows, /compact \? "min-h-9" : "min-h-6"/);
});

test("desktop provider rows balance flexible branding, price, and right-aligned View deal only at lg+", () => {
  const rows = picker.slice(picker.indexOf("data-car-deal-provider-offers"), picker.indexOf("data-car-deal-more-slot"));
  assert.match(rows, /!compact \? "lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,1fr\)\]" : ""/);
  assert.match(rows, /compact \|\| expanded \? "justify-end pr-2" : "justify-start lg:justify-end lg:pr-2"/);
  assert.match(rows, /compact \? "grid-cols-\[minmax\(0,calc\(68%_\+_20px\)\)_minmax\(0,1fr\)\]/);
  assert.match(rows, /: "grid-cols-\[minmax\(0,calc\(50%_\+_31px\)\)_minmax\(0,1fr\)\] min-h-6 lg:min-h-\[30px\]"/);
  assert.match(rows, /data-car-deal-provider-meta/);
  assert.match(rows, /data-car-deal-provider-price/);
  assert.match(rows, /data-car-deal-provider-action-slot/);
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
  assert.ok(picker.includes('compact ? "grid-cols-[minmax(0,1fr)_32px_66px] pr-2" : "grid-cols-[minmax(0,1fr)_28px_66px] pr-2"'));
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

test("desktop main View deal remains independently validated", () => {
  assert.match(card, /const approvedProviderBookingUrl/);
  assert.match(card, /sandboxBookingUrl\(offer\.bookingUrl\)/);
  assert.match(card, /url\.protocol !== "https:" \|\| url\.username \|\| url\.password/);
  assert.equal((card.match(/href=\{providerBookingHref\}/g) ?? []).length, 1);
  assert.equal((card.match(/target="_blank"/g) ?? []).length, 1);
  assert.equal((card.match(/rel="noopener noreferrer"/g) ?? []).length, 1);
  assert.match(card, /aria-label="Provider booking link unavailable"/);
  assert.doesNotMatch(card, /href="#"/);
});

test("selected provider state remains available to the existing main card View deal", () => {
  assert.match(card, /const \[localSelectedOfferId, setLocalSelectedOfferId\] = useState/);
  assert.match(card, /const selectedOfferId = selectedDealOfferId \?\? localSelectedOfferId/);
  assert.match(card, /car\.offers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)/);
  assert.match(card, /const providerBookingHref = approvedProviderBookingUrl\(car, offer\)/);
  assert.equal((card.match(/href=\{providerBookingHref\}/g) ?? []).length, 1);
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
    "data-car-rate-title-row",
    "data-car-rate-total-price",
  ]) assert.ok(sheet.includes(token), token);
  assert.ok(picker.includes("getCarRateDisclosureSections(selectedOffer)"));
  assert.ok(sheet.includes('grid-cols-[44px_minmax(0,1fr)_44px] items-center'));
  assert.ok(sheet.includes('data-car-rate-heading="true" tabIndex={-1} className="min-w-0 text-center'));
  assert.ok(sheet.includes('font-semibold tabular-nums text-[#0F172A]'));
  assert.doesNotMatch(sheet, /KAYAK sandbox · Simulated rates and availability|Sandbox rate information is simulated/);
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


test("Cars Rate details uses borderless close, polished section icons, and readable right-hand values", () => {
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
  assert.ok(picker.includes('aria-hidden="true" size={18} strokeWidth={2.1}'));
  const sheet = picker.slice(picker.indexOf('data-car-rate-dialog'));
  assert.ok(sheet.includes('<RateSectionIcon id="payment" />'));
  assert.ok(sheet.includes('<RateSectionIcon id={section.id} />'));
  assert.equal((sheet.match(/<h3 className="mb-\[24px\] flex min-w-0 items-center gap-2/g) ?? []).length, 2);
  const closeButton = sheet.match(/aria-label="Close rate details"\s+className="([^"]+)"/)?.[1];
  assert.ok(closeButton);
  assert.ok(closeButton.includes("h-11 w-11"));
  assert.ok(!closeButton.includes("md:hidden"), "the close X must be visible on desktop and mobile web");
  assert.equal(closeButton.split(/\s+/).some(token => token === "border" || token.startsWith("border-")), false);
  assert.ok(closeButton.includes("focus-visible:bg-slate-100")); // Keyboard focus stays visible without a blue circle.
  assert.equal((sheet.match(/data-car-rate-fact-value className="[^"]*text-right font-medium text-\[#1E293B\]/g) ?? []).length, 2);
  assert.ok(sheet.includes('grid-cols-[minmax(0,42%)_minmax(0,1fr)]'));
  assert.ok(sheet.includes("h-[100dvh] max-h-[100dvh]"));
});


test("Rate details keeps a centered footer outside scroll with the inspected provider booking link", () => {
  const sheet = picker.slice(picker.indexOf('data-car-rate-dialog'));
  assert.match(picker, /const selectedRateBookingHref = selectedOffer \? approvedProviderBookingUrl\(car, selectedOffer\) : null/);
  assert.ok(sheet.indexOf("data-car-rate-header") < sheet.indexOf("data-car-rate-scroll"));
  assert.ok(sheet.indexOf("data-car-rate-scroll") < sheet.indexOf("data-car-rate-footer"));
  assert.match(sheet, /data-car-rate-footer[\s\S]*shrink-0 border-t border-\[#E2E8F0\]/);
  assert.ok(sheet.includes("pb-[max(16px,env(safe-area-inset-bottom))]"));
  assert.ok(sheet.includes('className="flex justify-center"'));
  assert.ok(sheet.includes("max-w-[240px]"));
  assert.match(sheet, /href=\{selectedRateBookingHref\}/);
  assert.match(sheet, /data-car-rate-view-deal/);
  assert.match(sheet, /aria-label=\{"View deal from " \+ selectedGroup\.providerName\}/);
  assert.match(sheet, /target="_blank"/);
  assert.match(sheet, /rel="noopener noreferrer"/);
  assert.match(sheet, /data-car-rate-view-deal-unavailable/);
  assert.match(sheet, /\sdisabled\s+data-car-rate-view-deal-unavailable/);
  assert.match(sheet, /onClick=\{isolateProviderAction\}/);
});

test("Rate details footer View deal text is centered without arrows on mobile and desktop", () => {
  const footer = picker.slice(picker.indexOf("data-car-rate-footer"));
  assert.ok(footer.startsWith("data-car-rate-footer"));
  assert.doesNotMatch(footer, /ChevronRight|<svg/);
  assert.equal((footer.match(/>\s*View deal\s*</g) ?? []).length, 2);
  assert.equal((footer.match(/items-center justify-center rounded-lg/g) ?? []).length, 2);
  assert.doesNotMatch(footer, /items-center justify-center gap-2/);
  assert.match(footer, /data-car-rate-view-deal/);
  assert.match(footer, /data-car-rate-view-deal-unavailable/);
  assert.match(picker, /View deal <ChevronRight size=\{12\}/);
});

test("Cars Rate details desktop scrollbar is slim with smaller arrows and isolated from other surfaces", () => {
  const start = globalStyles.indexOf("/* Desktop Cars Rate details alone:");
  assert.ok(start >= 0, "Rate details scrollbar scope is required");
  const end = globalStyles.indexOf("@media (max-width: 639px)", start);
  assert.ok(end > start);
  const css = globalStyles.slice(start, end);
  assert.match(css, /@media \(min-width: 768px\)/);
  assert.match(css, /@supports \(-moz-appearance: none\)/);
  assert.match(css, /\[data-car-rate-dialog\] \[data-car-rate-scroll\]::-webkit-scrollbar \{\s*width: 7px;/);
  assert.match(css, /::-webkit-scrollbar-thumb \{\s*background-color: #94a3b8;/);
  assert.match(css, /::-webkit-scrollbar-button:vertical \{[\s\S]*?height: 10px;[\s\S]*?background-size: 6px 4px;/);
  assert.match(css, /::-webkit-scrollbar-button:vertical:decrement/);
  assert.match(css, /::-webkit-scrollbar-button:vertical:increment/);
  assert.doesNotMatch(css, /\[data-cars-time-list\]|\[data-cars-age-list\]|\[data-hotel/);
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
  assert.ok(!closeButton.includes("md:hidden"), "the close X must be visible on desktop and mobile web");
  assert.equal(closeButton.includes("focus-visible:ring-"), false);
  assert.equal(closeButton.includes("ring-[#004BB8]"), false);
  assert.ok(sheet.includes('focus:outline-none'));
  const results = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
  assert.match(results, /label="Car results" rowClassName="pb-3\.5 sm:pb-4 focus:outline-none"/);
  assert.match(results, /<CarResultCard/);
  assert.doesNotMatch(card.slice(card.indexOf('data-car-result-card-shell className="w-full"'), card.indexOf("data-car-card-mobile-main")), /ring-2|border-\[#004BB8\]/);
});

test("web Cars fits one to three offers and retains the overflow preview only for four or more", () => {
  const compactSource = picker.slice(picker.indexOf("const INITIAL_VISIBLE_OFFER_COUNT"));
  const toggle = compactSource.slice(compactSource.indexOf("{hasMoreOffers ? ("));
  assert.match(compactSource, /const INITIAL_VISIBLE_OFFER_COUNT = 3/);
  assert.match(compactSource, /hasMoreOffers = groups\.length > INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(compactSource, /hasMoreOffers \? "min-h-\[108px\] md:min-h-\[76px\]" : ""/);
  assert.match(compactSource, /hasMoreOffers \? \(compact \? "max-\[359px\]:min-h-\[240px\]" : "lg:min-h-\[98px\]"\) : ""/);
  assert.match(toggle, /\{hasMoreOffers \? \(\s*<div data-car-deal-more-slot/);
  assert.match(toggle, /Show fewer offers/);
  assert.match(toggle, /aria-expanded=\{expanded\}/);
  assert.match(toggle, /groups\.length - INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(compactSource, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
  assert.doesNotMatch(compactSource, /groups\.slice\(/);
  assert.match(compactSource, /groups\.map\(\(group, index\) =>/);
  assert.equal((compactSource.match(/data-car-deal-more-offers/g) ?? []).length, 1);
});

test("desktop-only Cars offers toggle text is compact but mobile font is unchanged", () => {
  const control = picker.slice(picker.indexOf("data-car-deal-more-offers"), picker.indexOf("data-car-rate-dialog"));
  assert.match(control, /text-\[10px\] font-semibold text-\[#004BB8\] md:min-h-6 lg:text-\[12px\] lg:font-semibold/);
  assert.match(control, /style=\{compact \? \{ fontSize: 11, lineHeight: "16px", fontWeight: 600 \} : undefined\}/);
  assert.match(control, /expanded \? "Show fewer offers"/);
  assert.match(control, /aria-expanded=\{expanded\}/);
  const globalCss = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const fontReset = globalCss.indexOf("button,\ninput,\nselect,\ntextarea {\n  font: inherit;");
  const desktopRule = globalCss.indexOf("[data-car-deal-picker]:not([data-car-deal-picker-compact]) [data-car-deal-more-offers]");
  assert.ok(fontReset >= 0 && desktopRule > fontReset, "desktop rule follows the unlayered font reset");
  assert.match(globalCss.slice(fontReset, desktopRule), /@media \(min-width: 1024px\)/);
  assert.match(globalCss.slice(desktopRule, desktopRule + 155), /font-size: 12px;\s*line-height: 16px;\s*font-weight: 600;/);
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
  assert.match(offers, /data-car-rate-info-spacer/);
  assert.match(offers, /grid min-w-0 items-center gap-x-2/);
  assert.match(offers, /grid-cols-\[minmax\(0,1fr\)_32px_66px\]/);
  assert.match(offers, /grid-cols-\[minmax\(0,1fr\)_28px_66px\]/);
  assert.match(offers, /aria-label=\{"Rate information for " \+ group\.providerName/);
  assert.match(offers, /setDetailsKey\(group\.key\)/);
  assert.match(offers, /grid-cols-\[minmax\(0,calc\(68%_\+_20px\)\)_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(offers.slice(offers.indexOf('data-car-deal-provider-action-slot')), /<Info/);
});

test("Cars provider expansion is parent-controlled and keeps supplier clickout actions", () => {
  assert.match(picker, /expanded: boolean;/);
  assert.match(picker, /onExpandedChange: \(expanded: boolean\) => void;/);
  assert.match(picker, /onExpandedChange\(!expanded\)/);
  assert.doesNotMatch(picker, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(picker, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /compact \|\| expanded \? "justify-end pr-2" : "justify-start lg:justify-end lg:pr-2"/);
  assert.match(picker, /href=\{bookingHref\}/);
  assert.match(picker, /setDetailsKey\(group\.key\)/);
});

test("desktop rows stay compact while full-width mobile provider rows keep their touch targets", () => {
  // Desktop rows remain 30px with 4px gaps. Only overflow cards reserve three row slots.
  assert.ok(picker.includes('compact ? "space-y-0" : "space-y-0.5 lg:space-y-1"'));
  assert.ok(picker.includes('hasMoreOffers ? (compact ? "max-[359px]:min-h-[240px]" : "lg:min-h-[98px]") : ""'));
  assert.ok(picker.includes(': "grid-cols-[minmax(0,calc(50%_+_31px))_minmax(0,1fr)] min-h-6 lg:min-h-[30px]"'));
  assert.ok(picker.includes('data-car-deal-more-slot className="mt-0.5 flex min-h-9 items-center md:mt-1 md:min-h-6 lg:mt-1"'));
  // Preserve mobile 36px touch targets and price/info sizing; use the full-width mobile provider grid.
  assert.ok(picker.includes('compact ? "grid-cols-[minmax(0,calc(68%_+_20px))_minmax(0,1fr)] min-h-9 max-[359px]:grid-cols-1 max-[359px]:py-1"'));
  assert.ok(picker.includes('compact ? "h-9 w-8 place-self-center" : "h-6 w-7"'));
  assert.ok(picker.includes('compact ? "min-h-9" : "min-h-6"'));
  assert.match(picker, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
});

test("desktop provider styles remain unchanged while mobile offer typography scales proportionately", () => {
  assert.ok(picker.includes('compact ? "h-[19px] w-[19px] max-w-full object-contain" : "h-4 w-4 max-w-full object-contain lg:h-[18px] lg:w-[18px]"'));
  assert.ok(picker.includes('lg:h-[18px] lg:w-[18px]"'));
  assert.ok(picker.includes('text-[10px] leading-3 lg:text-[12px] lg:leading-4'));
  assert.ok(picker.includes('text-xs leading-[14px] lg:text-[13px] lg:leading-[17px]'));
  assert.ok(picker.includes('text-[11px] leading-4 lg:text-[12px]'));
  assert.ok(picker.includes('compact ? "text-[12px] leading-4"'));
  assert.ok(picker.includes('compact ? "flex h-9 items-center text-[13px] leading-[17px]"'));
  assert.ok(picker.includes('style={compact ? { fontSize: 11, lineHeight: "16px", fontWeight: 600 } : undefined}'));
});

test("Cars web offer sections use content height for 1-3 and reserve the preview only for 4+", () => {
  const offerList = picker.slice(picker.indexOf("data-car-deal-provider-offers"), picker.indexOf("{groups.map("));
  assert.match(picker, /hasMoreOffers = groups\.length > INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(offerList, /hasMoreOffers \? "min-h-\[108px\] md:min-h-\[76px\]" : ""/);
  assert.match(offerList, /compact \? "space-y-0" : "space-y-0.5 lg:space-y-1"/);
  assert.match(offerList, /hasMoreOffers \? \(compact \? "max-\[359px\]:min-h-\[240px\]" : "lg:min-h-\[98px\]"\) : ""/);
  assert.match(picker, /\{hasMoreOffers \? \(\s*<div data-car-deal-more-slot/);
  assert.match(picker, /flex min-h-9 items-center md:mt-1 md:min-h-6/);
  assert.match(picker, /compact \? "grid-cols-\[minmax/);
  assert.match(picker, /responsiveVisibility = expanded \|\| index < INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /min-h-9 max-\[359px\]:grid-cols-1/);
  assert.match(picker, /: "grid-cols-\[minmax\(0,calc\(50%_\+_31px\)\)_minmax\(0,1fr\)\] min-h-6 lg:min-h-\[30px\]"/);
  assert.match(picker, /groups\.map\(\(group, index\) =>/);
  assert.doesNotMatch(picker, /Reserve a disclosure row even when only one or two/);
  assert.doesNotMatch(picker, /placeholder|Empty provider|ghost rate/i);
});
