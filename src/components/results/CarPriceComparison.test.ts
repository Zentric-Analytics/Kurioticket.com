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

test("provider comparison is driven by normalized car offers", () => {
  assert.match(card, /<CarDealPicker/);
  assert.match(card, /selectedOfferId=\{offer\.id\}/);
  assert.match(card, /onSelectOffer=\{selectDealOffer\}/);
  assert.match(picker, /getCarDealPickerGroups\(car\)/);
  assert.match(picker, /groups\.slice\(0, 3\)/);
  assert.match(picker, /Math\.max\(0, groups\.length - visibleGroups\.length\)/);
  assert.match(picker, /Compare deals/);
  assert.match(picker, /Show \$\{extraCount\} more car deal providers/);
});

test("provider branding uses mark-only Kurioticket treatment and truthful fallbacks", () => {
  assert.match(picker, /\/brand\/kurioticket-icon-blue\.svg/);
  assert.match(picker, /group\.logoUrl/);
  assert.match(picker, /providerInitial\(group\.providerName\)/);
  assert.match(picker, /aria-label=\{\`Compare deal from \$\{group\.providerName\}\`\}/);
});

test("provider selection portals a desktop popover and mobile bottom sheet without another booking CTA", () => {
  assert.match(picker, /createPortal\(/);
  assert.match(picker, /data-car-deal-picker-desktop-panel/);
  assert.match(picker, /fixed z-\[140\][\s\S]*md:block/);
  assert.match(picker, /fixed inset-0 z-\[130\][\s\S]*md:hidden/);
  assert.match(picker, /data-car-deal-picker-mobile-sheet/);
  assert.match(
    picker,
    /mobile-results-sheet-surface mobile-results-sheet-surface-smooth mx-3 mb-3[\s\S]*w-\[calc\(100%_-_24px\)\][\s\S]*rounded-\[24px\]/,
  );
  assert.doesNotMatch(
    picker,
    /max-h-\[72dvh\] w-full overflow-y-auto rounded-t-\[22px\]/,
  );
  assert.match(picker, /acquireMobileResultsScrollLock\(\)/);
  assert.match(picker, /event\.key !== "Escape"/);
  assert.match(picker, /role="dialog"/);
  assert.match(picker, /Selected · View deal uses this provider/);
  assert.doesNotMatch(picker, />\s*Continue deal\s*</);
  assert.doesNotMatch(picker, />\s*View deal\s*</);
});

test("standalone View deal is the single provider handoff and never fabricates a URL", () => {
  assert.match(card, /const approvedProviderBookingUrl/);
  assert.match(card, /sandboxBookingUrl\(offer\.bookingUrl\)/);
  assert.match(card, /url\.protocol !== "https:" \|\| url\.username \|\| url\.password/);
  assert.equal((card.match(/href=\{providerBookingHref\}/g) ?? []).length, 2);
  assert.equal((card.match(/target="_blank"/g) ?? []).length, 2);
  assert.equal((card.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.match(card, /aria-label="Provider booking link unavailable"/);
  assert.doesNotMatch(card, /href="#"/);
});

test("selected provider controls the visible standalone price", () => {
  assert.match(card, /const \[selectedOfferId, setSelectedOfferId\] = useState/);
  assert.match(card, /car\.offers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)/);
  assert.match(card, /setSelectedOfferId\(nextOffer\.id\)/);
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
