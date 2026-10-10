import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(
  new URL("./AppHeader.tsx", import.meta.url),
  "utf8",
);
const homepageSource = readFileSync(
  new URL("../../app/page.tsx", import.meta.url),
  "utf8",
);

test("homepage alone requests removal of the below-sm header product rail", () => {
  assert.match(homepageSource, /<AppHeader hideMobileSecondaryNavLinks \/>/);

  const suppressedCallSites = Array.from(
    homepageSource.matchAll(/<AppHeader[\s\S]*?>/g),
    (match) => match[0],
  ).filter((callSite) => callSite.includes("hideMobileSecondaryNavLinks"));
  assert.deepEqual(suppressedCallSites, ["<AppHeader hideMobileSecondaryNavLinks />"]);
});

test("header removes the homepage product rail from layout only below sm", () => {
  const mobileRailStart = headerSource.indexOf(
    "{visibleMobilePrimaryNavItems.length > 0 ? (",
  );
  const mobileRail = headerSource.slice(
    mobileRailStart,
    headerSource.indexOf("{mobileMenuOpen ? (", mobileRailStart),
  );

  assert.match(
    mobileRail,
    /hideMobileSecondaryNavLinks && "hidden sm:block"/,
  );
  assert.match(mobileRail, /"md:hidden"/);
  assert.doesNotMatch(mobileRail, /opacity-0|invisible|visibility/);
  assert.match(mobileRail, /visibleMobilePrimaryNavItems\.map/);
});

test("homepage keeps search product tabs and primary header controls", () => {
  assert.match(
    homepageSource,
    /<SearchTabs[\s\S]*?mobileHomepage[\s\S]*?\/>/,
  );
  assert.match(headerSource, /aria-label=\{t\.signIn\}/);
  assert.match(headerSource, /<UserCircle size=\{22\} \/>/);
  assert.match(headerSource, /<Menu size=\{23\} \/>/);
  assert.match(headerSource, /mobileTravelMenuNavItems\.map/);
});

test("mobile account and menu launchers use clean 44px utility targets", () => {
  const mobileControlsStart = headerSource.indexOf(
    '<div className={cn("flex items-center gap-0 md:hidden"',
  );
  const mobileControls = headerSource.slice(
    mobileControlsStart,
    headerSource.indexOf(
      '{languageOpen && typeof document !== "undefined"',
      mobileControlsStart,
    ),
  );

  assert.ok(mobileControlsStart >= 0);
  assert.match(mobileControls, /flex items-center gap-0 md:hidden/);
  assert.match(
    mobileControls,
    /carsResultsMobileInlineSearch && "shrink-0"/,
  );
  assert.equal(mobileControls.match(/h-11 w-11/g)?.length, 3);
  assert.equal(mobileControls.match(/border border-transparent bg-transparent/g)?.length, 3);
  assert.doesNotMatch(mobileControls, /bg-\[#F3F7FA\]|border-\[#DDE7F0\]/);
  assert.match(mobileControls, /<UserCircle size=\{22\} \/>/);
  assert.match(mobileControls, /<Menu size=\{23\} \/>/);
  assert.match(mobileControls, /aria-expanded=\{mobileAccountOpen\}/);
  assert.match(mobileControls, /aria-controls="mobile-account-drawer"/);
  assert.match(mobileControls, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(mobileControls, /aria-controls="mobile-menu-drawer"/);
  assert.match(mobileControls, /session\?\.user\?\.image/);
  assert.match(mobileControls, /accountInitials/);
});

test("desktop product navigation remains independent of the mobile suppression prop", () => {
  const desktopRail = headerSource.slice(
    headerSource.indexOf("{desktopPrimaryNavItems.length > 0 ? ("),
    headerSource.indexOf("{visibleMobilePrimaryNavItems.length > 0 ? ("),
  );

  assert.match(desktopRail, /className="hidden md:block"/);
  assert.match(desktopRail, /desktopPrimaryNavItems\.map/);
  assert.doesNotMatch(desktopRail, /hideMobileSecondaryNavLinks/);
  assert.doesNotMatch(desktopRail, /gap-0 md:hidden/);
});

test("results navbar drawer uses pathname-aware product highlighting", () => {
  assert.match(headerSource, /data-mobile-results-navbar/);
  assert.match(
    headerSource,
    /const active = \(mobileResultsSearch \|\| carsResultsMobileInlineSearch\) && isNavItemActive\(item\.href\)/,
  );
  assert.match(headerSource, /aria-current=\{active \? "page" : undefined\}/);
  assert.doesNotMatch(headerSource, /mobileResultsSearch && item\.href === "\/hotels"/);
  assert.match(headerSource, /href\.startsWith\("\/flights"\)[\s\S]*pathname\.startsWith\("\/flights"\)/);
  assert.match(headerSource, /href\.startsWith\("\/hotels"\)[\s\S]*pathname\.startsWith\("\/hotels"\)/);
});

test("results navbar accepts a custom leading action while preserving the default menu launcher", () => {
  assert.match(headerSource, /mobileResultsLeadingAction\?: ReactNode/);
  assert.match(headerSource, /mobileResultsLeadingAction \?\?/);
  assert.match(headerSource, /kurioticket-icon-blue\.svg/);
  assert.match(headerSource, /aria-controls="mobile-menu-drawer"/);
});

test("results navbar can render filters as part of the mobile header body", () => {
  assert.match(headerSource, /mobileResultsFilters\?: ReactNode/);
  assert.match(headerSource, /!mobileResultsFilters && !hotelResultsDesktopSticky && "border-b border-slate-200"/);
  assert.match(headerSource, /data-mobile-results-filter-navbar className="bg-white sm:hidden"/);
});

test("results header hides its filter rail while mobile drawers are open", () => {
  assert.match(
    headerSource,
    /mobileResultsFilters && !mobileMenuOpen && !mobileAccountOpen \? \(/,
  );
  assert.match(headerSource, /id="mobile-menu-drawer"[\s\S]*aria-modal="true"/);
  assert.match(headerSource, /id="mobile-account-drawer"[\s\S]*aria-modal="true"/);
});


test("mobile Flight Results uses a home arrow while preserving the K logo destination", () => {
  const marker = headerSource.indexOf("data-flight-results-mobile-home");
  assert.notEqual(marker, -1);
  const block = headerSource.slice(Math.max(0, marker - 650), marker + 260);
  assert.match(block, /flightResultsDesktopSticky/);
  assert.match(block, /href="\/"/);
  assert.match(block, /aria-label="Kurioticket home"/);
  assert.match(block, /handleRouteLinkClick\(event, "\/"\)/);
  assert.match(block, /<ArrowLeft size=\{24\} strokeWidth=\{2\.2\}/);
});

test("Cars results keep the sticky inline search with a mobile-only Back control and no compact Filter slot", () => {
  assert.match(headerSource, /mobileResultsSticky\?: boolean/);
  assert.match(headerSource, /mobileResultsSticky = true/);
  assert.match(headerSource, /carsResultsMobileInlineSearch\?: boolean/);
  assert.match(headerSource, /carsResultsMobileInlineSearch = false/);
  assert.match(
    headerSource,
    /\(\(mobileResultsSearch && mobileResultsSticky\) \|\| carsResultsMobileInlineSearch\) &&\s*"max-sm:sticky max-sm:top-0 max-sm:z-\[950\]"/,
  );
  assert.match(headerSource, /data-cars-results-mobile-nav-search/);
  assert.match(
    headerSource,
    /aria-label="Back"[\s\S]*data-cars-results-mobile-back[\s\S]*router\.back\(\)[\s\S]*router\.push\("\/cars"\)/,
  );
  assert.doesNotMatch(headerSource, /data-cars-results-mobile-nav-filter/);
});

