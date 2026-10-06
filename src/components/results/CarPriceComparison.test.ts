import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./CarResultCard.tsx", import.meta.url), "utf8");
const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
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
  assert.match(picker, /repeatedProvider/);
  assert.match(picker, /Compare \$\{group\.providerName\} deal \$\{index \+ 1\}/);
  assert.match(picker, /Compare deal from \$\{group\.providerName\}/);
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
  assert.doesNotMatch(picker, /Selected · View deal uses this provider/);
  assert.doesNotMatch(picker, /Choose this provider to update View deal/);
  assert.doesNotMatch(picker, />\s*Continue deal\s*</);
  assert.doesNotMatch(picker, />\s*View deal\s*</);
});

test("changing Compare deals updates the selected provider in place and keeps the first popup open", () => {
  assert.doesNotMatch(picker, /BrandedLoading|data-car-deal-selection-loading|Updating deal/);
  assert.doesNotMatch(card, /CarCardSkeleton|dealSelectionPending|CAR_DEAL_SELECTION_MOBILE_BUSY_MS/);
  assert.match(picker, /const providerChanged = group\.key !== selectedGroup\.key/);
  assert.match(
    picker,
    /setOpenProviderKey\(group\.key\)[\s\S]*if \(!providerChanged\) return;[\s\S]*onSelectOffer\(group\.primaryOffer\)/,
  );

  assert.match(results, /const \[selectedDealOfferIds, setSelectedDealOfferIds\]/);
  assert.match(
    results,
    /const selectCompareDealOffer = useCallback\([\s\S]*setSelectedDealOfferIds\([\s\S]*\[carId\]: offerId[\s\S]*\[\],[\s\S]*\);/,
  );
  assert.doesNotMatch(results, /dealTransitionPhase|startDealResultsTransition/);
  assert.match(
    results,
    /if \(providersLoading\)[\s\S]*data-cars-results-page-transition="providers"[\s\S]*<CarsResultsPageTransitionSkeleton/,
  );
  assert.doesNotMatch(
    results,
    /data-cars-results-page-transition=[\s\S]{0,120}"compare-deals"/,
  );
  assert.match(
    results,
    /selectedDealOfferId=\{selectedDealOfferIds\[car\.id\]\}[\s\S]*onDealOfferSelected=\{selectCompareDealOffer\}/,
  );
});

test("desktop Compare deals closes when the page is clicked outside the picker and popover", () => {
  assert.match(picker, /const desktopPanelRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(
    picker,
    /const onPointerDown = \(event: PointerEvent\) => \{[\s\S]*window\.matchMedia\("\(min-width: 768px\)"\)\.matches[\s\S]*anchorRef\.current\?\.contains\(target\)[\s\S]*desktopPanelRef\.current\?\.contains\(target\)[\s\S]*setOpenProviderKey\(null\)[\s\S]*setShowAllProviders\(false\)/,
  );
  assert.match(
    picker,
    /document\.addEventListener\("pointerdown", onPointerDown, true\)/,
  );
  assert.match(
    picker,
    /document\.removeEventListener\("pointerdown", onPointerDown, true\)/,
  );
  assert.match(
    picker,
    /ref=\{desktopPanelRef\}[\s\S]*data-car-deal-picker-desktop-panel/,
  );
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

test("selected provider updates in place and controls View deal", () => {
  assert.match(card, /const \[localSelectedOfferId, setLocalSelectedOfferId\] = useState/);
  assert.match(card, /const selectedOfferId = selectedDealOfferId \?\? localSelectedOfferId/);
  assert.match(card, /car\.offers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)/);
  assert.match(
    card,
    /if \(onDealOfferSelected\) \{[\s\S]*onDealOfferSelected\(car\.id, nextOffer\.id\)[\s\S]*return;[\s\S]*setLocalSelectedOfferId\(nextOffer\.id\)/,
  );
  assert.match(
    results,
    /setSelectedDealOfferIds\([\s\S]*\[carId\]: offerId/,
  );
  assert.doesNotMatch(results, /startDealResultsTransition|dealTransitionPhase/);
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


test("desktop Compare deals enforces one open popup across result cards", () => {
  assert.match(picker, /useId/);
  assert.match(
    picker,
    /const CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT =\s*"kurioticket:car-deal-picker-desktop-open"/,
  );
  assert.match(picker, /const pickerInstanceId = useId\(\)/);
  assert.match(
    picker,
    /const closeWhenAnotherDesktopPickerOpens = \(event: Event\) => \{[\s\S]*window\.matchMedia\("\(min-width: 768px\)"\)\.matches[\s\S]*sourceId === pickerInstanceId[\s\S]*setOpenProviderKey\(null\)[\s\S]*setShowAllProviders\(false\)/,
  );
  assert.match(
    picker,
    /window\.addEventListener\([\s\S]*CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT,[\s\S]*closeWhenAnotherDesktopPickerOpens/,
  );
  assert.match(
    picker,
    /window\.removeEventListener\([\s\S]*CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT,[\s\S]*closeWhenAnotherDesktopPickerOpens/,
  );
  assert.match(
    picker,
    /const announceDesktopPickerOpen = \(\) => \{[\s\S]*window\.matchMedia\("\(min-width: 768px\)"\)\.matches[\s\S]*window\.dispatchEvent\([\s\S]*new CustomEvent<string>\(CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT/,
  );
  const selectGroup = picker.slice(
    picker.indexOf("const selectGroup"),
    picker.indexOf("const closePanel"),
  );
  assert.ok(
    selectGroup.indexOf("announceDesktopPickerOpen()") <
      selectGroup.indexOf("setOpenProviderKey(group.key)"),
  );
  const overflowStart = picker.indexOf("extraCount > 0");
  const overflow = picker.slice(
    overflowStart,
    picker.indexOf("overlayOpen && typeof document", overflowStart),
  );
  assert.ok(
    overflow.indexOf("announceDesktopPickerOpen()") <
      overflow.indexOf("setShowAllProviders(true)"),
  );
});

test("provider preview keeps only the amount and Estimated total without a Price label", () => {
  assert.doesNotMatch(
    picker,
    /Provider handoff will appear when this seller supplies a booking link\./,
  );
  assert.doesNotMatch(picker, /Selected · View deal uses this provider/);
  assert.doesNotMatch(picker, /Choose this provider to update View deal/);
  assert.doesNotMatch(picker, /perDay|>Per day</);
  assert.doesNotMatch(picker, />\s*Price\s*</);
  assert.match(picker, /\{total\}[\s\S]*Estimated total/);
  assert.match(picker, /Free cancellation/);
  assert.match(picker, /Taxes and fees included/);
});

test("standalone View deal keeps one visual hierarchy for linked and unavailable offers", () => {
  assert.match(
    card,
    /const mobileStandaloneViewDealVisualStyle: CSSProperties = \{[\s\S]*fontSize: "12px"[\s\S]*fontWeight: 600[\s\S]*color: "#004BB8"|const mobileStandaloneViewDealVisualStyle: CSSProperties = \{[\s\S]*color: "#004BB8"[\s\S]*fontSize: "12px"[\s\S]*fontWeight: 600/,
  );
  assert.match(
    card,
    /const desktopStandaloneViewDealVisualStyle: CSSProperties = \{[\s\S]*fontSize: "13px"[\s\S]*fontWeight: 700[\s\S]*color: "#004BB8"|const desktopStandaloneViewDealVisualStyle: CSSProperties = \{[\s\S]*color: "#004BB8"[\s\S]*fontSize: "13px"[\s\S]*fontWeight: 700/,
  );
  assert.equal(
    (card.match(/\$\{mobileStandaloneViewDealClassName\}/g) ?? []).length,
    3,
  );
  assert.equal(
    (card.match(/\$\{desktopStandaloneViewDealClassName\}/g) ?? []).length,
    2,
  );
  assert.equal(
    (card.match(/aria-label="Provider booking link unavailable"/g) ?? []).length,
    2,
  );
  assert.match(
    card,
    /const unavailableStandaloneViewDealClassName =\s*"[^"]*appearance-none[^"]*disabled:opacity-100"/,
  );
  assert.match(
    card,
    /const mobileStandaloneViewDealVisualStyle: CSSProperties = \{[\s\S]*color: "#004BB8"[\s\S]*fontSize: "12px"[\s\S]*fontWeight: 600/,
  );
  assert.match(
    card,
    /const desktopStandaloneViewDealVisualStyle: CSSProperties = \{[\s\S]*color: "#004BB8"[\s\S]*fontSize: "13px"[\s\S]*fontWeight: 700/,
  );
  assert.equal(
    (card.match(/style=\{mobileStandaloneViewDealVisualStyle\}/g) ?? []).length,
    3,
  );
  assert.equal(
    (card.match(/style=\{desktopStandaloneViewDealVisualStyle\}/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(
    card,
    /aria-label="Provider booking link unavailable"[\s\S]{0,220}text-slate-400/,
  );
});
