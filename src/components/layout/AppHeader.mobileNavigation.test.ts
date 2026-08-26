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
    '<div className="flex items-center gap-1 md:hidden">',
  );
  const mobileControls = headerSource.slice(
    mobileControlsStart,
    headerSource.indexOf(
      '{languageOpen && typeof document !== "undefined"',
      mobileControlsStart,
    ),
  );

  assert.ok(mobileControlsStart >= 0);
  assert.match(mobileControls, /flex items-center gap-1 md:hidden/);
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
  assert.doesNotMatch(desktopRail, /gap-1 md:hidden/);
});
