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

test("provider offers render every normalized provider without a three-provider cutoff", () => {
  assert.match(card, /<CarDealPicker/);
  assert.match(picker, /getCarDealPickerGroups\(car\)/);
  assert.match(picker, /groups\.map\(\(group, index\) =>/);
  assert.doesNotMatch(picker, /groups\.slice\(/);
  assert.match(picker, /data-car-deal-provider-offers/);
  assert.match(picker, /data-car-deal-provider-offer/);
  assert.doesNotMatch(picker, /data-car-deal-provider-chips|extraCount|Compare providers/);
});

test("provider offers show logo, name, per-day price and a direct provider View deal", () => {
  assert.match(picker, /\/brand\/kurioticket-icon-blue\.svg/);
  assert.match(picker, /group\.logoUrl/);
  assert.match(picker, /title=\{group\.providerName\}/);
  assert.match(picker, /data-car-deal-provider-name/);
  assert.ok(picker.includes('text-[9px] leading-[11px] tracking-[-0.01em]'));
  assert.ok(picker.includes('min-w-0 truncate whitespace-nowrap font-semibold'));
  assert.match(picker, /compact \? "gap-0\.5" : "gap-1"/);
  assert.ok(picker.includes('grid-cols-[minmax(0,calc(50%_+_20px))_minmax(0,1fr)]'));
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
  assert.match(picker, /responsiveVisibility = expanded \? "grid" : index < 3 \? "grid" : index < 5 \? "hidden md:grid" : "hidden"/);
  assert.match(picker, /groups\.length > 3/);
  assert.match(picker, /groups\.length > 5/);
  assert.match(picker, /data-car-deal-more-offers/);
  assert.match(picker, /data-car-rate-info/);
  assert.match(picker, /data-car-rate-dialog/);
  assert.match(picker, /dialog\.showModal\(\)/);
  assert.match(picker, /getCarRateDisclosureSections\(selectedOffer\)/);
  assert.doesNotMatch(picker, /data-car-rate-terms|CarRateDetails\(/);
  assert.match(picker, /data-car-deal-provider-meta/);
  assert.match(picker, /data-car-deal-provider-action-slot/);
  assert.ok(picker.includes('compact ? "pr-2" : "pr-3"'));
  assert.match(card, /data-car-card-mobile-specs[\s\S]*grid grid-cols-2 gap-x-1/);
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
