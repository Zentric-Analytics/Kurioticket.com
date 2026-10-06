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
  assert.match(picker, /Selected · View deal uses this provider/);
  assert.doesNotMatch(picker, />\s*Continue deal\s*</);
  assert.doesNotMatch(picker, />\s*View deal\s*</);
});

test("changing Compare deals shows the shared full-page Cars loading state on desktop and mobile", () => {
  assert.match(picker, /const CAR_DEAL_SELECTION_BUSY_MS = 320/);
  assert.match(picker, /const \[dealSelectionPending, setDealSelectionPending\] = useState\(false\)/);
  assert.match(picker, /const providerChanged = group\.key !== selectedGroup\.key/);
  assert.match(
    picker,
    /setDealSelectionPending\(true\)[\s\S]*onSelectOffer\(group\.primaryOffer\)[\s\S]*window\.setTimeout\([\s\S]*setDealSelectionPending\(false\)[\s\S]*CAR_DEAL_SELECTION_BUSY_MS/,
  );
  assert.match(picker, /aria-busy=\{dealSelectionPending\}/);
  assert.match(picker, /data-car-deal-selection-loading/);
  assert.match(picker, /fixed inset-0 z-\[12050\] bg-\[#F5F7FB\]/);
  assert.match(
    picker,
    /<BrandedLoading[\s\S]*title="Updating deal"[\s\S]*messages=\{\["Refreshing price and provider\.\.\."\]\}[\s\S]*variant="fullscreen"[\s\S]*visual="logoPulse"[\s\S]*accessibleProgress/,
  );
  assert.doesNotMatch(
    picker,
    /data-car-deal-selection-loading[^>]*lg:hidden/,
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
  const overflow = picker.slice(
    picker.indexOf("extraCount > 0"),
    picker.indexOf("dealSelectionPending"),
  );
  assert.ok(
    overflow.indexOf("announceDesktopPickerOpen()") <
      overflow.indexOf("setShowAllProviders(true)"),
  );
});

test("provider preview omits internal booking-link handoff copy", () => {
  assert.doesNotMatch(
    picker,
    /Provider handoff will appear when this seller supplies a booking link\./,
  );
  assert.match(picker, /Free cancellation/);
  assert.match(picker, /Taxes and fees included/);
});

test("standalone View deal keeps one visual hierarchy for linked and unavailable offers", () => {
  assert.match(
    card,
    /const mobileStandaloneViewDealClassName =\s*"[^"]*text-\[13px\] font-semibold leading-\[18px\] text-\[#004BB8\]"/,
  );
  assert.match(
    card,
    /const desktopStandaloneViewDealClassName =\s*"[^"]*text-\[14px\] font-bold leading-5 text-\[#004BB8\]"/,
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
  assert.equal((card.match(/disabled:opacity-100/g) ?? []).length, 2);
  assert.doesNotMatch(
    card,
    /aria-label="Provider booking link unavailable"[\s\S]{0,220}text-slate-400/,
  );
});
